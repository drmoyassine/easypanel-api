/**
 * Auth routes — login, token generation, and session check.
 *
 * These are PUBLIC (no Bearer required) because the user
 * doesn't have a token yet — they need to log in first.
 *
 * Flow:
 *   1. POST /auth/login  → email + password → returns ez-token
 *   2. Use token as "Bearer <token>" for all /api/v1/* endpoints
 *   3. Optionally POST /auth/api-token to generate a long-lived token
 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { callTrpc, callTrpcRaw } from "../lib/trpc-client.js";
import { ErrorSchema } from "../schemas/common.js";

const auth = new OpenAPIHono();

// ── Schemas ─────────────────────────────────────────────────────

const LoginSchema = z
    .object({
        email: z.string().email().openapi({ example: "admin@example.com" }),
        password: z.string().min(1).openapi({ example: "your-password" }),
    })
    .openapi("LoginRequest");

const LoginResponseSchema = z
    .object({
        token: z.string().openapi({
            example: "eyJhbGciOiJIUzI1NiIs...",
            description: "ez-token — use as Bearer token in Authorization header",
        }),
        message: z.string().openapi({ example: "Login successful" }),
    })
    .openapi("LoginResponse");

const TokenResponseSchema = z
    .object({
        token: z.string().openapi({
            example: "ep_abc123...",
            description: "Long-lived API token",
        }),
    })
    .openapi("TokenResponse");

// ── POST /auth/login ────────────────────────────────────────────

auth.openapi(
    createRoute({
        method: "post",
        path: "/login",
        tags: ["Auth"],
        summary: "Login with email & password to get an ez-token",
        description:
            "Calls Easypanel's `auth.login` tRPC procedure. " +
            "Returns the `ez-token` from the Set-Cookie header. " +
            "Use this token as `Authorization: Bearer <token>` for all other endpoints.",
        request: {
            body: { content: { "application/json": { schema: LoginSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: LoginResponseSchema } }, description: "Login successful" },
            401: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid credentials" },
        },
    }),
    async (c) => {
        const { email, password } = c.req.valid("json");

        try {
            const { headers } = await callTrpcRaw("auth.login", { email, password });

            // Extract ez-token from Set-Cookie header
            const setCookie = headers.get("set-cookie") || "";
            let tokenMatch = setCookie.match(/ez-token=([^;]+)/);

            // Some environments return multiple Set-Cookie headers
            if (!tokenMatch) {
                const allCookies = headers.getSetCookie?.() || [];
                for (const cookie of allCookies) {
                    const match = cookie.match(/ez-token=([^;]+)/);
                    if (match) {
                        tokenMatch = match;
                        break;
                    }
                }
            }

            if (!tokenMatch) {
                throw new Error("No ez-token cookie in response");
            }

            return c.json({ token: tokenMatch[1], message: "Login successful" }, 200);
        } catch {
            return c.json({ error: "Invalid email or password" }, 401);
        }
    }
);

// ── POST /auth/api-token ────────────────────────────────────────

auth.openapi(
    createRoute({
        method: "post",
        path: "/api-token",
        tags: ["Auth"],
        summary: "Generate a long-lived API token",
        description:
            "Calls `users.generateApiToken`. Requires a valid Bearer token (login first). " +
            "The returned token can be used instead of logging in each time.",
        security: [{ Bearer: [] }],
        responses: {
            200: { content: { "application/json": { schema: TokenResponseSchema } }, description: "Token generated" },
            401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
        },
    }),
    async (c) => {
        const authHeader = c.req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return c.json({ error: "Login first, then use Bearer token" }, 401);
        }
        const token = authHeader.slice(7).trim();

        const data = await callTrpc<{ token: string }>("users.generateApiToken", {}, token);
        return c.json({ token: (data as any)?.token ?? data }, 200);
    }
);

// ── GET /auth/check ─────────────────────────────────────────────

auth.openapi(
    createRoute({
        method: "get",
        path: "/check",
        tags: ["Auth"],
        summary: "Verify your token is valid",
        description: "Calls `auth.getUser` to validate the token. Returns user info if valid.",
        security: [{ Bearer: [] }],
        responses: {
            200: {
                content: {
                    "application/json": {
                        schema: z.object({ valid: z.boolean(), user: z.any() }).openapi("AuthCheck"),
                    },
                },
                description: "Token is valid",
            },
            401: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid token" },
        },
    }),
    async (c) => {
        const authHeader = c.req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return c.json({ error: "Missing Bearer token" }, 401);
        }
        const token = authHeader.slice(7).trim();

        try {
            const user = await callTrpc("auth.getUser", {}, token);
            return c.json({ valid: true, user }, 200);
        } catch {
            return c.json({ error: "Invalid or expired token" }, 401);
        }
    }
);

export default auth;
