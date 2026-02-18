/**
 * Auth routes — token status check.
 *
 * Authentication is now fully internal:
 *  - Gateway logs into Easypanel on startup using EASYPANEL_EMAIL + EASYPANEL_PASSWORD
 *  - External callers use API_SECRET (set in env) as their Bearer token
 *
 * This route exists only for diagnostics.
 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getEasypanelToken } from "../lib/token-manager.js";

const auth = new OpenAPIHono();

// ── GET /auth/status ────────────────────────────────────────────

auth.openapi(
    createRoute({
        method: "get",
        path: "/status",
        tags: ["Auth"],
        summary: "Check Easypanel connection status",
        description:
            "Verifies the gateway can authenticate with Easypanel. " +
            "Returns whether the internal session token is valid.",
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: z
                            .object({
                                connected: z.boolean().openapi({ example: true }),
                                message: z.string().openapi({ example: "Authenticated with Easypanel" }),
                            })
                            .openapi("AuthStatus"),
                    },
                },
                description: "Connection status",
            },
        },
    }),
    async (c) => {
        try {
            await getEasypanelToken();
            return c.json({ connected: true, message: "Authenticated with Easypanel" }, 200);
        } catch (err: any) {
            return c.json({ connected: false, message: err.message || "Not connected" }, 200);
        }
    }
);

export default auth;
