import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { authMiddleware } from "./middleware/auth.js";
import { handleError } from "./lib/errors.js";
import { getEasypanelToken } from "./lib/token-manager.js";

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
        { url: "http://localhost:3100", description: "Local development" },
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

const PORT = parseInt(process.env.PORT || "3100", 10);

async function start() {
    // Pre-authenticate with Easypanel on startup
    try {
        await getEasypanelToken();
    } catch (err: any) {
        console.error(`[startup] ⚠ Could not connect to Easypanel: ${err.message}`);
        console.error("[startup]   The gateway will retry on the first API call.");
    }

    console.log(`
╔══════════════════════════════════════════════════╗
║      Easypanel API Gateway v1.0.0                ║
╠══════════════════════════════════════════════════╣
║  REST API  → http://localhost:${PORT}/api/v1        ║
║  Docs      → http://localhost:${PORT}/docs           ║
║  OpenAPI   → http://localhost:${PORT}/openapi.json   ║
║  Health    → http://localhost:${PORT}/health          ║
║  Auth      → ${process.env.API_SECRET ? "API_SECRET required" : "⚠ No API_SECRET (dev mode)"}${" ".repeat(Math.max(0, 25 - (process.env.API_SECRET ? 19 : 26)))}║
╚══════════════════════════════════════════════════╝
`);

    serve({ fetch: app.fetch, port: PORT });
}

start();
