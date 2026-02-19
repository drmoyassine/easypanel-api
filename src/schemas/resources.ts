import { z } from "@hono/zod-openapi";

// ── Domain schemas ─────────────────────────────────────────────

export const CreateDomainSchema = z
    .object({
        host: z.string().openapi({ example: "app.example.com" }),
        https: z.boolean().default(true).openapi({ example: true }),
        port: z.number().default(80).openapi({ example: 3000 }),
        path: z.string().default("/").openapi({ example: "/" }),
    })
    .passthrough()
    .openapi("CreateDomain");

export const UpdateDomainSchema = z
    .object({
        domainId: z.string().openapi({ example: "cmltvacp7003c07nw4ni4765c", description: "Domain ID to update" }),
        host: z.string().optional().openapi({ example: "app.example.com" }),
        https: z.boolean().optional(),
        port: z.number().optional(),
        path: z.string().optional(),
        protocol: z.string().optional().openapi({ example: "http", description: "Backend protocol (http/https)" }),
    })
    .passthrough()
    .openapi("UpdateDomain");

export const DeleteDomainSchema = z
    .object({
        domainId: z.string().openapi({ example: "cmltvacp7003c07nw4ni4765c" }),
    })
    .openapi("DeleteDomain");

export const SetPrimaryDomainSchema = z
    .object({
        domainId: z.string().openapi({ example: "cmltvctxf003d07nw76rj8aq5" }),
    })
    .openapi("SetPrimaryDomain");

export const DomainSchema = z
    .object({
        host: z.string().openapi({ example: "app.example.com" }),
        https: z.boolean().openapi({ example: true }),
        port: z.number().openapi({ example: 3000 }),
        path: z.string().openapi({ example: "/" }),
    })
    .passthrough()
    .openapi("Domain");

export const DomainListSchema = z.array(DomainSchema).openapi("DomainList");

// ── Port schemas ───────────────────────────────────────────────

export const CreatePortSchema = z
    .object({
        published: z.number().openapi({ example: 8080, description: "Host port" }),
        target: z.number().openapi({ example: 80, description: "Container port" }),
        protocol: z.enum(["tcp", "udp"]).default("tcp").openapi({ example: "tcp" }),
    })
    .openapi("CreatePort");

export const UpdatePortSchema = z
    .object({
        published: z.number(),
        target: z.number(),
        protocol: z.enum(["tcp", "udp"]).optional(),
    })
    .passthrough()
    .openapi("UpdatePort");

export const DeletePortSchema = z
    .object({
        published: z.number(),
        target: z.number(),
        protocol: z.enum(["tcp", "udp"]).optional(),
    })
    .openapi("DeletePort");

export const PortSchema = z
    .object({
        published: z.number().openapi({ example: 8080 }),
        target: z.number().openapi({ example: 80 }),
        protocol: z.string().openapi({ example: "tcp" }),
    })
    .passthrough()
    .openapi("Port");

export const PortListSchema = z.array(PortSchema).openapi("PortList");

// ── Mount schemas ──────────────────────────────────────────────

export const CreateMountSchema = z
    .object({
        name: z.string().openapi({ example: "data" }),
        mountPath: z.string().openapi({ example: "/app/data" }),
        hostPath: z.string().optional().openapi({ example: "/mnt/data" }),
    })
    .passthrough()
    .openapi("CreateMount");

export const UpdateMountSchema = z
    .object({
        name: z.string(),
        mountPath: z.string().optional(),
        hostPath: z.string().optional(),
    })
    .passthrough()
    .openapi("UpdateMount");

export const DeleteMountSchema = z
    .object({
        name: z.string(),
    })
    .openapi("DeleteMount");

export const MountSchema = z
    .object({
        name: z.string().openapi({ example: "data" }),
        mountPath: z.string().openapi({ example: "/app/data" }),
        hostPath: z.string().optional().openapi({ example: "/mnt/data" }),
    })
    .passthrough()
    .openapi("Mount");

export const MountListSchema = z.array(MountSchema).openapi("MountList");

// ── Template schema ────────────────────────────────────────────

export const CreateFromSchemaSchema = z
    .object({
        projectName: z.string().min(1).openapi({ example: "my-project" }),
        template: z.string().min(1).openapi({ example: "plausible" }),
        serviceName: z.string().optional().openapi({ example: "my-plausible" }),
    })
    .passthrough()
    .openapi("CreateFromTemplate");

// ── Monitor schema ─────────────────────────────────────────────

export const SystemStatsSchema = z.object({}).passthrough().openapi("SystemStats");
export const ServiceStatsSchema = z.object({}).passthrough().openapi("ServiceStats");
export const StorageStatsSchema = z.object({}).passthrough().openapi("StorageStats");
