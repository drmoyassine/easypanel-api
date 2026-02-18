import { z } from "@hono/zod-openapi";

// ── Request bodies ─────────────────────────────────────────────

export const CreateProjectSchema = z
    .object({
        name: z
            .string()
            .min(1)
            .regex(/^[a-z0-9-]+$/, "Lowercase alphanumeric + dashes only")
            .openapi({ example: "my-project" }),
    })
    .openapi("CreateProject");

export const UpdateProjectEnvSchema = z
    .object({
        env: z.string().openapi({
            example: "GLOBAL_VAR=value",
            description: "Project-level environment variables as KEY=VALUE, one per line",
        }),
    })
    .openapi("UpdateProjectEnv");

export const UpdateProjectAccessSchema = z
    .object({
        userIds: z.array(z.string()).openapi({
            example: ["user-1"],
            description: "IDs of users who should have access to this project",
        }),
    })
    .passthrough()
    .openapi("UpdateProjectAccess");

// ── Response schemas ───────────────────────────────────────────

export const ProjectSchema = z
    .object({
        name: z.string().openapi({ example: "my-project" }),
        createdAt: z.string().optional().openapi({ example: "2024-01-15T10:30:00Z" }),
    })
    .passthrough()
    .openapi("Project");

export const ProjectListSchema = z.array(ProjectSchema).openapi("ProjectList");

export const ProjectInspectSchema = z.object({}).passthrough().openapi("ProjectInspect");
