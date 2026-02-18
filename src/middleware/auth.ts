import { createMiddleware } from "hono/factory";

/**
 * Auth middleware — validates API_SECRET from the Authorization header.
 *
 * External callers authenticate with:
 *   Authorization: Bearer <API_SECRET>
 *
 * The gateway manages its own Easypanel session internally
 * (see token-manager.ts). Callers never touch Easypanel credentials.
 */
export const authMiddleware = createMiddleware(async (c, next) => {
    const apiSecret = process.env.API_SECRET;

    if (!apiSecret) {
        // No API_SECRET set → gateway is unprotected (dev mode)
        await next();
        return;
    }

    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json({ error: "Missing Authorization: Bearer <API_SECRET>" }, 401);
    }

    const token = authHeader.slice(7).trim();

    if (token !== apiSecret) {
        return c.json({ error: "Invalid API secret" }, 401);
    }

    await next();
});
