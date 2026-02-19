import { z } from "@hono/zod-openapi";

// ────────────────────────────────────────────────────────────────
// App service schemas
// ────────────────────────────────────────────────────────────────

export const CreateAppServiceSchema = z
    .object({
        projectName: z.string().min(1).openapi({ example: "my-project" }),
        serviceName: z.string().min(1).openapi({ example: "my-app" }),
    })
    .passthrough()
    .openapi("CreateAppService");

export const UpdateSourceGithubSchema = z
    .object({
        owner: z.string().openapi({ example: "myorg" }),
        repo: z.string().openapi({ example: "myrepo" }),
        ref: z.string().optional().openapi({ example: "main" }),
        path: z.string().optional().openapi({ example: "/" }),
        autoDeploy: z.boolean().optional().openapi({ example: true }),
    })
    .passthrough()
    .openapi("UpdateSourceGithub");

export const UpdateSourceGitSchema = z
    .object({
        repo: z.string().openapi({ example: "https://github.com/org/repo.git" }),
        ref: z.string().optional().openapi({ example: "main" }),
        path: z.string().optional().openapi({ example: "/" }),
    })
    .passthrough()
    .openapi("UpdateSourceGit");

export const UpdateSourceImageSchema = z
    .object({
        image: z.string().openapi({ example: "nginx:latest" }),
        username: z.string().optional(),
        password: z.string().optional(),
    })
    .passthrough()
    .openapi("UpdateSourceImage");

export const UpdateSourceDockerfileSchema = z
    .object({
        dockerfile: z.string().openapi({ example: "FROM node:20\nCOPY . .\nRUN npm install" }),
    })
    .passthrough()
    .openapi("UpdateSourceDockerfile");

export const UpdateBuildSchema = z
    .object({
        type: z.string().optional().openapi({ example: "nixpacks" }),
    })
    .passthrough()
    .openapi("UpdateBuild");

export const UpdateEnvSchema = z
    .object({
        env: z.string().openapi({
            example: "DATABASE_URL=postgres://...\nNODE_ENV=production",
            description: "Environment variables as KEY=VALUE pairs, one per line",
        }),
    })
    .openapi("UpdateEnv");

export const UpdateResourcesSchema = z
    .object({
        memoryLimit: z.number().optional().openapi({ example: 512 }),
        memoryReservation: z.number().optional().openapi({ example: 256 }),
        cpuLimit: z.number().optional().openapi({ example: 1 }),
        cpuReservation: z.number().optional().openapi({ example: 0.5 }),
    })
    .passthrough()
    .openapi("UpdateResources");

export const UpdateDeploySchema = z
    .object({
        replicas: z.number().optional().openapi({ example: 1 }),
        command: z.string().optional().openapi({ example: "npm start" }),
        zeroDowntime: z.boolean().optional().openapi({ example: true }),
    })
    .passthrough()
    .openapi("UpdateDeploy");

export const UpdateBasicAuthSchema = z
    .object({
        enabled: z.boolean().openapi({ example: false }),
        credentials: z.string().optional().openapi({ example: "user:password" }),
    })
    .passthrough()
    .openapi("UpdateBasicAuth");

export const UpdateMaintenanceSchema = z
    .object({
        enabled: z.boolean().openapi({ example: false }),
    })
    .passthrough()
    .openapi("UpdateMaintenance");

export const UpdateRedirectsSchema = z
    .object({
        redirects: z.array(z.object({}).passthrough()).optional(),
    })
    .passthrough()
    .openapi("UpdateRedirects");

// ── Service inspect / list response ────────────────────────────

export const ServiceInspectSchema = z.object({}).passthrough().openapi("ServiceInspect");

// ────────────────────────────────────────────────────────────────
// Database service schemas (shared by mysql, postgres, mariadb, mongo, redis)
// ────────────────────────────────────────────────────────────────

export const CreateDatabaseServiceSchema = z
    .object({
        projectName: z.string().min(1).openapi({ example: "my-project" }),
        serviceName: z.string().min(1).openapi({ example: "my-db" }),
        image: z.string().optional().openapi({ example: "postgres:16" }),
        password: z.string().optional().openapi({ example: "secret" }),
    })
    .passthrough()
    .openapi("CreateDatabaseService");

export const UpdateCredentialsSchema = z
    .object({
        password: z.string().openapi({ example: "newsecret" }),
        rootPassword: z.string().optional(),
    })
    .passthrough()
    .openapi("UpdateCredentials");

export const ExposeServiceSchema = z
    .object({
        ports: z.array(z.number()).optional(),
    })
    .passthrough()
    .openapi("ExposeService");

// ────────────────────────────────────────────────────────────────
// Compose service schemas
// ────────────────────────────────────────────────────────────────

export const CreateComposeServiceSchema = z
    .object({
        projectName: z.string().min(1).openapi({ example: "my-project" }),
        serviceName: z.string().min(1).openapi({ example: "my-compose" }),
    })
    .passthrough()
    .openapi("CreateComposeService");

export const UpdateSourceInlineSchema = z
    .object({
        content: z.string().openapi({
            example: "version: '3.8'\nservices:\n  web:\n    image: nginx",
            description: "Docker Compose YAML content (Easypanel field: content)",
        }),
    })
    .passthrough()
    .openapi("UpdateSourceInline");

// Compose-specific Git source — distinct from app UpdateSourceGitSchema
export const UpdateComposeSourceGitSchema = z
    .object({
        repo: z.string().openapi({ example: "https://github.com/org/repo.git" }),
        ref: z.string().optional().openapi({ example: "main" }),
        rootPath: z.string().openapi({ example: "/", description: "Path within repo where compose file lives" }),
        composeFile: z.string().openapi({ example: "docker-compose.yml", description: "Compose file name within rootPath" }),
        username: z.string().optional(),
        password: z.string().optional(),
    })
    .passthrough()
    .openapi("UpdateComposeSourceGit");
