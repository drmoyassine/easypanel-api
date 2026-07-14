# easypanel-api

> REST API gateway for [Easypanel](https://easypanel.io) — translates public REST calls into Easypanel's internal tRPC API.

Built by reverse-engineering the real tRPC procedures from Easypanel v2.26.3.

## Features

- **88 REST endpoints** covering projects, app/compose/database services, domains, ports, mounts, templates, and monitoring
- **OpenAPI 3.1 spec** with Swagger UI at `/docs`
- **Auto-authentication** — gateway logs into Easypanel on startup, manages its own session
- **API_SECRET protection** — external callers use a simple secret, never touch Easypanel credentials
- **Docker-ready** — deploy as a service inside Easypanel itself

## Quick Start

### Run Locally

```bash
npm install

# Set your Easypanel credentials
export EASYPANEL_URL=http://your-server:3000
export EASYPANEL_EMAIL=admin@example.com
export EASYPANEL_PASSWORD=your-password
export API_SECRET=my-secret-key    # optional, omit for dev mode

npm run dev     # → http://localhost:3100/docs
```

### Deploy Inside Easypanel (recommended)

1. Create a project in Easypanel (e.g. `infra`)
2. Add an **App** service → set source to this Git repo
3. Set build type to **Dockerfile**
4. Add environment variables:
   ```
   EASYPANEL_URL=http://easypanel:3000
   EASYPANEL_EMAIL=admin@example.com
   EASYPANEL_PASSWORD=your-password
   API_SECRET=generate-a-strong-secret-here
   ```
5. Add a domain (e.g. `api.yourdomain.com`)
6. Deploy

The `EASYPANEL_URL` defaults to `http://easypanel:3000` which works when running inside Easypanel's Docker network.

## Authentication

The gateway handles Easypanel auth internally. External callers just pass `API_SECRET`:

```bash
# If API_SECRET is set, all /api/v1/* endpoints require it:
curl -H "Authorization: Bearer my-secret-key" \
     http://localhost:3100/api/v1/projects

# If API_SECRET is not set, endpoints are unprotected (dev mode)
curl http://localhost:3100/api/v1/projects

# Check Easypanel connection status (always public)
curl http://localhost:3100/auth/status
```

## API Overview

| Tag | Endpoints | Description |
|-----|-----------|-------------|
| Auth | 1 | Connection status check |
| Projects | 6 | CRUD, env vars, containers |
| App Services | 17 | CRUD, deploy, source, build, env, resources |
| Compose | 9 | CRUD, deploy, inline/git source |
| MySQL | 8 | CRUD, enable/disable, credentials |
| Postgres | 8 | Same as MySQL |
| MariaDB | 8 | Same as MySQL |
| Mongo | 8 | Same as MySQL |
| Redis | 8 | Same as MySQL |
| Domains | 5 | CRUD, set primary |
| Ports | 4 | CRUD |
| Mounts | 4 | CRUD |
| Templates | 1 | Deploy from template |
| Monitor | 3 | System, storage, service stats |
| Observability | 12 | Containers, processes, bounded logs, health, memory trends, alerts, PostgreSQL, Redis/BullMQ |

Full interactive docs: **`http://localhost:3100/docs`**

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `3100` | No | Gateway listen port |
| `EASYPANEL_URL` | `http://localhost:3000` | No | Easypanel instance URL |
| `EASYPANEL_EMAIL` | — | **Yes** | Admin email for Easypanel login |
| `EASYPANEL_PASSWORD` | — | **Yes** | Admin password for Easypanel login |
| `API_SECRET` | — | No | Secret for external API auth (omit for dev mode) |
| `OBSERVABILITY_ENABLED` | `true` | No | Enables the bounded background runtime sampler |
| `DOCKER_API_URL` | — | Recommended | Private URL of a restricted Docker socket proxy |
| `DOCKER_SOCKET_PATH` | `/var/run/docker.sock` | Fallback | Direct Docker socket path; grants powerful host access |
| `OBSERVABILITY_SAMPLE_INTERVAL_SECONDS` | `60` | No | Sampling interval, bounded to 30–3600 seconds |
| `OBSERVABILITY_MAX_POINTS` | `1440` | No | In-memory points retained per container |

## Production observability

The authenticated `/api/v1/observability/*` routes provide bounded, read-only diagnostics for
containers, processes, health, redacted logs, working-set/file-cache trends, alerts, PostgreSQL,
Redis, and explicitly named BullMQ queues. They never expose arbitrary shell execution, container
restart, deletion, or unbounded log/key scans.
Unlike the gateway's other development endpoints, observability refuses to start without
`API_SECRET`; anonymous Docker diagnostics are never permitted.

Prefer a restricted Docker socket proxy on the private application network and set
`DOCKER_API_URL=http://docker-socket-proxy:2375`. Enable only the Docker API families required by
these routes: `PING`, `INFO`, `CONTAINERS`, and `EXEC` (the last is needed only for PostgreSQL and
Redis diagnostics). If database diagnostics are not required, keep `EXEC` disabled. Do not publish
the proxy port publicly.

Directly mounting `/var/run/docker.sock` is supported as a fallback, but even a read-only socket
mount provides host-level Docker control to the bridge process. Keep `API_SECRET` configured,
restrict network access to the bridge, and never expose the Docker socket or proxy publicly.

Trend samples are intentionally kept in bounded process memory and reset when this bridge is
redeployed. Durable monitoring history and alert delivery belong in a dedicated metrics system;
this suite is for safe live inspection and short-window diagnosis.

## Tech Stack

- [Hono](https://hono.dev) — web framework
- [@hono/zod-openapi](https://github.com/honojs/hono) — OpenAPI schema generation
- [Swagger UI](https://swagger.io/tools/swagger-ui/) — interactive docs
- TypeScript, Node.js 20+

## License

MIT
