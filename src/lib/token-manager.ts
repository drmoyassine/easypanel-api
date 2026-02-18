/**
 * Internal token manager — auto-authenticates with Easypanel on startup
 * using EASYPANEL_EMAIL + EASYPANEL_PASSWORD from environment variables.
 *
 * The gateway manages its own session. External callers never touch
 * Easypanel credentials — they use API_SECRET instead.
 */

import { callTrpcRaw } from "./trpc-client.js";

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // timestamp (ms)

const TOKEN_REFRESH_INTERVAL = 1000 * 60 * 60; // refresh every 1 hour

/**
 * Get a valid ez-token, logging in automatically if needed.
 * Throws if EASYPANEL_EMAIL / EASYPANEL_PASSWORD are not set.
 */
export async function getEasypanelToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still fresh
    if (cachedToken && now < tokenExpiresAt) {
        return cachedToken;
    }

    // Login with env credentials
    const email = process.env.EASYPANEL_EMAIL;
    const password = process.env.EASYPANEL_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "EASYPANEL_EMAIL and EASYPANEL_PASSWORD must be set in environment variables"
        );
    }

    console.log("[auth] Logging into Easypanel...");

    const { data, headers } = await callTrpcRaw<{ ezToken?: string }>(
        "auth.login",
        { email, password }
    );

    let token: string | null = null;

    // Method 1: Token in the response body
    // Easypanel may return { token: "..." } or { ezToken: "..." }
    if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const bodyToken = d.token || d.ezToken;
        if (typeof bodyToken === "string" && bodyToken) {
            token = bodyToken;
            console.log("[auth] ✓ Got token from response body");
        }
    }

    // Method 2: Token in Set-Cookie header
    if (!token) {
        const setCookie = headers.get("set-cookie") || "";
        const match = setCookie.match(/ez-token=([^;]+)/);
        if (match) {
            token = match[1];
            console.log("[auth] ✓ Got token from Set-Cookie header");
        }
    }

    // Method 3: Try getSetCookie() for multi-header environments
    if (!token) {
        const allCookies = headers.getSetCookie?.() || [];
        for (const cookie of allCookies) {
            const m = cookie.match(/ez-token=([^;]+)/);
            if (m) {
                token = m[1];
                console.log("[auth] ✓ Got token from getSetCookie()");
                break;
            }
        }
    }

    if (!token) {
        // Log what we DID get for debugging
        console.error("[auth] Response data:", JSON.stringify(data));
        console.error("[auth] Set-Cookie:", headers.get("set-cookie"));
        throw new Error(
            "Login succeeded but could not extract ez-token from response"
        );
    }

    cachedToken = token;
    tokenExpiresAt = now + TOKEN_REFRESH_INTERVAL;
    console.log("[auth] ✓ Authenticated with Easypanel");

    return token;
}

/**
 * Force a token refresh on next call (e.g. after a 401 from Easypanel).
 */
export function invalidateToken(): void {
    cachedToken = null;
    tokenExpiresAt = 0;
}
