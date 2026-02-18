# easypanel-api

> REST API gateway for [Easypanel](https://easypanel.io) — translates public REST calls into Easypanel's internal tRPC API.

Built by reverse-engineering the real tRPC procedures from Easypanel v2.26.3.

## Features

- **90 REST endpoints** covering projects, app/compose/database services, domains, ports, mounts, templates, and monitoring
- **OpenAPI 3.1 spec** with Swagger UI at `/docs`
- **Session-based auth** — login with your Easypanel admin credentials, get a Bearer token
- **Docker-ready** — deploy as a service inside Easypanel itself

## Quick Start

### Run Locally

```bash
npm install
npm run dev     # → http://localhost:3100/docs
```

Set `EASYPANEL_URL` to point at your Easypanel instance:

```bash
EASYPANEL_URL=http://your-server:3000 npm run dev
```

### Deploy Inside Easypanel (recommended)

1. Create a project in Easypanel (e.g. `infra`)
2. Add an **App** service → set source to this Git repo
3. Set build type to **Dockerfile**
4. Add env variable: `EASYPANEL_URL=http://easypanel:3000`
5. Add a domain (e.g. `api.yourdomain.com`)
6. Deploy

The `EASYPANEL_URL` defaults to `http://easypanel:3000` which works when running inside Easypanel's Docker network.

## Authentication

Easypanel does not have an API tokens page. This gateway provides a login endpoint:

```bash
# 1. Login to get a token
curl -X POST http://localhost:3100/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
# → {"token": "eyJhb...", "message": "Login successful"}

# 2. Use the token for all API calls
curl -H "Authorization: Bearer eyJhb..." \
     http://localhost:3100/api/v1/projects

# 3. (Optional) Generate a long-lived API token
curl -X POST http://localhost:3100/auth/api-token \
  -H "Authorization: Bearer eyJhb..."
```

## API Overview

| Tag | Endpoints | Description |
|-----|-----------|-------------|
| Auth | 3 | Login, token generation, validation |
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

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Gateway listen port |
| `EASYPANEL_URL` | `http://localhost:3000` | Easypanel instance URL |

## Tech Stack

- [Hono](https://hono.dev) — web framework
- [@hono/zod-openapi](https://github.com/honojs/hono) — OpenAPI schema generation
- [Swagger UI](https://swagger.io/tools/swagger-ui/) — interactive docs
- TypeScript, Node.js 20+

## License

MIT
