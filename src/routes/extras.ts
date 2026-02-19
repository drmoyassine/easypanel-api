/**
 * Templates and Monitor routes.
 * Real tRPC: templates.createFromSchema, monitor.getSystemStats, etc.
 */
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { callTrpc, callTrpcQuery } from "../lib/trpc-client.js";
import {
    CreateFromSchemaSchema,
    SystemStatsSchema,
    ServiceStatsSchema,
    StorageStatsSchema,
} from "../schemas/resources.js";
import { ErrorSchema, SuccessSchema, ServiceParamsSchema, ProjectParamsSchema } from "../schemas/common.js";

// ════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════

export const templates = new OpenAPIHono();

// POST / — templates.createFromSchema
templates.openapi(
    createRoute({
        method: "post",
        path: "/",
        tags: ["Templates"],
        summary: "Deploy a service from a template schema",
        security: [{ Bearer: [] }],
        request: {
            body: { content: { "application/json": { schema: CreateFromSchemaSchema } }, required: true },
        },
        responses: {
            201: { content: { "application/json": { schema: SuccessSchema } }, description: "Template deployed" },
            400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid input" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const data = await callTrpc("templates.createFromSchema", body);
        return c.json(data ?? { ok: true } as any, 201);
    }
);

// ════════════════════════════════════════════════════════════════
// MONITOR
// ════════════════════════════════════════════════════════════════

export const monitor = new OpenAPIHono();

// GET /system — monitor.getSystemStats
monitor.openapi(
    createRoute({
        method: "get",
        path: "/system",
        tags: ["Monitor"],
        summary: "Get system stats (CPU, memory, disk, network)",
        security: [{ Bearer: [] }],
        responses: {
            200: { content: { "application/json": { schema: SystemStatsSchema } }, description: "Stats" },
        },
    }),
    async (c) => {
        const data = await callTrpcQuery("monitor.getSystemStats", {});
        return c.json(data as any, 200);
    }
);

// GET /storage — monitor.getStorageStats
monitor.openapi(
    createRoute({
        method: "get",
        path: "/storage",
        tags: ["Monitor"],
        summary: "Get storage/disk stats",
        security: [{ Bearer: [] }],
        responses: {
            200: { content: { "application/json": { schema: StorageStatsSchema } }, description: "Stats" },
        },
    }),
    async (c) => {
        const data = await callTrpcQuery("monitor.getStorageStats", {});
        return c.json(data as any, 200);
    }
);

// GET /services — monitor.getMonitorTableData
monitor.openapi(
    createRoute({
        method: "get",
        path: "/services",
        tags: ["Monitor"],
        summary: "Get resource usage for all services",
        security: [{ Bearer: [] }],
        responses: {
            200: { content: { "application/json": { schema: ServiceStatsSchema } }, description: "Stats" },
        },
    }),
    async (c) => {
        const data = await callTrpcQuery("monitor.getMonitorTableData", {});
        return c.json(data as any, 200);
    }
);
