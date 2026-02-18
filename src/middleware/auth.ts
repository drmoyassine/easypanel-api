import { createMiddleware } from "hono/factory";
import { callTrpc } from "../lib/trpc-client.js";

/**
 * Auth middleware — extracts Bearer token, validates it against
 * Easypanel's auth endpoint, and stores the token on context.
 *
 * Usage in routes: `const token = c.get("token");`
 */
export const authMiddleware = createMiddleware<{
    Variables: { token: string };
}>(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return c.json({ error: "Empty token" }, 401);
    }

    try {
        // Validate the token by calling Easypanel's auth check
        await callTrpc("auth.getUser", {}, token);
    } catch {
        return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("token", token);
    await next();
});
