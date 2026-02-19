/**
 * Database service routes — shared by mysql, postgres, mariadb, mongo, redis.
 *
 * Each DB type has its own tRPC router (services.mysql, services.postgres, etc.)
 * but they all share the same procedure names:
 *   createService, destroyService, inspectService,
 *   enableService, disableService, exposeService,
 *   updateCredentials, updateResources, updateAdvanced
 *
 * We expose one set of routes per DB type via a factory function.
 */
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { callTrpc, callTrpcQuery } from "../lib/trpc-client.js";
import {
    CreateDatabaseServiceSchema,
    UpdateCredentialsSchema,
    UpdateResourcesSchema,
    ExposeServiceSchema,
    ServiceInspectSchema,
} from "../schemas/services.js";
import { ErrorSchema, SuccessSchema, ServiceParamsSchema } from "../schemas/common.js";

const DB_TYPES = ["mysql", "postgres", "mariadb", "mongo", "redis"] as const;
type DbType = (typeof DB_TYPES)[number];

function svc(c: any) {
    const { projectName, serviceName } = c.req.valid("param");
    return { projectName, serviceName };
}

/** Build a Hono sub-app for a specific database service type. */
export function createDatabaseRouter(dbType: DbType) {
    const tag = `${dbType.charAt(0).toUpperCase()}${dbType.slice(1)} Services`;
    const prefix = `services.${dbType}`;
    const db = new OpenAPIHono();

    // POST / — createService
    db.openapi(
        createRoute({
            method: "post",
            path: "/",
            tags: [tag],
            summary: `Create a ${dbType} service`,
            security: [{ Bearer: [] }],
            request: { body: { content: { "application/json": { schema: CreateDatabaseServiceSchema } }, required: true } },
            responses: {
                201: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Created" },
                400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid input" },
            },
        }),
        async (c) => {
            const body = c.req.valid("json");
            const data = await callTrpc(`${prefix}.createService`, body);
            return c.json(data as any, 201);
        }
    );

    // GET /:serviceName — inspectService
    db.openapi(
        createRoute({
            method: "get",
            path: "/{serviceName}",
            tags: [tag],
            summary: `Inspect a ${dbType} service`,
            security: [{ Bearer: [] }],
            request: { params: ServiceParamsSchema },
            responses: {
                200: { content: { "application/json": { schema: ServiceInspectSchema } }, description: "Details" },
                404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
            },
        }),
        async (c) => {
            const data = await callTrpcQuery(`${prefix}.inspectService`, svc(c));
            return c.json(data as any, 200);
        }
    );

    // DELETE /:serviceName — destroyService
    db.openapi(
        createRoute({
            method: "delete",
            path: "/{serviceName}",
            tags: [tag],
            summary: `Destroy a ${dbType} service`,
            security: [{ Bearer: [] }],
            request: { params: ServiceParamsSchema },
            responses: {
                200: { content: { "application/json": { schema: SuccessSchema } }, description: "Destroyed" },
            },
        }),
        async (c) => {
            await callTrpc(`${prefix}.destroyService`, svc(c));
            return c.json({ ok: true }, 200);
        }
    );

    // POST /:serviceName/enable — enableService
    db.openapi(
        createRoute({
            method: "post",
            path: "/{serviceName}/enable",
            tags: [tag],
            summary: `Start a ${dbType} service`,
            security: [{ Bearer: [] }],
            request: { params: ServiceParamsSchema },
            responses: {
                200: { content: { "application/json": { schema: SuccessSchema } }, description: "Enabled" },
            },
        }),
        async (c) => {
            await callTrpc(`${prefix}.enableService`, svc(c));
            return c.json({ ok: true }, 200);
        }
    );

    // POST /:serviceName/disable — disableService
    db.openapi(
        createRoute({
            method: "post",
            path: "/{serviceName}/disable",
            tags: [tag],
            summary: `Stop a ${dbType} service`,
            security: [{ Bearer: [] }],
            request: { params: ServiceParamsSchema },
            responses: {
                200: { content: { "application/json": { schema: SuccessSchema } }, description: "Disabled" },
            },
        }),
        async (c) => {
            await callTrpc(`${prefix}.disableService`, svc(c));
            return c.json({ ok: true }, 200);
        }
    );

    // PUT /:serviceName/credentials — updateCredentials
    db.openapi(
        createRoute({
            method: "put",
            path: "/{serviceName}/credentials",
            tags: [tag],
            summary: `Update ${dbType} credentials`,
            security: [{ Bearer: [] }],
            request: {
                params: ServiceParamsSchema,
                body: { content: { "application/json": { schema: UpdateCredentialsSchema } }, required: true },
            },
            responses: {
                200: { content: { "application/json": { schema: SuccessSchema } }, description: "Updated" },
            },
        }),
        async (c) => {
            const body = c.req.valid("json");
            const p = svc(c);
            await callTrpc(`${prefix}.updateCredentials`, { ...p, ...body });
            return c.json({ ok: true }, 200);
        }
    );

    // PUT /:serviceName/resources — updateResources
    db.openapi(
        createRoute({
            method: "put",
            path: "/{serviceName}/resources",
            tags: [tag],
            summary: `Update ${dbType} resource limits`,
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
            await callTrpc(`${prefix}.updateResources`, { ...p, ...body });
            return c.json({ ok: true }, 200);
        }
    );

    // POST /:serviceName/expose — exposeService
    db.openapi(
        createRoute({
            method: "post",
            path: "/{serviceName}/expose",
            tags: [tag],
            summary: `Expose ${dbType} service ports`,
            security: [{ Bearer: [] }],
            request: {
                params: ServiceParamsSchema,
                body: { content: { "application/json": { schema: ExposeServiceSchema } }, required: true },
            },
            responses: {
                200: { content: { "application/json": { schema: SuccessSchema } }, description: "Exposed" },
            },
        }),
        async (c) => {
            const body = c.req.valid("json");
            const p = svc(c);
            await callTrpc(`${prefix}.exposeService`, { ...p, ...body });
            return c.json({ ok: true }, 200);
        }
    );

    return db;
}

// Pre-build all 5 database routers
export const mysqlRouter = createDatabaseRouter("mysql");
export const postgresRouter = createDatabaseRouter("postgres");
export const mariadbRouter = createDatabaseRouter("mariadb");
export const mongoRouter = createDatabaseRouter("mongo");
export const redisRouter = createDatabaseRouter("redis");
