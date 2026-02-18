import { z } from "@hono/zod-openapi";

// ── Shared response schemas ────────────────────────────────────

export const ErrorSchema = z
    .object({
        error: z.string().openapi({ example: "Resource not found" }),
        details: z.any().optional(),
        procedure: z.string().optional().openapi({ example: "projects.inspectProject" }),
    })
    .openapi("Error");

export const SuccessSchema = z
    .object({
        ok: z.boolean().openapi({ example: true }),
    })
    .openapi("Success");

// ── Common path params ─────────────────────────────────────────

export const ProjectParamsSchema = z.object({
    projectName: z.string().min(1).openapi({
        param: { name: "projectName", in: "path" },
        example: "my-project",
    }),
});

export const ServiceParamsSchema = z.object({
    projectName: z.string().min(1).openapi({
        param: { name: "projectName", in: "path" },
        example: "my-project",
    }),
    serviceName: z.string().min(1).openapi({
        param: { name: "serviceName", in: "path" },
        example: "my-app",
    }),
});

// ── Service type enum ──────────────────────────────────────────

export const ServiceTypeEnum = z
    .enum(["app", "mysql", "mariadb", "postgres", "mongo", "redis", "box", "compose", "wordpress"])
    .openapi({ example: "app" });

// ── Bearer auth ────────────────────────────────────────────────

export const bearerAuth = {
    type: "http" as const,
    scheme: "bearer",
    bearerFormat: "API Token",
    description: "Easypanel API token (Settings → API Tokens)",
};
