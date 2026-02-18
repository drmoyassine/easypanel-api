/**
 * Domain, Port, and Mount routes — shared resources that apply to any service type.
 *
 * Real tRPC routers: domains.*, ports.*, mounts.*
 */
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { callTrpc } from "../lib/trpc-client.js";
import {
    CreateDomainSchema, UpdateDomainSchema, DeleteDomainSchema,
    SetPrimaryDomainSchema, DomainListSchema,
    CreatePortSchema, UpdatePortSchema, DeletePortSchema, PortListSchema,
    CreateMountSchema, UpdateMountSchema, DeleteMountSchema, MountListSchema,
} from "../schemas/resources.js";
import { ErrorSchema, SuccessSchema, ServiceParamsSchema } from "../schemas/common.js";

type Env = { Variables: { token: string } };

function svc(c: any) {
    const { projectName, serviceName } = c.req.valid("param");
    return { projectName, serviceName };
}

// ════════════════════════════════════════════════════════════════
// DOMAINS
// ════════════════════════════════════════════════════════════════

export const domains = new OpenAPIHono<Env>();

// GET / — domains.listDomains
domains.openapi(
    createRoute({
        method: "get", path: "/", tags: ["Domains"],
        summary: "List domains for a service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: DomainListSchema } }, description: "Domain list" },
        },
    }),
    async (c) => {
        const data = await callTrpc("domains.listDomains", svc(c), c.get("token"));
        return c.json(data as any, 200);
    }
);

// POST / — domains.createDomain
domains.openapi(
    createRoute({
        method: "post", path: "/", tags: ["Domains"],
        summary: "Add a domain to a service",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: CreateDomainSchema } }, required: true },
        },
        responses: {
            201: { content: { "application/json": { schema: SuccessSchema } }, description: "Created" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("domains.createDomain", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 201);
    }
);

// PUT / — domains.updateDomain
domains.openapi(
    createRoute({
        method: "put", path: "/", tags: ["Domains"],
        summary: "Update a domain configuration",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateDomainSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("domains.updateDomain", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// DELETE / — domains.deleteDomain
domains.openapi(
    createRoute({
        method: "delete", path: "/", tags: ["Domains"],
        summary: "Remove a domain from a service",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: DeleteDomainSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Deleted" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("domains.deleteDomain", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// POST /primary — domains.setPrimaryDomain
domains.openapi(
    createRoute({
        method: "post", path: "/primary", tags: ["Domains"],
        summary: "Set primary domain for a service",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: SetPrimaryDomainSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Set" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("domains.setPrimaryDomain", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// ════════════════════════════════════════════════════════════════
// PORTS
// ════════════════════════════════════════════════════════════════

export const ports = new OpenAPIHono<Env>();

// GET / — ports.listPorts
ports.openapi(
    createRoute({
        method: "get", path: "/", tags: ["Ports"],
        summary: "List published ports for a service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: PortListSchema } }, description: "Port list" },
        },
    }),
    async (c) => {
        const data = await callTrpc("ports.listPorts", svc(c), c.get("token"));
        return c.json(data as any, 200);
    }
);

// POST / — ports.createPort
ports.openapi(
    createRoute({
        method: "post", path: "/", tags: ["Ports"],
        summary: "Add a port mapping",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: CreatePortSchema } }, required: true },
        },
        responses: {
            201: { content: { "application/json": { schema: SuccessSchema } }, description: "Created" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("ports.createPort", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 201);
    }
);

// PUT / — ports.updatePort
ports.openapi(
    createRoute({
        method: "put", path: "/", tags: ["Ports"],
        summary: "Update a port mapping",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdatePortSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("ports.updatePort", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// DELETE / — ports.deletePort
ports.openapi(
    createRoute({
        method: "delete", path: "/", tags: ["Ports"],
        summary: "Remove a port mapping",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: DeletePortSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Deleted" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("ports.deletePort", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// ════════════════════════════════════════════════════════════════
// MOUNTS
// ════════════════════════════════════════════════════════════════

export const mounts = new OpenAPIHono<Env>();

// GET / — mounts.listMounts
mounts.openapi(
    createRoute({
        method: "get", path: "/", tags: ["Mounts"],
        summary: "List volume mounts for a service",
        security: [{ Bearer: [] }],
        request: { params: ServiceParamsSchema },
        responses: {
            200: { content: { "application/json": { schema: MountListSchema } }, description: "Mount list" },
        },
    }),
    async (c) => {
        const data = await callTrpc("mounts.listMounts", svc(c), c.get("token"));
        return c.json(data as any, 200);
    }
);

// POST / — mounts.createMount
mounts.openapi(
    createRoute({
        method: "post", path: "/", tags: ["Mounts"],
        summary: "Add a volume mount",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: CreateMountSchema } }, required: true },
        },
        responses: {
            201: { content: { "application/json": { schema: SuccessSchema } }, description: "Created" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("mounts.createMount", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 201);
    }
);

// PUT / — mounts.updateMount
mounts.openapi(
    createRoute({
        method: "put", path: "/", tags: ["Mounts"],
        summary: "Update a volume mount",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: UpdateMountSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("mounts.updateMount", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);

// DELETE / — mounts.deleteMount
mounts.openapi(
    createRoute({
        method: "delete", path: "/", tags: ["Mounts"],
        summary: "Remove a volume mount",
        security: [{ Bearer: [] }],
        request: {
            params: ServiceParamsSchema,
            body: { content: { "application/json": { schema: DeleteMountSchema } }, required: true },
        },
        responses: {
            200: { content: { "application/json": { schema: SuccessSchema } }, description: "Deleted" },
        },
    }),
    async (c) => {
        const body = c.req.valid("json");
        const p = svc(c);
        await callTrpc("mounts.deleteMount", { ...p, ...body }, c.get("token"));
        return c.json({ ok: true }, 200);
    }
);
