# AGENTS.md — easypanel-api

Agent instructions for working on `easypanel-api`, a REST-to-tRPC gateway that wraps Easypanel's internal API.

---

## Project Layout

```
src/
  index.ts              # Hono app + route mounts + OpenAPI spec
  lib/
    trpc-client.ts      # callTrpc() — makes tRPC requests to Easypanel
    token-manager.ts    # Auto-auth: fetches + caches Easypanel bearer token
    errors.ts           # Global error handler (maps TrpcCallError, ZodError, etc.)
  middleware/
    auth.ts             # Bearer token validation middleware
  routes/
    projects.ts         # /api/v1/projects
    services.ts         # /api/v1/projects/:name/services
    resources.ts        # /api/v1/.../domains, ports, mounts
    ...
  schemas/
    common.ts           # Shared schemas: ServiceParamsSchema, SuccessSchema, etc.
    resources.ts        # Domain, Port, Mount create/update schemas
    ...
```

---

## Core Patterns

### Adding a New Route

1. Define input/output Zod schemas in `src/schemas/`.
2. Mount a new `OpenAPIHono` router in `src/routes/`.
3. Use `createRoute()` + `.openapi()` — never plain `.get()` / `.post()`.
4. Call `callTrpc(procedureName, input)` from `src/lib/trpc-client.ts`.
5. Register the router in `src/index.ts` with `.route(prefix, router)`.

### Schema Conventions

```typescript
// Always export named schemas — they become OpenAPI component names
export const CreateFooSchema = z.object({ ... }).openapi("CreateFoo");

// Use .passthrough() only when Easypanel may add extra fields you want to forward
// DO NOT use .passthrough() on create/update schemas — be explicit
```

### Parameter Extraction

Route path params (`projectName`, `serviceName`) are always extracted via:

```typescript
const p = svc(c); // returns { projectName, serviceName } from path params
```

Merge with the tRPC input: `callTrpc("procedure", { ...p, ...body })`.

---

## Easypanel tRPC API — Known Quirks

> These were discovered through live API probing. Do not assume shape from field names alone.

### Domains

| Operation | tRPC Procedure | Key Requirement |
|-----------|----------------|-----------------|
| List | `domains.listDomains` | — |
| Create | `domains.createDomain` | Requires full domain object: `id`, `host`, `https`, `path`, `destinationType`, `serviceDestination`, `middlewares`, `certificateResolver`, `wildcard` |
| Update | `domains.updateDomain` | **`host` is required** — Easypanel does not allow partial update |
| Delete | `domains.deleteDomain` | Requires `id` (not `domainId`) in tRPC body — map `domainId → id` |
| Set Primary | `domains.setPrimaryDomain` | Requires `id` (not `domainId`) — same mapping |

### Ports & Mounts

| Operation | Payload Shape |
|-----------|---------------|
| Create | `{ projectName, serviceName, values: { field1, field2, ... } }` — **`values` is a plain object, NOT an array** |
| Update | `{ projectName, serviceName, index: number, values: { ... } }` — use `index` from the list position |
| Delete | `{ projectName, serviceName, index: number }` |

> ⚠️ The `values` field name is misleading. It holds a single item as an object, not a collection.

---

## Debugging API Calls

### Rule: Write responses to file, read with `view_file`

Terminal output from PowerShell is truncated when piped through the tool layer. Use this pattern instead:

```powershell
$r = Invoke-WebRequest $url -Method POST -Headers $h -Body $body -SkipHttpErrorCheck
$r.Content | Set-Content debug-output.json
# Then use view_file("debug-output.json") to read the full response
```

### Rule: Always use `-SkipHttpErrorCheck`

Without it, non-2xx responses throw exceptions and the response body is lost. Always use `-SkipHttpErrorCheck` and check `$r.StatusCode` manually.

### Rule: Distinguish gateway errors from upstream errors

Two different shapes come back from the API:

```json
// Our own Zod schema rejected the request (never reached Easypanel):
{ "success": false, "error": { "name": "ZodError", "message": "..." } }

// Easypanel's tRPC rejected our payload:
{ "error": "tRPC call failed: some.procedure", "upstream": { "error": { ... } } }
```

The `zodErrors` field inside `upstream` gives the exact field path that failed.

### Rule: Probe multiple payload variants in one script run

When the correct payload shape is unknown, send all plausible variants in one batch and check which returns 2xx:

```powershell
Probe "variant-a" POST $url @{ published=9090; target=80 }
Probe "variant-b" POST $url @{ values=@{ published=9090; target=80 } }
Probe "variant-c" POST $url @{ values=@(@{ published=9090; target=80 }) }
# Read probe-output.json to find which returned 201
```

### Rule: Avoid single-char function names in PowerShell

`R`, `F`, etc. silently conflict with built-in aliases (`R` = `Invoke-History`). Use at least 3 chars: `Req`, `Fetch`, `Call`.

### Rule: Add a short sleep after create before querying

Easypanel's state may not be immediately queryable after a write. Add `Start-Sleep -Seconds 1` between `POST` and a subsequent `GET` in test scripts.

---

## Error Handler (`src/lib/errors.ts`)

- `TrpcCallError` → logs upstream error, returns structured JSON
- `ZodError` → returns `{ error: "Validation failed", details: [...] }`
- Unknown → 500 fallback

> ⚠️ `err.details` is a sliced string (max 500 chars). Always wrap `JSON.parse(err.details)` in try/catch — it may be truncated mid-JSON for large upstream errors.

---

## Deploy & Test Workflow

See `.agent/workflows/`:
- `/deploy-vps` — fresh VPS setup
- `/update-gateway` — redeploy after Easypanel version upgrade

To validate resource routes against a live deployment:

```powershell
# Probe script (discovers payload shape)
./probe-ports-mounts.ps1
view_file probe-output.json   # read full results

# Full CRUD lifecycle test
./run-final-validation.ps1
view_file final-validation.json
```

---

## What NOT to Do

- ❌ Do not use `callTrpc` directly with a flat body — always check the tRPC procedure's expected shape first
- ❌ Do not assume `values: [array]` for any Easypanel CRUD procedure — verify it
- ❌ Do not read PowerShell terminal output for API diagnosis — it truncates; write to file
- ❌ Do not leave `host` as optional in any update schema unless Easypanel explicitly allows partial updates (it generally does not)
