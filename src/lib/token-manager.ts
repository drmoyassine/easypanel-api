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

    const { headers } = await callTrpcRaw("auth.login", { email, password });

    // Extract ez-token from Set-Cookie header
    const setCookie = headers.get("set-cookie") || "";
    let token: string | null = null;

    const match = setCookie.match(/ez-token=([^;]+)/);
    if (match) {
        token = match[1];
    }

    // Try getSetCookie() for multi-header environments
    if (!token) {
        const allCookies = headers.getSetCookie?.() || [];
        for (const cookie of allCookies) {
            const m = cookie.match(/ez-token=([^;]+)/);
            if (m) {
                token = m[1];
                break;
            }
        }
    }

    if (!token) {
        throw new Error(
            "Login succeeded but no ez-token cookie was returned. Check Easypanel version."
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
