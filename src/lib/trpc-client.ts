/**
 * Raw tRPC HTTP client for Easypanel.
 *
 * Easypanel exposes its internal API as tRPC procedures on port 3000.
 * We call them directly via HTTP — no SDK needed.
 *
 * tRPC convention:
 *   - Queries  → GET  with ?input=... (URL-encoded JSON)
 *   - Mutations → POST with JSON body
 *
 * The token is auto-managed by token-manager.ts. Route handlers
 * simply call `callTrpc("procedure", input)` or `callTrpcQuery("procedure", input)`.
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
 * Internal fetch wrapper — supports both GET (query) and POST (mutation).
 */
async function doTrpcFetch(
    procedure: string,
    input: unknown,
    token?: string,
    method: "GET" | "POST" = "POST"
): Promise<{ body: Record<string, unknown>; res: Response }> {
    const headers: Record<string, string> = {};
    if (token) {
        headers.Cookie = `ez-token=${token}`;
        headers.Authorization = `Bearer ${token}`;
    }

    let url: string;
    let fetchOptions: RequestInit;

    if (method === "GET") {
        // Queries: input as URL query param
        const inputStr = JSON.stringify({ json: input });
        const encoded = encodeURIComponent(inputStr);
        url = `${EASYPANEL_BASE_URL}/api/trpc/${procedure}?input=${encoded}`;
        fetchOptions = { method: "GET", headers };
    } else {
        // Mutations: input as POST body
        url = `${EASYPANEL_BASE_URL}/api/trpc/${procedure}`;
        headers["Content-Type"] = "application/json";
        fetchOptions = {
            method: "POST",
            headers,
            body: JSON.stringify({ json: input }),
        };
    }

    console.log(`[trpc] → ${method} ${procedure}`);

    const res = await fetch(url, fetchOptions);
    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok || "error" in body) {
        const trpcErr = body as unknown as TrpcError;
        const message =
            trpcErr.error?.message || `tRPC call failed: ${procedure}`;
        const status = trpcErr.error?.data?.httpStatus || res.status || 500;
        const rawBody = JSON.stringify(body).slice(0, 500);
        console.error(
            `[trpc] ✗ ${procedure} failed (HTTP ${res.status}):`,
            rawBody
        );
        throw new TrpcCallError(message, status, procedure, rawBody);
    }

    console.log(`[trpc] ✓ ${procedure} OK`);
    return { body, res };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Call a tRPC MUTATION (POST). Auto-manages token, retries on 401.
 */
export async function callTrpc<T = unknown>(
    procedure: string,
    input: unknown = {}
): Promise<T> {
    return callInternal<T>(procedure, input, "POST");
}

/**
 * Call a tRPC QUERY (GET). Auto-manages token, retries on 401.
 */
export async function callTrpcQuery<T = unknown>(
    procedure: string,
    input: unknown = {}
): Promise<T> {
    return callInternal<T>(procedure, input, "GET");
}

/**
 * Call a tRPC procedure WITHOUT auto-token (used by token-manager for login).
 */
export async function callTrpcRaw<T = unknown>(
    procedure: string,
    input: unknown = {},
    token?: string
): Promise<TrpcRawResult<T>> {
    const { body, res } = await doTrpcFetch(procedure, input, token, "POST");
    const data = (body as unknown as TrpcResult<T>).result.data.json;
    return { data, headers: res.headers };
}

// ── Internal ─────────────────────────────────────────────────

async function callInternal<T>(
    procedure: string,
    input: unknown,
    method: "GET" | "POST"
): Promise<T> {
    const token = await getEasypanelToken();

    try {
        const { body } = await doTrpcFetch(procedure, input, token, method);
        return (body as unknown as TrpcResult<T>).result.data.json;
    } catch (err) {
        if (err instanceof TrpcCallError && err.status === 401) {
            invalidateToken();
            const freshToken = await getEasypanelToken();
            const { body } = await doTrpcFetch(procedure, input, freshToken, method);
            return (body as unknown as TrpcResult<T>).result.data.json;
        }
        throw err;
    }
}

/**
 * Typed error thrown when a tRPC call fails.
 */
export class TrpcCallError extends Error {
    public readonly status: number;
    public readonly procedure: string;
    public readonly details?: string;

    constructor(message: string, status: number, procedure: string, details?: string) {
        super(message);
        this.name = "TrpcCallError";
        this.status = status;
        this.procedure = procedure;
        this.details = details;
    }
}
