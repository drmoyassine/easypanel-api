/**
 * Raw tRPC HTTP client for Easypanel.
 *
 * Easypanel exposes its internal API as tRPC procedures on port 3000.
 * We call them directly via POST with a JSON body — no SDK needed.
 */

const EASYPANEL_BASE_URL =
    process.env.EASYPANEL_URL || "http://localhost:3000";

export interface TrpcResult<T = unknown> {
    result: {
        data: {
            json: T;
        };
    };
}

export interface TrpcError {
    error: {
        message: string;
        code: number;
        data: {
            code: string;
            httpStatus: number;
            path: string;
        };
    };
}

/** Result of callTrpcRaw — includes both data and response headers. */
export interface TrpcRawResult<T = unknown> {
    data: T;
    headers: Headers;
}

/**
 * Internal fetch wrapper shared by both callTrpc and callTrpcRaw.
 */
async function doTrpcFetch(
    procedure: string,
    input: unknown,
    token?: string
): Promise<{ body: Record<string, unknown>; res: Response }> {
    const url = `${EASYPANEL_BASE_URL}/api/trpc/${procedure}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers.Cookie = `ez-token=${token}`;
    }

    const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ json: input }),
    });

    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok || "error" in body) {
        const trpcErr = body as unknown as TrpcError;
        const message =
            trpcErr.error?.message || `tRPC call failed: ${procedure}`;
        const status = trpcErr.error?.data?.httpStatus || res.status || 500;
        throw new TrpcCallError(message, status, procedure);
    }

    return { body, res };
}

/**
 * Call an Easypanel tRPC procedure and return parsed data.
 *
 * @param procedure - Dot-separated procedure name, e.g. "projects.listProjects"
 * @param input     - JSON-serializable input payload
 * @param token     - ez-token (forwarded as cookie)
 */
export async function callTrpc<T = unknown>(
    procedure: string,
    input: unknown = {},
    token: string
): Promise<T> {
    const { body } = await doTrpcFetch(procedure, input, token);
    return (body as unknown as TrpcResult<T>).result.data.json;
}

/**
 * Call a tRPC procedure and return BOTH data + response headers.
 * Used for auth.login where we need to capture the Set-Cookie header.
 *
 * @param procedure - Procedure name
 * @param input     - Input payload
 * @param token     - Optional ez-token (omit for unauthenticated calls like login)
 */
export async function callTrpcRaw<T = unknown>(
    procedure: string,
    input: unknown = {},
    token?: string
): Promise<TrpcRawResult<T>> {
    const { body, res } = await doTrpcFetch(procedure, input, token);
    const data = (body as unknown as TrpcResult<T>).result.data.json;
    return { data, headers: res.headers };
}

/**
 * Typed error thrown when a tRPC call fails.
 */
export class TrpcCallError extends Error {
    public readonly status: number;
    public readonly procedure: string;

    constructor(message: string, status: number, procedure: string) {
        super(message);
        this.name = "TrpcCallError";
        this.status = status;
        this.procedure = procedure;
    }
}
