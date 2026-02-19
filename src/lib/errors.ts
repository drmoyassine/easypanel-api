import type { Context } from "hono";
import { TrpcCallError } from "./trpc-client.js";

/**
 * Global error handler for the Hono app.
 * Maps tRPC errors, Zod validation errors, and unknown errors
 * into a consistent JSON format.
 */
export function handleError(err: Error, c: Context) {
    console.error(`[easypanel-api] Error: ${err.message}`, err);

    // tRPC call failure (upstream Easypanel returned an error)
    if (err instanceof TrpcCallError) {
        let upstream: unknown = undefined;
        if (err.details) {
            try { upstream = JSON.parse(err.details); }
            catch { upstream = err.details; } // truncated JSON — return raw string
        }
        return c.json(
            { error: err.message, procedure: err.procedure, upstream },
            err.status as 400
        );
    }

    // Zod validation error (from @hono/zod-openapi)
    if (err.name === "ZodError") {
        return c.json(
            {
                error: "Validation failed",
                details: (err as any).issues ?? (err as any).errors,
            },
            400
        );
    }

    // Fallback
    return c.json(
        { error: err.message || "Internal server error" },
        500
    );
}
