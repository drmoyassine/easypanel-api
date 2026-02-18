---
description: Update easypanel-api gateway after an Easypanel version upgrade
---

# Easypanel API Gateway — Update Protocol

Run this protocol **before** updating Easypanel on your VPS to ensure the gateway stays compatible.

---

## 1. Check Current Easypanel Version

```bash
# SSH into VPS
ssh root@your-vps-ip

# Check running version
docker inspect easypanel | grep -i version
```

Note the current version (e.g. `2.26.3`).

---

## 2. Pull the New Easypanel Image (don't install yet)

```bash
docker pull easypanel/easypanel:latest
```

---

## 3. Extract & Diff tRPC Procedures

// turbo
```bash
# Start a temp container from the new image
docker run --rm -d --name ep-inspect easypanel/easypanel:latest sleep 300
```

// turbo
```bash
# Extract the tRPC router to find all procedures
docker exec ep-inspect find /app/server -name "*.js" | head -50
```

// turbo
```bash
# Search for procedure registrations
docker exec ep-inspect grep -r "mutation\|query" /app/server/routers/ --include="*.js" -l
```

```bash
# For each router file, extract procedure names:
docker exec ep-inspect cat /app/server/routers/projects.js | grep -E "\.mutation|\.query" 
docker exec ep-inspect cat /app/server/routers/services/app.js | grep -E "\.mutation|\.query"
# Repeat for: compose, mysql, postgres, mariadb, mongo, redis, domains, ports, mounts, templates, monitor, auth
```

Compare the extracted procedures against the current gateway's routes in `src/routes/`.

**What to look for:**
- Renamed procedures → update `callTrpc("old.name")` to new name
- Removed procedures → remove or deprecate the corresponding endpoint
- New procedures → add new endpoints if useful
- Changed input schemas → update Zod schemas in `src/schemas/`

// turbo
```bash
# Clean up
docker stop ep-inspect
```

---

## 4. Update Gateway Code

For each change found in step 3:

1. **Update schemas** in `src/schemas/` — match the new input/output shapes
2. **Update routes** in `src/routes/` — fix procedure names, add/remove endpoints
3. **Update version** in `package.json` and `src/index.ts` (OpenAPI info.version)
4. **Run type check**: `npx tsc --noEmit`

---

## 5. Test Locally (optional but recommended)

```bash
# Set env vars pointing to the OLD (still running) Easypanel
export EASYPANEL_URL=https://admin.frontbase.dev
export EASYPANEL_EMAIL=your-email
export EASYPANEL_PASSWORD=your-password

npm run dev
```

Test key endpoints:
```bash
curl http://localhost:3100/health
curl http://localhost:3100/auth/status
curl http://localhost:3100/api/v1/projects
```

---

## 6. Push Gateway Update

```bash
git add -A
git commit -m "feat: update for Easypanel vX.Y.Z"
git push origin master
```

---

## 7. Update Easypanel on VPS

```bash
ssh root@your-vps-ip
curl -sSL https://get.easypanel.io | sh
```

---

## 8. Redeploy Gateway in Easypanel

In Easypanel UI:
1. Go to the `management` project → `easypanel-api` service
2. Click **Deploy** (it will pull the latest code and rebuild)
3. Check logs for `[auth] ✓ Authenticated with Easypanel`

---

## 9. Verify

```bash
# Health check
curl https://your-api-domain/health

# Auth status
curl https://your-api-domain/auth/status

# List projects (replace SECRET with your API_SECRET)
curl -H "Authorization: Bearer SECRET" https://your-api-domain/api/v1/projects
```

---

## Quick Reference: Gateway File Structure

| File | Purpose |
|------|---------|
| `src/schemas/` | Zod input schemas — must match tRPC input shapes |
| `src/routes/projects.ts` | Project CRUD endpoints |
| `src/routes/services-app.ts` | App service endpoints (17 routes) |
| `src/routes/services-db.ts` | DB service endpoints (MySQL/PG/Maria/Mongo/Redis) |
| `src/routes/compose.ts` | Compose service endpoints |
| `src/routes/resources.ts` | Domains, ports, mounts |
| `src/routes/extras.ts` | Templates, monitor |
| `src/lib/trpc-client.ts` | Raw tRPC HTTP client |
| `src/lib/token-manager.ts` | Auto-login + token cache |
