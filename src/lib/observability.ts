import { dockerExec, dockerRequest } from "./docker-client.js";

type Point = { timestamp: string; memoryBytes: number; workingSetBytes: number; cpuPercent: number };
const trends = new Map<string, Point[]>();
const MAX_POINTS = Math.max(60, Math.min(8640, Number(process.env.OBSERVABILITY_MAX_POINTS || 1440)));

function cpuPercent(stats: any): number {
    const cpuDelta = Number(stats?.cpu_stats?.cpu_usage?.total_usage || 0) - Number(stats?.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = Number(stats?.cpu_stats?.system_cpu_usage || 0) - Number(stats?.precpu_stats?.system_cpu_usage || 0);
    const cpus = Number(stats?.cpu_stats?.online_cpus || stats?.cpu_stats?.cpu_usage?.percpu_usage?.length || 1);
    return systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cpus * 100 : 0;
}

export function normalizeStats(stats: any) {
    const memoryBytes = Number(stats?.memory_stats?.usage || 0);
    const cacheBytes = Number(stats?.memory_stats?.stats?.inactive_file || stats?.memory_stats?.stats?.cache || 0);
    const workingSetBytes = Math.max(0, memoryBytes - cacheBytes);
    return {
        timestamp: stats?.read || new Date().toISOString(), memoryBytes, cacheBytes, workingSetBytes,
        memoryLimitBytes: Number(stats?.memory_stats?.limit || 0), cpuPercent: cpuPercent(stats),
        pids: Number(stats?.pids_stats?.current || 0),
        networkRxBytes: Object.values(stats?.networks || {}).reduce((n: number, v: any) => n + Number(v?.rx_bytes || 0), 0),
        networkTxBytes: Object.values(stats?.networks || {}).reduce((n: number, v: any) => n + Number(v?.tx_bytes || 0), 0),
        blockReadBytes: (stats?.blkio_stats?.io_service_bytes_recursive || []).filter((v: any) => v.op === "read").reduce((n: number, v: any) => n + Number(v.value || 0), 0),
        blockWriteBytes: (stats?.blkio_stats?.io_service_bytes_recursive || []).filter((v: any) => v.op === "write").reduce((n: number, v: any) => n + Number(v.value || 0), 0),
    };
}

export async function getContainerStats(containerId: string) {
    const raw = await dockerRequest(`/containers/${encodeURIComponent(containerId)}/stats?stream=false`);
    const normalized = normalizeStats(raw);
    const points = trends.get(containerId) || [];
    points.push({ timestamp: normalized.timestamp, memoryBytes: normalized.memoryBytes,
        workingSetBytes: normalized.workingSetBytes, cpuPercent: normalized.cpuPercent });
    trends.set(containerId, points.slice(-MAX_POINTS));
    return normalized;
}

let samplerStarted = false;
export function startObservabilitySampler() {
    if (samplerStarted || String(process.env.OBSERVABILITY_ENABLED || "true").toLowerCase() === "false") return;
    samplerStarted = true;
    const seconds = Math.max(30, Math.min(3600, Number(process.env.OBSERVABILITY_SAMPLE_INTERVAL_SECONDS || 60)));
    const sample = async () => {
        try {
            const containers = await dockerRequest<any[]>("/containers/json?all=false");
            for (let i = 0; i < containers.length; i += 4) {
                await Promise.all(containers.slice(i, i + 4).map(item => getContainerStats(item.Id).catch(() => null)));
            }
        } catch { /* Docker access is optional; health endpoint reports availability. */ }
    };
    setTimeout(sample, 10_000).unref();
    setInterval(sample, seconds * 1000).unref();
}

export function getTrend(containerId: string, minutes: number) {
    const cutoff = Date.now() - minutes * 60_000;
    const points = (trends.get(containerId) || []).filter(p => Date.parse(p.timestamp) >= cutoff);
    const first = points[0]; const last = points[points.length - 1];
    const elapsedMinutes = first && last ? Math.max((Date.parse(last.timestamp) - Date.parse(first.timestamp)) / 60_000, 1 / 60) : 0;
    const growthBytesPerMinute = first && last ? (last.workingSetBytes - first.workingSetBytes) / elapsedMinutes : 0;
    return { points, pointCount: points.length, growthBytesPerMinute,
        growthBytesPerHour: growthBytesPerMinute * 60,
        minWorkingSetBytes: points.length ? Math.min(...points.map(p => p.workingSetBytes)) : null,
        maxWorkingSetBytes: points.length ? Math.max(...points.map(p => p.workingSetBytes)) : null };
}

export function redactLogs(value: string): string {
    return value
        .replace(/(authorization|api[_-]?key|token|password|secret)(["'=:\s]+)([^\s,"'}]+)/gi, "$1$2[REDACTED]")
        .replace(/\b(mem_[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{16,})\b/g, "[REDACTED]");
}

export async function postgresDiagnostics(containerId: string, database: string, user: string) {
    const sql = `SELECT json_build_object(
      'database_size_bytes',pg_database_size(current_database()),
      'connections',(SELECT count(*) FROM pg_stat_activity),
      'active_queries',(SELECT count(*) FROM pg_stat_activity WHERE state='active'),
      'longest_active_seconds',COALESCE((SELECT max(EXTRACT(EPOCH FROM now()-query_start)) FROM pg_stat_activity WHERE state='active' AND pid<>pg_backend_pid()),0),
      'tables',(SELECT COALESCE(json_agg(t),'[]'::json) FROM (SELECT relname,n_live_tup,n_dead_tup,last_autovacuum,last_autoanalyze,pg_total_relation_size(relid) total_bytes FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20)t),
      'cache_hit_ratio',(SELECT CASE WHEN sum(blks_hit)+sum(blks_read)=0 THEN 1 ELSE sum(blks_hit)::float/(sum(blks_hit)+sum(blks_read)) END FROM pg_stat_database)
    );`;
    const output = await dockerExec(containerId, ["psql", "-U", user, "-d", database, "-At", "-c", sql], 30_000);
    try { return JSON.parse(output.slice(output.indexOf("{"))); }
    catch { return { raw: output.slice(0, 20_000), parseWarning: "PostgreSQL output was not JSON" }; }
}

export async function redisDiagnostics(containerId: string, queueNames: string[]) {
    const info = await dockerExec(containerId, ["redis-cli", "--raw", "INFO", "memory"], 15_000);
    const keyspace = await dockerExec(containerId, ["redis-cli", "--raw", "INFO", "keyspace"], 15_000);
    const parseInfo = (raw: string) => Object.fromEntries(raw.split(/\r?\n/).filter(line => line && !line.startsWith("#") && line.includes(":"))
        .map(line => { const i=line.indexOf(":"); return [line.slice(0,i), line.slice(i+1)]; }));
    const queues: Record<string, any> = {};
    for (const queue of queueNames) {
        queues[queue] = {};
        for (const state of ["wait", "active", "delayed", "completed", "failed", "waiting-children"]) {
            const key = `bull:${queue}:${state}`;
            const type = await dockerExec(containerId, ["redis-cli", "--raw", "TYPE", key], 10_000);
            const command = type.trim() === "zset" ? "ZCARD" : type.trim() === "list" ? "LLEN" : "EXISTS";
            const count = await dockerExec(containerId, ["redis-cli", "--raw", command, key], 10_000);
            queues[queue][state] = Number(count.trim() || 0);
        }
    }
    return { memory: parseInfo(info), keyspace: parseInfo(keyspace), queues };
}
