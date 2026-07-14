import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { dockerAvailable, dockerConnectionDescription, dockerRequest, dockerRequestBuffer, decodeDockerStream } from "../lib/docker-client.js";
import { getContainerStats, getTrend, postgresDiagnostics, redactLogs, redisDiagnostics } from "../lib/observability.js";
import { AlertsQuerySchema, ContainerIdParamsSchema, LogsQuerySchema, ObservabilityResponseSchema,
    PostgresDiagnosticsSchema, RedisDiagnosticsSchema, RuntimeListQuerySchema, TrendQuerySchema } from "../schemas/observability.js";

export const observability = new OpenAPIHono();
const response = { 200: { content: { "application/json": { schema: ObservabilityResponseSchema } }, description: "Observability data" } } as const;

// Docker diagnostics must never inherit the gateway's unauthenticated development mode.
observability.use("*", async (c, next) => {
    if (!process.env.API_SECRET) {
        return c.json({ error: "Observability requires API_SECRET to be configured" }, 503);
    }
    await next();
});

observability.openapi(createRoute({ method:"get", path:"/availability", tags:["Observability"], security:[{Bearer:[]}], responses:response }), async c =>
    c.json({ available: await dockerAvailable(), connection: dockerConnectionDescription() }, 200));

observability.openapi(createRoute({ method:"get", path:"/host", tags:["Observability"], security:[{Bearer:[]}], responses:response }), async c => {
    const info = await dockerRequest<any>("/info");
    return c.json({ name:info.Name, serverVersion:info.ServerVersion, operatingSystem:info.OperatingSystem,
        architecture:info.Architecture, ncpu:info.NCPU, memoryTotalBytes:info.MemTotal, containers:info.Containers,
        containersRunning:info.ContainersRunning, containersPaused:info.ContainersPaused, containersStopped:info.ContainersStopped,
        images:info.Images, dockerRootDir:info.DockerRootDir, driver:info.Driver, loggingDriver:info.LoggingDriver,
        swapLimit:info.SwapLimit, memoryLimit:info.MemoryLimit, cpuCfsQuota:info.CpuCfsQuota }, 200);
});

observability.openapi(createRoute({ method:"get", path:"/containers", tags:["Observability"], security:[{Bearer:[]}],
    request:{query:RuntimeListQuerySchema}, responses:response }), async c => {
    const query=c.req.valid("query"); const items=await dockerRequest<any[]>(`/containers/json?all=${query.all?1:0}`);
    const normalized=items.map(item=>({ id:item.Id, names:item.Names, image:item.Image, imageId:item.ImageID,
        state:item.State, status:item.Status, created:item.Created, labels:item.Labels, ports:item.Ports,
        project:item.Labels?.["com.docker.compose.project"] || item.Labels?.["com.docker.stack.namespace"],
        service:item.Labels?.["com.docker.compose.service"] || item.Labels?.["com.docker.swarm.service.name"] }));
    const name=(query.name||"").toLowerCase(); return c.json({containers:name?normalized.filter(x=>JSON.stringify(x.names).toLowerCase().includes(name)||String(x.service||"").toLowerCase().includes(name)):normalized},200);
});

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/stats", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema}, responses:response }), async c => c.json(await getContainerStats(c.req.valid("param").containerId),200));

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/processes", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema}, responses:response }), async c => {
    const id=c.req.valid("param").containerId;
    const top=await dockerRequest<any>(`/containers/${encodeURIComponent(id)}/top?ps_args=${encodeURIComponent("-eo pid,ppid,%cpu,%mem,rss,vsz,etime,comm,args --sort=-rss")}`);
    return c.json({titles:top.Titles||[],processes:(top.Processes||[]).slice(0,100)},200);
});

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/health", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema}, responses:response }), async c => {
    const inspect=await dockerRequest<any>(`/containers/${encodeURIComponent(c.req.valid("param").containerId)}/json`);
    return c.json({id:inspect.Id,name:inspect.Name,state:inspect.State?.Status,running:inspect.State?.Running,
        startedAt:inspect.State?.StartedAt,finishedAt:inspect.State?.FinishedAt,restartCount:inspect.RestartCount,
        oomKilled:inspect.State?.OOMKilled,error:inspect.State?.Error,health:inspect.State?.Health||null,
        memoryLimitBytes:inspect.HostConfig?.Memory||0,shmSizeBytes:inspect.HostConfig?.ShmSize||0,pidsLimit:inspect.HostConfig?.PidsLimit||0},200);
});

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/logs", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema,query:LogsQuerySchema}, responses:response }), async c => {
    const {containerId}=c.req.valid("param"); const q=c.req.valid("query");
    const since=Math.max(0,Math.floor(Date.now()/1000)-q.sinceSeconds);
    const raw=await dockerRequestBuffer(`/containers/${encodeURIComponent(containerId)}/logs?stdout=1&stderr=1&timestamps=1&tail=${q.tail}&since=${since}`);
    let lines=redactLogs(decodeDockerStream(raw)).split(/\r?\n/);
    if(q.severity==="error") lines=lines.filter(x=>/error|fatal|exception|traceback|oom|killed/i.test(x));
    if(q.severity==="warning") lines=lines.filter(x=>/warn|error|fatal|exception|oom/i.test(x));
    if(q.severity==="info") lines=lines.filter(x=>/info|warn|error|fatal/i.test(x));
    return c.json({containerId,lineCount:lines.length,lines:lines.slice(-q.tail)},200);
});

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/trend", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema,query:TrendQuerySchema}, responses:response }), async c => {
    const {containerId}=c.req.valid("param"); await getContainerStats(containerId); return c.json(getTrend(containerId,c.req.valid("query").minutes),200);
});

observability.openapi(createRoute({ method:"get", path:"/containers/{containerId}/diagnose-memory", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema,query:TrendQuerySchema}, responses:response }), async c => {
    const {containerId}=c.req.valid("param"); const q=c.req.valid("query"); const stats=await getContainerStats(containerId); const trend=getTrend(containerId,q.minutes);
    const findings:string[]=[]; const cacheRatio=stats.memoryBytes?stats.cacheBytes/stats.memoryBytes:0;
    if(cacheRatio>.5) findings.push("Most charged container memory is reclaimable file cache rather than process working set.");
    if(trend.pointCount>=3&&trend.growthBytesPerHour>100*1024*1024) findings.push("Working-set memory is rising continuously and may indicate retained application state or a leak.");
    if(stats.memoryLimitBytes&&stats.workingSetBytes/stats.memoryLimitBytes>.85) findings.push("Working set exceeds 85% of the configured container memory limit.");
    if(stats.pids>100) findings.push("High process count may indicate worker or child-process accumulation.");
    if(!findings.length) findings.push("No strong memory-bloat signal is visible in the collected window.");
    return c.json({containerId,stats,trend,cacheRatio,findings},200);
});

observability.openapi(createRoute({ method:"get", path:"/alerts", tags:["Observability"], security:[{Bearer:[]}],
    request:{query:AlertsQuerySchema}, responses:response }), async c => {
    const q=c.req.valid("query");
    const containers=await dockerRequest<any[]>("/containers/json?all=0");
    const alerts:any[]=[];
    const inspect = async (item:any) => {
        try {
            const stats=await getContainerStats(item.Id);
            const trend=getTrend(item.Id,q.minutes);
            const memoryPercent=stats.memoryLimitBytes ? stats.workingSetBytes/stats.memoryLimitBytes*100 : 0;
            if(stats.memoryLimitBytes&&memoryPercent>=q.memoryPercent) alerts.push({severity:"critical",type:"memory_limit",containerId:item.Id,name:item.Names?.[0],memoryPercent});
            if(trend.pointCount>=3&&trend.growthBytesPerHour>=q.growthMbPerHour*1024*1024) alerts.push({severity:"warning",type:"memory_growth",containerId:item.Id,name:item.Names?.[0],growthBytesPerHour:trend.growthBytesPerHour,windowMinutes:q.minutes});
            if(stats.pids>100) alerts.push({severity:"warning",type:"high_process_count",containerId:item.Id,name:item.Names?.[0],pids:stats.pids});
        } catch(error) {
            alerts.push({severity:"warning",type:"stats_unavailable",containerId:item.Id,name:item.Names?.[0],message:error instanceof Error?error.message:"Unknown error"});
        }
    };
    const bounded=containers.slice(0,100);
    for(let index=0;index<bounded.length;index+=4) {
        await Promise.all(bounded.slice(index,index+4).map(inspect));
    }
    return c.json({generatedAt:new Date().toISOString(),thresholds:q,alertCount:alerts.length,alerts},200);
});

observability.openapi(createRoute({ method:"post", path:"/containers/{containerId}/postgres", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema,body:{content:{"application/json":{schema:PostgresDiagnosticsSchema}},required:true}},responses:response}), async c =>
    c.json(await postgresDiagnostics(c.req.valid("param").containerId,c.req.valid("json").database,c.req.valid("json").user),200));

observability.openapi(createRoute({ method:"post", path:"/containers/{containerId}/redis", tags:["Observability"], security:[{Bearer:[]}],
    request:{params:ContainerIdParamsSchema,body:{content:{"application/json":{schema:RedisDiagnosticsSchema}},required:true}},responses:response}), async c =>
    c.json(await redisDiagnostics(c.req.valid("param").containerId,c.req.valid("json").queueNames),200));
