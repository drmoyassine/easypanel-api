---
description: Deploy Easypanel + easypanel-api gateway on a fresh Ubuntu 24.04 LTS VPS
---

# VPS Deployment Guide

## Prerequisites
- Fresh Ubuntu 24.04 LTS VPS (minimum 2GB RAM, 2 vCPU recommended)
- Root / sudo access via SSH
- A domain pointed to the VPS IP (optional but recommended)

---

## Step 1 — Install Easypanel

SSH into your VPS and run Easypanel's official installer:

```bash
curl -sSL https://get.easypanel.io | sh
```

This installs Docker + Easypanel. After ~2 minutes, visit:

```
http://<YOUR_VPS_IP>:3000
```

Complete the setup wizard — create your admin **email** and **password**.

---

## Step 2 — Deploy the API Gateway inside Easypanel

1. In Easypanel UI, create a new **Project** (e.g. `infra`)
2. Inside the project, click **+ New Service → App**
3. Name it `api-gateway`
4. Under **Source**, choose **GitHub** and select `drmoyassine/easypanel-api`
5. Under **Build**, set type to **Dockerfile**
6. Under **Environment**, add:
   ```
   EASYPANEL_URL=http://easypanel:3000
   PORT=3100
   ```
7. Under **Domains**, add your domain (e.g. `api.yourdomain.com`)
   - Or use the generated Easypanel subdomain for testing
8. Click **Deploy**

That's it! Easypanel builds the Docker image, runs it, and configures SSL automatically.

---

## Step 3 — Authenticate

```bash
# Login with your Easypanel admin credentials
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your-password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Login successful"
}
```

Use this token as `Authorization: Bearer <token>` for all API calls.

---

## Step 4 — Test

```bash
TOKEN="eyJhb..."

# Health check
curl https://api.yourdomain.com/health

# List projects
curl -H "Authorization: Bearer $TOKEN" \
     https://api.yourdomain.com/api/v1/projects

# Create a project
curl -X POST https://api.yourdomain.com/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-project"}'
```

Swagger docs: `https://api.yourdomain.com/docs`

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Ubuntu 24.04 VPS                                │
│                                                   │
│  ┌─────────────────────────────────────────┐     │
│  │          Easypanel (Docker)              │     │
│  │                                          │     │
│  │  ┌──────────────┐  ┌────────────────┐   │     │
│  │  │ easypanel    │  │ api-gateway    │   │     │
│  │  │ (tRPC :3000) │◄─│ (REST :3100)   │   │     │
│  │  └──────────────┘  └────────────────┘   │     │
│  │                                          │     │
│  │  ┌──────────────┐                       │     │
│  │  │ Traefik      │  ← SSL + routing      │     │
│  │  │ :443 / :80   │                       │     │
│  │  └──────────────┘                       │     │
│  └─────────────────────────────────────────┘     │
│                         ▲                         │
│                         │                         │
│              Your backend (frontbase.dev)          │
│              calls https://api.yourdomain.com      │
└─────────────────────────────────────────────────┘
```
