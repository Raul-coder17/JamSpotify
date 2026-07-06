# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + backend + frontend)
npm run install-all

# Development (backend :3000 + frontend :5173 concurrently)
npm run dev

# Individual services
npm run dev:backend    # nodemon server.js
npm run dev:frontend   # vite dev server

# Production build + serve
npm run build          # compiles frontend/dist/
npm start              # node backend/server.js (serves API + static frontend)

# Lint frontend
npm run lint --prefix frontend
```

There are no automated tests. The `backend/.env` file is required to run locally — copy from `backend/.env.example` and fill in Spotify credentials.

## Architecture

### Monorepo layout

```
/                   → root package.json (dev orchestrator via concurrently)
backend/            → Express API (Node.js, CommonJS)
  server.js         → all routes, room state, Spotify polling logic
  db.js             → PostgreSQL helpers + AES-256-CBC token encryption
frontend/           → React 19 + Vite (ES modules)
  src/App.jsx       → entire frontend in a single component (~2500 lines)
  src/App.css       → all styles
```

### Multi-tenant room model

Each "room" is a UUID-keyed entry in a `Map<roomId, RoomState>` in server.js memory. `RoomState` has two layers:

- **Persisted fields** (written to PostgreSQL via `db.js`): `hostToken`, `accessToken`, `refreshToken`, `expiresAt`, `jamQueue`, `jamHistory`, `pendingGuests`, `guestTokens`
- **Runtime-only fields** (lost on restart): `currentTrackState`, `cachedSpotifyPlayback`, `spotifyFetchPromise`, `lastForcedUri`, `activeUsers`

`persistRoom(roomId)` is fire-and-forget (`.catch()` only). It's called after any mutation that should survive a server restart.

When a request arrives for a `roomId` not in the Map, `roomMiddleware` loads it from PostgreSQL. If the DB is unreachable or `DATABASE_URL` is absent, state lives in memory only.

### Authentication

**Host**: Spotify OAuth via `/api/auth/login` → `/api/callback`. On success:
- Production: sets `httpOnly` cookie `jam_host_token`, redirects to `/?roomId=...`
- Development: redirects with token in URL hash `#host_token=...` (known security gap — see REPORTE_TECNICO)

`isHostRequest(req)` checks `req.cookies.jam_host_token` or `req.headers['x-host-token']` against `room.hostToken`.

**Guest**: `POST /guest/join` creates a `guestToken` and sets status to `pending`. Host approves via `POST /guest/approve`. Approved guests pass `x-guest-token` header; verified by `verifyGuestToken(req, name)`.

### Spotify playback polling

Frontend polls `GET /api/rooms/:roomId/playback` every ~1.5s. The backend deduplicates Spotify API calls using a shared promise per room (`room.spotifyFetchPromise`): regardless of how many clients poll, only one real Spotify request fires per 1.5s per room.

The poll handler inside `server.js` handles:
1. Track change detection → history push, queue advance
2. Queue deviation detection → force redirect via `PUT /me/player/play`
3. Status 204 (nothing playing) → auto-start next queued track
4. `lastForcedUri` guards against re-detecting an intentional skip as a deviation

### Token encryption (`db.js`)

`encryptToken`/`decryptToken` use AES-256-CBC with a random 16-byte IV prepended as hex, separated by `:`. The key comes from `TOKEN_ENCRYPTION_KEY` (32 hex bytes). If the env var is absent, tokens are stored in plaintext and a `console.warn` fires.

### Frontend structure

`App.jsx` is a single React component with all state, all API calls, and all UI. There are no sub-components and no external UI libraries — all icons are inline SVGs in the `Icons` object at the top of the file. `hostToken` is read from `localStorage.jam_host_token`; `guestToken` from `sessionStorage.jam_guest_token`.

### Required environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Must match Dashboard exactly |
| `DATABASE_URL` | PostgreSQL connection string (optional — memory-only if absent) |
| `TOKEN_ENCRYPTION_KEY` | 32 hex bytes (`openssl rand -hex 32`) — tokens stored plaintext if absent |
| `FRONTEND_URL` | Used for CORS origin in production (e.g. `https://jamspotify.onrender.com`) |
| `NODE_ENV` | Set to `production` on Render |
