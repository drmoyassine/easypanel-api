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
Keep these credentials, you'll use them to authenticate with the API gateway.

---

## Step 2 — Install Node.js

```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## Step 3 — Upload easypanel-api

**Option A** — scp from your local machine:
```bash
# From your LOCAL machine:
scp -r ./easypanel-api root@<YOUR_VPS_IP>:/opt/easypanel-api
```

**Option B** — git clone (if you've pushed to a repo):
```bash
cd /opt
sudo git clone <YOUR_REPO_URL> easypanel-api
```

Then on the VPS:
```bash
cd /opt/easypanel-api
npm install
npx tsc     # compile src/ → dist/
```

---

## Step 4 — Create a systemd service

```bash
sudo tee /etc/systemd/system/easypanel-api.service > /dev/null << 'EOF'
[Unit]
Description=Easypanel API Gateway
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=/opt/easypanel-api
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

# Environment
Environment=PORT=3100
Environment=EASYPANEL_URL=http://localhost:3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable easypanel-api
sudo systemctl start easypanel-api

# Verify it's running
sudo systemctl status easypanel-api
sudo journalctl -u easypanel-api -f
```

---

## Step 5 — Authenticate

Easypanel does NOT have an API tokens page. Instead, the gateway provides
a login endpoint that extracts the session token for you.

### 5a. Get your token

```bash
curl -X POST http://localhost:3100/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-admin@email.com", "password": "your-password"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Login successful"
}
```

Save that token — use it as `Authorization: Bearer <token>` for all API calls.

### 5b. (Optional) Generate a long-lived API token

```bash
curl -X POST http://localhost:3100/auth/api-token \
  -H "Authorization: Bearer <token-from-step-5a>"
```

This calls `users.generateApiToken` internally. The returned token won't expire
like the session token does.

---

## Step 6 — Test it

```bash
# Health check (no auth)
curl http://localhost:3100/health

# List projects
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
     http://localhost:3100/api/v1/projects

# Create a project
curl -X POST http://localhost:3100/api/v1/projects \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-project"}'
```

Swagger docs: `http://<YOUR_VPS_IP>:3100/docs`

---

## Step 7 — Security (production)

The gateway has no rate limiting or IP restrictions by default. Lock down port 3100:

```bash
# Only allow your backend server(s) to reach the API
sudo ufw allow from <BACKEND_IP> to any port 3100

# Or block public access entirely (if calling from localhost only)
sudo ufw deny 3100
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Ubuntu 24.04 VPS                                │
│                                                   │
│  ┌──────────────┐     ┌─────────────────────┐    │
│  │ Easypanel    │     │ easypanel-api        │    │
│  │ (Docker)     │◄────│ (Node.js, port 3100) │    │
│  │ port 3000    │     │                      │    │
│  │ tRPC internal│     │ REST → tRPC gateway  │    │
│  └──────────────┘     └─────────────────────┘    │
│        │                       ▲                  │
│        ▼                       │                  │
│  ┌──────────────┐    Your backend (frontbase.dev) │
│  │ Traefik      │    calls POST /auth/login once  │
│  │ port 443/80  │    then uses Bearer token       │
│  └──────────────┘                                 │
└─────────────────────────────────────────────────┘
```
