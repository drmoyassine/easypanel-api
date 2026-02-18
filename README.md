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

Full interactive docs: **`http://localhost:3100/docs`**

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `3100` | No | Gateway listen port |
| `EASYPANEL_URL` | `http://localhost:3000` | No | Easypanel instance URL |
| `EASYPANEL_EMAIL` | — | **Yes** | Admin email for Easypanel login |
| `EASYPANEL_PASSWORD` | — | **Yes** | Admin password for Easypanel login |
| `API_SECRET` | — | No | Secret for external API auth (omit for dev mode) |

## Tech Stack

- [Hono](https://hono.dev) — web framework
- [@hono/zod-openapi](https://github.com/honojs/hono) — OpenAPI schema generation
- [Swagger UI](https://swagger.io/tools/swagger-ui/) — interactive docs
- TypeScript, Node.js 20+

## License

MIT
