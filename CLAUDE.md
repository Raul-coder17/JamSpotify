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
  src/App.jsx       → entire frontend in a single component (~1650 lines)
  src/index.css     → design system: theme tokens (:root + [data-theme="light"]), keyframes, all component styles
  src/App.css       → legacy Vite boilerplate (largely unused)
```

### Multi-tenant room model

Each "room" is a UUID-keyed entry in a `Map<roomId, RoomState>` in server.js memory. `RoomState` has two layers:

- **Persisted fields** (written to PostgreSQL via `db.js`): `hostToken`, `accessToken`, `refreshToken`, `expiresAt`, `jamQueue`, `jamHistory`, `pendingGuests`, `guestTokens`
- **Runtime-only fields** (lost on restart): `currentTrackState`, `cachedSpotifyPlayback`, `spotifyFetchPromise`, `lastForcedUri`, `activeUsers`

`persistRoom(roomId)` is fire-and-forget (`.catch()` only). It's called after any mutation that should survive a server restart.

When a request arrives for a `roomId` not in the Map, `roomMiddleware` loads it from PostgreSQL. If the DB is unreachable or `DATABASE_URL` is absent, state lives in memory only.

### Authentication

**Host**: Spotify OAuth via `/api/auth/login` → `/api/callback`. On success:
- Production (`NODE_ENV=production`): sets `httpOnly` cookie `jam_host_token`, redirects to `/?roomId=...` (same origin).
- Development: redirects to `http://localhost:5173/?roomId=...#host_token=<token>`. The frontend reads the token from the URL hash, saves it to `localStorage.jam_host_token`, then strips the hash. This is origin-independent on purpose: the OAuth `redirect_uri` is `127.0.0.1:3000` while Vite serves `localhost:5173`, so a cookie set on the callback response would NOT be visible to the frontend (different host). Known security gap: token passes through URL/history — see REPORTE_TECNICO.

`isHostRequest(req)` checks `req.cookies.jam_host_token` OR `req.headers['x-host-token']` against `room.hostToken`.

> **Dev gotcha:** there is no host cookie in development, so **every** host-authenticated request (routes behind `hostAuthMiddleware`) MUST send the `X-Host-Token` header (value = `localStorage.jam_host_token`). Omitting it works in production (cookie is auto-sent) but returns **403** in dev. When adding a new host-auth `fetch` in `App.jsx`, include `headers: { 'X-Host-Token': hostToken }`.

**Guest**: `POST /guest/join` creates a `guestToken` and sets status to `pending`. Host approves via `POST /guest/approve`. Approved guests pass `x-guest-token` header; verified by `verifyGuestToken(req, name)`.

### Local development gotchas

These bit us during development — keep them in mind:

- **`SPOTIFY_REDIRECT_URI` must be `http://127.0.0.1:3000/api/callback`, not `localhost`.** Spotify no longer allows `localhost` for loopback redirect URIs. Because of this, the dev callback runs on `127.0.0.1:3000` but returns the host token to `localhost:5173` via the URL hash (a cookie can't cross the `127.0.0.1`↔`localhost` origin boundary).
- **Host-auth requests need the `X-Host-Token` header in dev** (see the gotcha above). A missing header = silent-OK in production (cookie) but **403** in dev.
- **`EADDRINUSE` on :3000** = a stale `node server.js` still holds the port. Find & kill it: `netstat -ano | findstr :3000` then `taskkill /F /PID <pid>`. On Windows, killing the `npm`/`nodemon` wrapper does not always kill the `node server.js` child.

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

**Theming / redesign (in progress):** a light/dark theme system lives in `index.css` as CSS custom properties (`:root` = dark default, `[data-theme="light"]` = light overrides). The active theme is applied by setting `data-theme` on `document.documentElement` (persisted in `localStorage.jamspotify-theme`; toggled by the sun/moon button in the dashboard header). Redesigned screens (welcome, waiting-for-approval, rejected, nickname modal) use `.rd-*` classes built on these tokens; the dashboard still uses the older `.glass-panel` / `.btn-*` classes. The UI redesign is phased and tracked in `PLAN_TRABAJO_REDESIGN.md`.

### Required environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Must match Dashboard exactly. Local dev: `http://127.0.0.1:3000/api/callback` (Spotify rejects `localhost` for loopback) |
| `DATABASE_URL` | PostgreSQL connection string (optional — memory-only if absent) |
| `TOKEN_ENCRYPTION_KEY` | 32 hex bytes (`openssl rand -hex 32`) — tokens stored plaintext if absent |
| `FRONTEND_URL` | Used for CORS origin in production (e.g. `https://jamspotify.onrender.com`) |
| `NODE_ENV` | Set to `production` on Render |
