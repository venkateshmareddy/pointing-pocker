# Pointing Poker

A free, real-time Planning Poker app for agile teams. No login required. No ads. No cost.

Built with **React + TypeScript + PartyServer (Cloudflare Durable Objects) + Vercel**.

---

## What It Does

Pointing Poker lets distributed agile teams estimate story points together in real time:

- Create a session and share the link
- Team members join and pick a card face-down
- The moderator reveals all votes simultaneously
- See stats — average, min, max, mode, and consensus

No sign-up. Works on mobile. Zero latency via Cloudflare edge.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Animations | Framer Motion |
| Real-time | PartyServer (Cloudflare Durable Objects) |
| WebSocket client | PartySocket (auto-reconnect) |
| Routing | React Router v6 |
| Icons | Lucide React |
| Hosting (frontend) | Vercel |
| Hosting (backend) | Cloudflare Workers |

---

## Project Structure

This is an **npm workspaces monorepo**. One `npm install` at root sets up everything.

```
pointing-pocker-project/
├── package.json          # Root — workspaces, unified scripts
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components (Card, Deck, Timer, etc.)
│   │   ├── pages/        # Landing and SessionRoom pages
│   │   ├── hooks/        # usePartySocket, useRoomState, useTimer
│   │   ├── lib/          # decks, stats, roomCode utilities
│   │   └── types/        # Frontend-only type extensions
│   ├── vite.config.ts
│   └── package.json
│
├── server/               # PartyServer WebSocket server (Cloudflare Worker)
│   ├── src/
│   │   └── index.ts      # Room logic, message routing
│   ├── wrangler.jsonc    # Cloudflare Workers config
│   └── package.json
│
├── shared/               # Shared types (@pointing-poker/shared)
│   ├── types.ts
│   └── package.json
│
├── docs/
│   ├── GETTING_BACK_ONLINE.md  # Beginner: restore after PartyKit shutdown
│   └── DEPLOYMENT.md           # Full deployment and configuration guide
└── README.md
```

---

## Card Decks

| Deck | Values |
|---|---|
| Fibonacci | 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 |
| Modified Fibonacci | 0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100 |
| T-Shirt Sizes | XS, S, M, L, XL, XXL |
| Powers of 2 | 0, 1, 2, 4, 8, 16, 32, 64 |

All decks include special cards: ☕ (break), ❓ (unsure), ♾️ (too big)

---

## Features

- Real-time voting with simultaneous reveal
- Vote stats: average, min, max, mode, consensus indicator
- Story/ticket title input
- Countdown timer for discussions
- Moderator controls (reveal, clear, kick participants)
- Spectator mode
- Auto-reassign moderator on disconnect
- Reconnect support (name saved in localStorage)
- Dark theme, mobile responsive
- No database, no auth — state lives in Cloudflare Durable Objects

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
npm install
```

This installs all workspaces (client, server, shared) at once.

### 2. Start development servers

```bash
npm run dev
```

This single command starts **both** the Vite client (`http://localhost:5173`) and the PartyServer worker (`http://localhost:1999`) in parallel, with color-coded output.

### 3. Open the app

Visit [http://localhost:5173](http://localhost:5173) — create a session and start pointing.

---

## Environment Variables

### Client (`client/.env.local`)

```env
VITE_PARTYKIT_HOST=127.0.0.1:1999
```

For production this is set to your deployed Cloudflare Workers host (e.g. `pointing-poker.your-subdomain.workers.dev`).

### Server

No environment variables required. Cloudflare Workers config lives in `server/wrangler.jsonc`.

---

## Deployment

**New here / site stuck on “Connecting…”?** Start with [docs/GETTING_BACK_ONLINE.md](docs/GETTING_BACK_ONLINE.md).

Full guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Cloudflare Workers backend, Vercel frontend, env vars, custom domains.

---

## Architecture

```
Browser (React App)
       │
       │  WebSocket (PartySocket)
       ▼
PartyServer (Cloudflare Worker)
  ┌────────────────────────────┐
  │  Durable Object per room   │
  │  - stores room state       │
  │  - broadcasts to all peers │
  └────────────────────────────┘
       │
       │  Real-time sync
       ▼
Other Participants' Browsers
```

Room configuration is persisted in each room’s Durable Object storage, while live participant connections and votes remain transient. Timers use Durable Object alarms, so their deadlines survive an instance restart. No external database is required.

---

## Free Tier Capacity

| Service | Limit | Estimated Usage (80 sessions/month) |
|---|---|---|
| Cloudflare Workers | Free plan limits | Well within typical use |
| Vercel bandwidth | 100 GB/month | ~640 MB (<1%) |
| Durable Object storage | Free plan included | ~10-20 MB typical |

**Total monthly cost: $0**

---

## Scripts Reference

All commands run from the **project root**:

| Command | Description |
|---|---|
| `npm run dev` | Start both client (:5173) and server (:1999) in parallel |
| `npm run build` | Production build of client |
| `npm run deploy` | Deploy server to Cloudflare + build client |
| `npm run deploy:server` | Deploy PartyServer worker only |
| `npm run deploy:client` | Build client only |
| `npm run preview` | Serve production build locally |
| `npm run clean` | Remove all node_modules and dist |
| `npm run dev -w client` | Start only Vite dev server |
| `npm run dev -w server` | Start only PartyServer (`wrangler dev`) |

---

## License

MIT
