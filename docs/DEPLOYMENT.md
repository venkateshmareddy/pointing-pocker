# Deployment Guide

Complete guide to deploy Pointing Poker: **Cloudflare Workers** (realtime backend) + **Vercel** (frontend).

> Stuck on “Connecting to room…” after PartyKit shut down?  
> Read the short beginner guide first: [GETTING_BACK_ONLINE.md](./GETTING_BACK_ONLINE.md)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Configuration](#2-project-configuration)
3. [Deploy the Backend (Cloudflare / PartyServer)](#3-deploy-the-backend-cloudflare--partyserver)
4. [Deploy the Frontend (Vercel)](#4-deploy-the-frontend-vercel)
5. [Connect Frontend to Backend](#5-connect-frontend-to-backend)
6. [Custom Domain Setup](#6-custom-domain-setup)
7. [Verify the Deployment](#7-verify-the-deployment)
8. [Updating & Redeploying](#8-updating--redeploying)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | Bundled with Node.js |
| Cloudflare account | Free | https://dash.cloudflare.com/sign-up |
| Vercel account | Free | https://vercel.com |
| GitHub account | Optional | https://github.com |

---

## 2. Project Configuration

### 2.1 Install dependencies

```bash
cd pointing-pocker-project
npm install
```

### 2.2 Backend config

`server/wrangler.jsonc` defines the Worker name and Durable Object binding (`Main` → `/parties/main/<room>`).

### 2.3 Client env files

**Local** — `client/.env.local`:

```env
VITE_PARTYKIT_HOST=127.0.0.1:1999
```

**Production** — `client/.env.production` (and/or Vercel env var):

```env
VITE_PARTYKIT_HOST=pointing-poker.<your-subdomain>.workers.dev
```

No `https://`, no trailing slash.

---

## 3. Deploy the Backend (Cloudflare / PartyServer)

### 3.1 Log in to Cloudflare

```bash
npx wrangler login
```

Authorize in the browser.

### 3.2 Deploy

```bash
npm run deploy:server
```

Expected output includes a URL like:

```
https://pointing-poker.<your-subdomain>.workers.dev
```

Copy the **host** (without `https://`) for the next steps.

### 3.3 Smoke-test WebSocket

```bash
npx wscat -c "wss://pointing-poker.<your-subdomain>.workers.dev/parties/main/test-room"
```

Connection should open without errors.

---

## 4. Deploy the Frontend (Vercel)

### Option A: GitHub → Vercel (recommended)

1. Push this repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → import the repo
3. Settings at **project root**:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `.` |
| Build Command | `npm run build -w client` |
| Output Directory | `client/dist` |
| Install Command | `npm install` |

4. Environment variable:

| Name | Value |
|---|---|
| `VITE_PARTYKIT_HOST` | `pointing-poker.<your-subdomain>.workers.dev` |

5. Deploy

### Option B: Vercel CLI

```bash
cd client
npx vercel login
npx vercel --prod
```

Add `VITE_PARTYKIT_HOST` in the dashboard (or `vercel env add`), then redeploy.

---

## 5. Connect Frontend to Backend

Vite **bakes** `VITE_PARTYKIT_HOST` into the JS bundle at build time.

After changing the env var in Vercel you **must Redeploy**.

| Environment | Where | Value |
|---|---|---|
| Local | `client/.env.local` | `127.0.0.1:1999` |
| Production | Vercel env + rebuild | `pointing-poker.<subdomain>.workers.dev` |

---

## 6. Custom Domain Setup

### Frontend (Vercel)

Project → **Settings** → **Domains** → add domain → follow DNS instructions.

### Backend (Cloudflare Workers)

Workers & Pages → your worker → **Settings** → **Domains & Routes** → add a custom domain (e.g. `ws.yourdomain.com`), then set `VITE_PARTYKIT_HOST` to that host and redeploy Vercel.

---

## 7. Verify the Deployment

- [ ] Landing page loads on Vercel
- [ ] Create session → join works (no endless Connecting)
- [ ] Second tab joins and sees the other participant
- [ ] Vote / Reveal / Clear sync
- [ ] DevTools → Network → WS shows `*.workers.dev` (or your custom WS domain)

---

## 8. Updating & Redeploying

**Frontend:** push to `main` (if GitHub-connected) or `npx vercel --prod` from `client/`.

**Backend:**

```bash
npm run deploy:server
```

**Env var change on Vercel:** edit variable → **Redeploy**.

---

## 9. Troubleshooting

### Stuck on “Connecting to room…”

1. Is `VITE_PARTYKIT_HOST` the **workers.dev** host (not old `partykit.dev`)?
2. Did you redeploy Vercel after changing the env var?
3. Is the worker deployed? `npm run deploy:server`
4. DevTools → Network → WS for errors

### `wrangler login` / deploy fails

Run `npx wrangler login` again. Use a personal Cloudflare account on the free plan.

### Vercel “Cannot find module '@pointing-poker/shared'”

Root Directory must be `.` (monorepo root), not `client/`.

### Old PartyKit host

`*.partykit.dev` was shut down Oct 23, 2026. Migrate to PartyServer on Cloudflare (this repo already uses PartyServer).

---

## Quick Reference

```bash
npm install                 # from repo root
npm run dev                 # client :5173 + server :1999
npm run deploy:server       # Cloudflare Worker
npm run build               # client production build
```
