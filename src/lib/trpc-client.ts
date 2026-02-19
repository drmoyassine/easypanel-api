/**
 * Raw tRPC HTTP client for Easypanel.
 *
 * Easypanel exposes its internal API as tRPC procedures on port 3000.
 * We call them directly via POST with a JSON body — no SDK needed.
 *
 * The token is auto-managed by token-manager.ts. Route handlers
 * simply call `callTrpc("procedure", input)` without thinking about auth.
 */

import { getEasypanelToken, invalidateToken } from "./token-manager.js";

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

export interface TrpcRawResult<T = unknown> {
    data: T;
    headers: Headers;
}

/**
 * Internal fetch wrapper.
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
        console.error(`[trpc] ${procedure} failed (${res.status}):`, JSON.stringify(body));
        throw new TrpcCallError(message, status, procedure);
    }

    return { body, res };
}

/**
 * Call an Easypanel tRPC procedure.
 * Token is fetched automatically from token-manager.
 * On 401, the token is refreshed and the call retried once.
 *
 * @param procedure - Dot-separated procedure name, e.g. "projects.listProjects"
 * @param input     - JSON-serializable input payload
 */
export async function callTrpc<T = unknown>(
    procedure: string,
    input: unknown = {}
): Promise<T> {
    const token = await getEasypanelToken();

    try {
        const { body } = await doTrpcFetch(procedure, input, token);
        return (body as unknown as TrpcResult<T>).result.data.json;
    } catch (err) {
        // If 401 (expired session), refresh token and retry once
        if (err instanceof TrpcCallError && err.status === 401) {
            invalidateToken();
            const freshToken = await getEasypanelToken();
            const { body } = await doTrpcFetch(procedure, input, freshToken);
            return (body as unknown as TrpcResult<T>).result.data.json;
        }
        throw err;
    }
}

/**
 * Call a tRPC procedure WITHOUT auto-token (used by token-manager for login).
 * This variant DOES NOT use token-manager to avoid circular dependencies.
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
