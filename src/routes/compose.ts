import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { callTrpc, callTrpcQuery } from "../lib/trpc-client.js";
import {
    CreateComposeServiceSchema,
    UpdateSourceInlineSchema,
    UpdateComposeSourceGitSchema,
    UpdateEnvSchema,
    ServiceInspectSchema,
} from "../schemas/services.js";
import { ErrorSchema, SuccessSchema, ServiceParamsSchema } from "../schemas/common.js";

const compose = new OpenAPIHono();

function svc(c: any) {
    const { projectName, serviceName } = c.req.valid("param");
    return { projectName, serviceName };
}

// POST / — services.compose.createService
compose.openapi(
    createRoute({
        method: "post",
        path: "/",
        tags: ["Compose Services"],
        summary: "Create a compose service",
        security: [{ Bearer: [] }],
        request: { body: { content: { "application/json": { schema: CreateComposeServiceSchema } }, required: true } },
        responses: {
            201: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Created" },
            400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid input" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const data = await callTrpc("services.compose.createService", body);
        return c.json(data as any, 201);
    }
);

// GET /:serviceName — services.compose.inspectService
compose.openapi(
    createRoute({
        method: "get",
        path: "/{serviceName}",
        tags: ["Compose Services"],
        summary: "Inspect a compose service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Details" },
        },
    }),
    async (c) => {
        const data = await callTrpcQuery("services.compose.inspectService", svc(c));
        return c.json(data as any, 200);
    }
);

// DELETE /:serviceName — services.compose.destroyService
compose.openapi(
    createRoute({
        method: "delete",
        path: "/{serviceName}",
        tags: ["Compose Services"],
        summary: "Destroy a compose service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Destroyed" },
        },
    }),
    async (c) => {
        await callTrpc("services.compose.destroyService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// POST /:serviceName/deploy — services.compose.deployService
compose.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/deploy",
        tags: ["Compose Services"],
        summary: "Deploy a compose service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Deployed" },
        },
    }),
    async (c) => {
        await callTrpc("services.compose.deployService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// POST /:serviceName/start — services.compose.startService
compose.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/start",
        tags: ["Compose Services"],
        summary: "Start a compose service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Started" },
        },
    }),
    async (c) => {
        await callTrpc("services.compose.startService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// POST /:serviceName/stop — services.compose.stopService
compose.openapi(
    createRoute({
        method: "post",
        path: "/{serviceName}/stop",
        tags: ["Compose Services"],
        summary: "Stop a compose service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Stopped" },
        },
    }),
    async (c) => {
        await callTrpc("services.compose.stopService", svc(c));
        return c.json({ ok: true }, 200);
    }
);

// PUT /:serviceName/source/inline — services.compose.updateSourceInline
compose.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/inline",
        tags: ["Compose Services"],
        summary: "Set inline Docker Compose YAML source",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateSourceInlineSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.compose.updateSourceInline", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// PUT /:serviceName/source/git — services.compose.updateSourceGit
compose.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/source/git",
        tags: ["Compose Services"],
        summary: "Set Git source for a compose service",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateComposeSourceGitSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("services.compose.updateSourceGit", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

// PUT /:serviceName/env — services.compose.updateEnv
compose.openapi(
    createRoute({
        method: "put",
        path: "/{serviceName}/env",
        tags: ["Compose Services"],
        summary: "Update compose environment variables",
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
        await callTrpc("services.compose.updateEnv", { ...p, ...body });
        return c.json({ ok: true }, 200);
    }
);

export default compose;
