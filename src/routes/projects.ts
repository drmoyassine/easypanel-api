import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { callTrpc } from "../lib/trpc-client.js";
import {
    CreateProjectSchema,
    ProjectSchema,
    ProjectListSchema,
    ProjectInspectSchema,
    UpdateProjectEnvSchema,
} from "../schemas/projects.js";
import { ErrorSchema, SuccessSchema, ProjectParamsSchema } from "../schemas/common.js";

const projects = new OpenAPIHono();

// ── GET / ── projects.listProjects ─────────────────────────────

projects.openapi(
    createRoute({
        method: "get",
        path: "/",
        tags: ["Projects"],
        summary: "List all projects",
        security: [{ Bearer: [] }],
        responses: {
            200: { content: { "application/json": { schema: ProjectListSchema } }, description: "List of projects" },
            401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
        },
    }),
    async (c) => {
        const data = await callTrpc("projects.listProjects", {});
        return c.json(data as any, 200);
    }
);

// ── POST / ── projects.createProject ───────────────────────────

projects.openapi(
    createRoute({
        method: "post",
        path: "/",
        tags: ["Projects"],
        summary: "Create a new project",
        security: [{ Bearer: [] }],
        request: { body: { content: { "application/json": { schema: CreateProjectSchema } }, required: true } },
        responses: {
            201: { content: { "application/json": { schema: ProjectSchema } }, description: "Created project" },
            400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid input" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const data = await callTrpc("projects.createProject", body);
        return c.json(data as any, 201);
    }
);

// ── GET /:projectName ── projects.inspectProject ───────────────

projects.openapi(
    createRoute({
        method: "get",
        path: "/{projectName}",
        tags: ["Projects"],
        summary: "Inspect a project",
        security: [{ Bearer: [] }],
        request: { params: ProjectParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: ProjectInspectSchema } }, description: "Project details" },
            404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
        },
    }),
    async (c) => {
        const { projectName } = c.req.valid("param");
        const data = await callTrpc("projects.inspectProject", { projectName });
        return c.json(data as any, 200);
    }
);

// ── DELETE /:projectName ── projects.destroyProject ────────────

projects.openapi(
    createRoute({
        method: "delete",
        path: "/{projectName}",
        tags: ["Projects"],
        summary: "Destroy a project",
        security: [{ Bearer: [] }],
        request: { params: ProjectParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Destroyed" },
            404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
        },
    }),
    async (c) => {
        const { projectName } = c.req.valid("param");
        await callTrpc("projects.destroyProject", { projectName });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:projectName/env ── projects.updateProjectEnv ─────────

projects.openapi(
    createRoute({
        method: "put",
        path: "/{projectName}/env",
        tags: ["Projects"],
        summary: "Update project-level environment variables",
        security: [{ Bearer: [] }],
        request: {
            params: ProjectParamsSchema,
            body: { content: { "application/json": { schema: UpdateProjectEnvSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Env updated" },
        },
    }),
    async (c) => {
        const { projectName } = c.req.valid("param");
        const body = c.req.valid("json");
        await callTrpc("projects.updateProjectEnv", { projectName, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── GET /:projectName/containers ── projects.getDockerContainers

projects.openapi(
    createRoute({
        method: "get",
        path: "/{projectName}/containers",
        tags: ["Projects"],
        summary: "List Docker containers in a project",
        security: [{ Bearer: [] }],
        request: { params: ProjectParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: ProjectInspectSchema } }, description: "Container list" },
        },
    }),
    async (c) => {
        const { projectName } = c.req.valid("param");
        const data = await callTrpc("projects.getDockerContainers", { projectName });
        return c.json(data as any, 200);
    }
);

export default projects;
