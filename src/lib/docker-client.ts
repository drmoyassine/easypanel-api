import http from "node:http";

const SOCKET_PATH = process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";
const API_URL = process.env.DOCKER_API_URL?.replace(/\/$/, "");
const MAX_BODY_BYTES = 8 * 1024 * 1024;

export type DockerRequestOptions = {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
};

function requestTarget(path: string): http.RequestOptions {
    if (!API_URL) return { socketPath: SOCKET_PATH, path };
    const target = new URL(API_URL);
    if (target.protocol !== "http:") throw new Error("DOCKER_API_URL must use http:// on a trusted private network");
    return {
        hostname: target.hostname,
        port: target.port || 2375,
        path: `${target.pathname.replace(/\/$/, "")}${path}`,
    };
}

export function dockerConnectionDescription(): { mode: string; target: string } {
    return API_URL
        ? { mode: "restricted-proxy", target: API_URL }
        : { mode: "unix-socket", target: SOCKET_PATH };
}

export async function dockerRequest<T = any>(path: string, options: DockerRequestOptions = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const body = options.body === undefined ? undefined : JSON.stringify(options.body);
        const request = http.request({
            ...requestTarget(path),
            method: options.method || "GET",
            timeout: Math.min(Math.max(options.timeoutMs || 15_000, 1_000), 120_000),
            headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : undefined,
        }, (response) => {
            const chunks: Buffer[] = [];
            let received = 0;
            response.on("data", (chunk: Buffer) => {
                received += chunk.length;
                if (received > MAX_BODY_BYTES) {
                    request.destroy(new Error("Docker response exceeded the 8 MB safety limit"));
                    return;
                }
                chunks.push(chunk);
            });
            response.on("end", () => {
                const raw = Buffer.concat(chunks).toString("utf8");
                if ((response.statusCode || 500) >= 400) {
                    reject(new Error(`Docker API ${response.statusCode}: ${raw.slice(0, 500)}`));
                    return;
                }
                if (!raw) return resolve({} as T);
                try { resolve(JSON.parse(raw) as T); }
                catch { resolve(raw as T); }
            });
        });
        request.on("timeout", () => request.destroy(new Error("Docker API request timed out")));
        request.on("error", reject);
        if (body) request.write(body);
        request.end();
    });
}

export async function dockerRequestBuffer(path: string, options: DockerRequestOptions = {}): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const body = options.body === undefined ? undefined : JSON.stringify(options.body);
        const request = http.request({ ...requestTarget(path), method: options.method || "GET",
            timeout: Math.min(Math.max(options.timeoutMs || 15_000, 1_000), 120_000),
            headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : undefined }, response => {
            const chunks: Buffer[] = []; let received = 0;
            response.on("data", (chunk: Buffer) => { received += chunk.length; if (received > MAX_BODY_BYTES) request.destroy(new Error("Docker response exceeded the 8 MB safety limit")); else chunks.push(chunk); });
            response.on("end", () => {
                const result = Buffer.concat(chunks);
                if ((response.statusCode || 500) >= 400) reject(new Error(`Docker API ${response.statusCode}: ${result.toString("utf8", 0, 500)}`));
                else resolve(result);
            });
        });
        request.on("timeout", () => request.destroy(new Error("Docker API request timed out")));
        request.on("error", reject); if (body) request.write(body); request.end();
    });
}

export function decodeDockerStream(buffer: Buffer): string {
    const output: Buffer[] = []; let offset = 0;
    while (offset + 8 <= buffer.length) {
        const size = buffer.readUInt32BE(offset + 4);
        if (size < 0 || offset + 8 + size > buffer.length) break;
        output.push(buffer.subarray(offset + 8, offset + 8 + size)); offset += 8 + size;
    }
    return (output.length ? Buffer.concat(output) : buffer).toString("utf8").trim();
}

export function dockerAvailable(): Promise<boolean> {
    return dockerRequest("/_ping", { timeoutMs: 2_000 }).then(() => true).catch(() => false);
}

export async function dockerExec(containerId: string, command: string[], timeoutMs = 30_000): Promise<string> {
    const created = await dockerRequest<{ Id: string }>(`/containers/${encodeURIComponent(containerId)}/exec`, {
        method: "POST",
        body: { AttachStdout: true, AttachStderr: true, Tty: false, Cmd: command },
        timeoutMs,
    });
    if (!created.Id) throw new Error("Docker did not return an exec ID");
    const output = await dockerRequestBuffer(`/exec/${encodeURIComponent(created.Id)}/start`, {
        method: "POST", body: { Detach: false, Tty: false }, timeoutMs,
    });
    return decodeDockerStream(output);
}
