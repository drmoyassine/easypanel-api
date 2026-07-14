import { z } from "@hono/zod-openapi";

export const ContainerIdParamsSchema = z.object({
    containerId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_.-]+$/),
}).openapi("ContainerIdParams");

export const RuntimeListQuerySchema = z.object({
    all: z.enum(["true", "false"]).transform(value => value === "true").default(true),
    name: z.string().max(100).optional(),
}).openapi("RuntimeListQuery");

export const LogsQuerySchema = z.object({
    tail: z.coerce.number().int().min(1).max(2000).default(300),
    sinceSeconds: z.coerce.number().int().min(0).max(604800).default(1800),
    severity: z.enum(["all", "error", "warning", "info"]).default("all"),
}).openapi("RuntimeLogsQuery");

export const TrendQuerySchema = z.object({
    minutes: z.coerce.number().int().min(1).max(1440).default(60),
}).openapi("RuntimeTrendQuery");

export const AlertsQuerySchema = z.object({
    memoryPercent: z.coerce.number().min(1).max(100).default(85),
    growthMbPerHour: z.coerce.number().min(1).max(10240).default(100),
    minutes: z.coerce.number().int().min(5).max(1440).default(60),
}).openapi("RuntimeAlertsQuery");

export const PostgresDiagnosticsSchema = z.object({
    database: z.string().min(1).max(63).regex(/^[a-zA-Z0-9_-]+$/).default("memory"),
    user: z.string().min(1).max(63).regex(/^[a-zA-Z0-9_-]+$/).default("postgres"),
}).openapi("PostgresDiagnosticsRequest");

export const RedisDiagnosticsSchema = z.object({
    queueNames: z.array(z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)).max(20).default([]),
}).openapi("RedisDiagnosticsRequest");

export const ObservabilityResponseSchema = z.object({}).passthrough().openapi("ObservabilityResponse");
