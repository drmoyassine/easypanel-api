import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { callTrpc, callTrpcQuery } from "../lib/trpc-client.js";
import {
    CreateAppServiceSchema,
    UpdateSourceGithubSchema,
    UpdateSourceGitSchema,
    UpdateSourceImageSchema,
    UpdateSourceDockerfileSchema,
    UpdateBuildSchema,
    UpdateDeploySchema,
    UpdateEnvSchema,
    UpdateResourcesSchema,
    UpdateBasicAuthSchema,
    UpdateMaintenanceSchema,
    UpdateRedirectsSchema,
    ServiceInspectSchema,
} from "../schemas/services.js";
import { ErrorSchema, SuccessSchema, ServiceParamsSchema } from "../schemas/common.js";

const app = new OpenAPIHono();

// Helper: extract projectName/serviceName from path params
function svc(c: any) {
    const { projectName, serviceName } = c.req.valid("param");
    return { projectName, serviceName };
}

// ── POST / ── services.app.createService ───────────────────────

app.openapi(
    createRoute({
        method: "post",
        path: "/",
        tags: ["App Services"],
        summary: "Create an app service",
        security: [{ Bearer: [] }],
        request: { body: { content: { "application/json": { schema: CreateAppServiceSchema } }, required: true } },
        responses: {
            201: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Created" },
            400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid input" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const data = await callTrpc("services.app.createService", body);
        return c.json(data as any, 201);
    }
);

// ── GET /:serviceName ── services.app.inspectService ───────────

app.openapi(
    createRoute({
        method: "get",
        path: "/{serviceName}",
        tags: ["App Services"],
        summary: "Inspect an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Service details" },
            404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
        },
    }),
    async (c) => {
        const data = await callTrpcQuery("services.app.inspectService", svc(c));
        return c.json(data as any, 200);
    }
);

// ── DELETE /:serviceName ── services.app.destroyService ────────

app.openapi(
    createRoute({
        method: "delete",
        path: "/{serviceName}",
        tags: ["App Services"],
        summary: "Destroy an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Destroyed" },
        },
    }),
    async (c) => {
        await callTrpc("services.app.destroyService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// ── POST /:serviceName/deploy ── services.app.deployService ────

app.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/deploy",
        tags: ["App Services"],
        summary: "Deploy / redeploy an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Deploy triggered" },
        },
    }),
    async (c) => {
        await callTrpc("services.app.deployService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// ── POST /:serviceName/start ── services.app.startService ──────

app.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/start",
        tags: ["App Services"],
        summary: "Start an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Started" },
        },
    }),
    async (c) => {
        await callTrpc("services.app.startService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// ── POST /:serviceName/stop ── services.app.stopService ────────

app.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/stop",
        tags: ["App Services"],
        summary: "Stop an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Stopped" },
        },
    }),
    async (c) => {
        await callTrpc("services.app.stopService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// ── POST /:serviceName/restart ── services.app.restartService ──

app.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/restart",
        tags: ["App Services"],
        summary: "Restart an app service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Restarted" },
        },
    }),
    async (c) => {
        await callTrpc("services.app.restartService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/source/github ── services.app.updateSourceGithub

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/github",
        tags: ["App Services"],
        summary: "Set GitHub source for an app",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateSourceGithubSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateSourceGithub", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/source/git ── services.app.updateSourceGit

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/git",
        tags: ["App Services"],
        summary: "Set Git source for an app",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateSourceGitSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateSourceGit", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/source/image ── services.app.updateSourceImage

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/image",
        tags: ["App Services"],
        summary: "Set Docker image source for an app",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateSourceImageSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateSourceImage", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/source/dockerfile ── services.app.updateSourceDockerfile

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/dockerfile",
        tags: ["App Services"],
        summary: "Set inline Dockerfile source for an app",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateSourceDockerfileSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateSourceDockerfile", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/build ── services.app.updateBuild ────────

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/build",
        tags: ["App Services"],
        summary: "Update build configuration",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateBuildSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateBuild", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/deploy-config ── services.app.updateDeploy

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/deploy-config",
        tags: ["App Services"],
        summary: "Update deploy configuration (replicas, command, zeroDowntime)",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateDeploySchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateDeploy", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/env ── services.app.updateEnv ────────────

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/env",
        tags: ["App Services"],
        summary: "Update environment variables",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateEnvSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateEnv", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// ── PUT /:serviceName/resources ── services.app.updateResources ─

app.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/resources",
        tags: ["App Services"],
        summary: "Update resource limits (CPU, memory)",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateResourcesSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.app.updateResources", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

export default app;
