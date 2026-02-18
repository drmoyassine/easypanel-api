import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { authMiddleware } from "./middleware/auth.js";
import { handleError } from "./lib/errors.js";
import { getEasypanelToken } from "./lib/token-manager.js";

// Ensure crashes always show in Docker logs
process.on("uncaughtException", (err) => {
    console.error("[FATAL] Uncaught exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (err) => {
    console.error("[FATAL] Unhandled rejection:", err);
    process.exit(1);
});

console.log("[startup] easypanel-api loading...");

// Route imports
import auth from "./routes/auth.js";
import projects from "./routes/projects.js";
import appServices from "./routes/services-app.js";
import {
    mysqlRouter, postgresRouter, mariadbRouter,
    mongoRouter, redisRouter,
} from "./routes/services-db.js";
import compose from "./routes/compose.js";
import { domains, ports, mounts } from "./routes/resources.js";
import { templates, monitor } from "./routes/extras.js";

// ── App setup ──────────────────────────────────────────────────

const app = new OpenAPIHono();

app.onError(handleError);

// Request logger
app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`);
});

// Root — API info + navigation
app.get("/", (c) => {
    const base = process.env.APP_URL || `http://localhost:${PORT}`;
    return c.json({
        name: "Easypanel API Gateway",
        version: "1.0.0",
        description: "REST API gateway for Easypanel — translates REST to internal tRPC",
        endpoints: {
            docs: `${base}/docs`,
            openapi: `${base}/openapi.json`,
            health: `${base}/health`,
            auth_status: `${base}/auth/status`,
            api: `${base}/api/v1`,
        },
        authentication: process.env.API_SECRET
            ? "API_SECRET required — pass as Authorization: Bearer <secret>"
            : "⚠ No API_SECRET set (dev mode — no auth required)",
    });
});

// Health check (public — no auth)
app.get("/health", (c) =>
    c.json({ status: "ok", version: "1.0.0", timestamp: new Date().toISOString() })
);

// Auth status (public — no auth)
app.route("/auth", auth);

// ── Auth on all /api/v1/* routes ─────────────────────────────

app.use("/api/v1/*", authMiddleware);

// ── Projects ─────────────────────────────────────────────────

app.route("/api/v1/projects", projects);

// ── App services ─────────────────────────────────────────────

app.route("/api/v1/services/app", appServices);

// ── Database services ────────────────────────────────────────

app.route("/api/v1/services/mysql", mysqlRouter);
app.route("/api/v1/services/postgres", postgresRouter);
app.route("/api/v1/services/mariadb", mariadbRouter);
app.route("/api/v1/services/mongo", mongoRouter);
app.route("/api/v1/services/redis", redisRouter);

// ── Compose services ─────────────────────────────────────────

app.route("/api/v1/services/compose", compose);

// ── Domains, Ports, Mounts (per-service resources) ───────────

app.route("/api/v1/domains", domains);
app.route("/api/v1/ports", ports);
app.route("/api/v1/mounts", mounts);

// ── Templates ────────────────────────────────────────────────

app.route("/api/v1/templates", templates);

// ── Monitor ──────────────────────────────────────────────────

app.route("/api/v1/monitor", monitor);

// ── OpenAPI specification ────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3100", 10);

app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
        title: "Easypanel API",
        version: "1.0.0",
        description:
            "Public REST API gateway for Easypanel v2.26.3. " +
            "The gateway auto-authenticates with Easypanel using admin credentials from environment variables. " +
            "External callers authenticate with API_SECRET.",
        license: { name: "MIT" },
    },
    servers: [
        {
            url: process.env.APP_URL || `http://localhost:${PORT}`,
            description: process.env.APP_URL ? "Production" : "Local development",
        },
    ],
    security: [{ Bearer: [] }],
});

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "API_SECRET",
    description:
        "Your API secret (set via API_SECRET env var). " +
        "If API_SECRET is not set, the gateway runs without external auth (dev mode).",
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// ── Start server ─────────────────────────────────────────────

async function start() {
    console.log(`[startup] PORT=${PORT}`);
    console.log(`[startup] APP_URL=${process.env.APP_URL || "not set (using localhost)"}`);
    console.log(`[startup] EASYPANEL_URL=${process.env.EASYPANEL_URL || "http://localhost:3000"}`);
    console.log(`[startup] EASYPANEL_EMAIL=${process.env.EASYPANEL_EMAIL ? "set" : "NOT SET"}`);
    console.log(`[startup] EASYPANEL_PASSWORD=${process.env.EASYPANEL_PASSWORD ? "set" : "NOT SET"}`);
    console.log(`[startup] API_SECRET=${process.env.API_SECRET ? "set" : "not set (dev mode)"}`);

    // Pre-authenticate with Easypanel on startup
    try {
        await getEasypanelToken();
    } catch (err: any) {
        console.error(`[startup] ⚠ Could not connect to Easypanel: ${err.message}`);
        console.error("[startup]   The gateway will retry on the first API call.");
    }

    serve({ fetch: app.fetch, port: PORT });

    console.log(`[startup] ✓ Listening on http://localhost:${PORT}`);
    console.log(`[startup] ✓ Docs at http://localhost:${PORT}/docs`);
}

start().catch((err) => {
    console.error("[FATAL] Startup failed:", err);
    process.exit(1);
});
