# Análisis Exhaustivo de JamSpotify

> **Aviso urgente:** El archivo `repomix-output.xml` contiene credenciales **reales y activas** — `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, un `accessToken` y un `refreshToken` de Spotify, y el `HOST_TOKEN` interno. Si este archivo fue o será subido a algún repositorio o servicio, debes **revocar el acceso en el Spotify Developer Dashboard inmediatamente** y rotar las credenciales. Los tokens en `tokens.json` y las variables en `.env` nunca deben commitearse.

---

## 1. Bugs Lógicos y Riesgos de Sincronización

### 1.1 — HOST_TOKEN filtrado públicamente (`server.js:469-475`)

```js
app.get('/api/auth/status', (req, res) => {
  res.json({
    isAuthenticated: !!spotifyTokens.accessToken,
    hostToken: spotifyTokens.accessToken ? HOST_TOKEN : null  // ← EXPUESTO A TODOS
  });
});
```

Cualquier invitado o persona anónima que llame a `/api/auth/status` recibe el `HOST_TOKEN`, con el que puede llamar a **todos los endpoints protegidos por `hostAuthMiddleware`** (aprobar/rechazar invitados, pausar, saltar, cambiar volumen, reiniciar la sala, etc.). El token de host debería enviarse solo al navegador del host después de un login exitoso (cookie `HttpOnly`), nunca en este endpoint público.

### 1.2 — Token de Spotify accesible sin autenticación (`server.js:478-485`)

```js
app.get('/api/auth/token', async (req, res) => {
  const token = await getValidAccessToken();
  res.json({ accessToken: token });  // ← Sin ninguna protección
});
```

Cualquier invitado puede obtener el `accessToken` de Spotify del host y usarlo directamente contra la API de Spotify para controlar la cuenta — reproducir, pausar, eliminar playlists, etc. Este endpoint solo debería llamarse desde el Spotify Web Playback SDK que corre en el navegador del host, y debería estar detrás de `hostAuthMiddleware`.

### 1.3 — Race condition en la sincronización de cola (`server.js:700-766`)

El endpoint `/api/playback` es la pieza más crítica y tiene múltiples problemas en cascada:

**Bug de doble historial:** Cuando el host llama a `POST /api/playback/next`, el código hace `jamQueue.shift()` y agrega la canción al historial. Pero 1.5 segundos después, la lógica de detección de cambio de canción en `/api/playback` detecta que cambió el track y **vuelve a agregar la misma canción al historial**. Resultado: duplicados en `jamHistory`.

**Bug del estado "desviado":** Cuando detecta que Spotify está reproduciendo algo distinto a lo esperado (`server.js:706-728`):

```js
currentTrackState = currentlyPlaying;  // ← Se guarda la canción "incorrecta"
// ... fuerza reproducción de nextExpectedTrack ...
return res.json(...)   // ← Retorna sin esperar que el PUT a Spotify surta efecto
```

En el siguiente poll, `currentTrackState.id` es el id de la canción incorrecta. Si Spotify tardó en responder al PUT, el siguiente poll puede volver a detectar "desviación" e intentar forzar la reproducción de nuevo. Bucle infinito de redirects posible.

**La variable `removedQueueUris`** (`server.js:222`) se declara pero **nunca se usa**. Es código muerto.

### 1.4 — `progressMs` obsoleto en la detección de fin de canción (`server.js:772`)

```js
const wasNearEnd = currentTrackState &&
  (currentTrackState.durationMs - currentTrackState.progressMs < 5000);
```

`currentTrackState.progressMs` es el valor que Spotify reportó en el último ciclo (hasta 1.5 segundos antes). En la práctica, si la caché de 1.5s evita llamar a Spotify, el tiempo real transcurrido no se refleja. El resultado es que si la canción termina en la ventana entre dos polls, el servidor podría no detectar el fin y no avanzar la cola.

### 1.5 — Carrera de datos entre requests concurrentes

Node.js es single-threaded pero las operaciones async crean ventanas de interleaving. Si dos invitados hacen `POST /api/queue` simultáneamente:

1. Request A: lee `jamQueue.length === 0 && isIdle === true` → decide reproducir directamente
2. Request B: llega mientras A espera respuesta del `fetch` a Spotify → también lee `jamQueue.length === 0 && isIdle === true`
3. Ambos intentan reproducir dos canciones distintas directamente

El correcto fix es reservar el slot en `jamQueue` **antes** del await a Spotify.

### 1.6 — Identidad de invitado basada solo en nombre (sin sesión)

```js
if (pendingGuests[cleanName] === 'approved') {
  return res.json({ status: 'approved' });
}
```

El nombre en `localStorage` es la única credencial de un invitado. Si "María" fue aprobada, cualquier otro navegador puede escribir `localStorage.setItem('jam_guest_name', 'María')` y tendrá acceso completo. No existe ningún secreto de sesión por invitado.

---

## 2. Cambios Arquitectónicos para Multi-Tenant

### El problema central

Todo el estado actual vive en **variables globales del proceso Node.js**:

```js
let jamQueue = [];
let jamHistory = [];
let pendingGuests = {};
let activeUsers = {};
let spotifyTokens = { ... };
let currentTrackState = null;
let HOST_TOKEN = ...;
```

Para múltiples salas, cada sala necesita su propio namespace aislado.

### 2.1 — Modelo de datos (Rooms)

```
Room {
  id: UUID (también es el roomCode para la URL)
  hostSpotifyId: string
  accessToken: string (encriptado)
  refreshToken: string (encriptado)
  expiresAt: timestamp
  hostName: string
  hostToken: string (secret para las APIs del host)
  jamQueue: JSONB []
  jamHistory: JSONB []
  pendingGuests: JSONB {}
  createdAt: timestamp
  lastActiveAt: timestamp
}
```

### 2.2 — Flujo de creación de sala

```
GET /api/auth/login
  → redirect a Spotify OAuth
  → Spotify llama a /api/callback?code=...
  → Servidor crea Room en DB con UUID, guarda tokens
  → Setea cookie HttpOnly: { roomId, hostToken }
  → Redirect a /?roomId=<UUID>
```

### 2.3 — URLs con roomId

- Host: `https://jamspotify.onrender.com/?roomId=abc123`
- Invitados: `https://jamspotify.onrender.com/?roomId=abc123&mode=guest`
- El QR apunta a esa URL con el roomId

### 2.4 — Endpoints refactorizados

```
GET  /api/rooms/:roomId/playback
POST /api/rooms/:roomId/queue
GET  /api/rooms/:roomId/guests/pending
POST /api/rooms/:roomId/guests/approve   ← requiere cookie hostToken
DELETE /api/rooms/:roomId/queue/:id
```

### 2.5 — Middleware de sala

```js
async function roomMiddleware(req, res, next) {
  const { roomId } = req.params;
  const room = await db.getRoom(roomId);
  if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
  req.room = room;
  next();
}

function hostAuthMiddleware(req, res, next) {
  const hostToken = req.cookies.hostToken || req.headers['x-host-token'];
  if (hostToken && hostToken === req.room.hostToken) {
    req.isHost = true;
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado.' });
  }
}
```

---

## 3. Almacenamiento de Credenciales en Render

### El problema con Render

Render es **stateless en el filesystem** — cada deploy o restart destruye cualquier archivo escrito en disco. `tokens.json` y `jam_state.json` desaparecen en cada reinicio.

### Recomendación: PostgreSQL (Render ofrece tier gratuito)

| Opción | Pro | Contra |
|---|---|---|
| **PostgreSQL en Render** | Persiste entre restarts, gratis, conocido | Latencia de consulta ~5-10ms |
| Redis | Ultra rápido para estado de sala | El tier gratuito tiene TTL, la data se puede perder |
| MongoDB Atlas | Flexible, tier gratuito | Overkill para esta estructura |
| Archivos locales | Cero configuración | Inútil en Render (filesystem efímero) |

### Schema mínimo

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_spotify_id TEXT NOT NULL,
  host_name TEXT,
  host_token TEXT NOT NULL,
  access_token TEXT NOT NULL,   -- Encriptado con AES-256
  refresh_token TEXT NOT NULL,  -- Encriptado con AES-256
  expires_at BIGINT NOT NULL,
  jam_queue JSONB DEFAULT '[]',
  jam_history JSONB DEFAULT '[]',
  pending_guests JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rooms_host_spotify_id ON rooms(host_spotify_id);
```

### Encriptación de tokens en BD

Los tokens OAuth de Spotify son sensibles. No guardarlos en texto plano:

```js
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes en hex

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  return iv.toString('hex') + ':' +
    cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
}

function decryptToken(encrypted) {
  const [ivHex, data] = encrypted.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(ivHex, 'hex'));
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}
```

### Variables de entorno en Render

```
DATABASE_URL=postgresql://user:pass@host/db
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=https://jamspotify.onrender.com/api/callback
TOKEN_ENCRYPTION_KEY=<32 bytes en hex — genera con: openssl rand -hex 32>
SESSION_SECRET=<otro random para cookies>
NODE_ENV=production
```

### Cache en memoria por sala (opcional)

Para evitar golpear la BD en cada poll de playback, mantener un cache in-process con TTL corto:

```js
const roomCache = new Map(); // roomId → { state, lastFetch }
const CACHE_TTL_MS = 1500;

async function getRoomState(roomId) {
  const cached = roomCache.get(roomId);
  if (cached && Date.now() - cached.lastFetch < CACHE_TTL_MS) {
    return cached.state;
  }
  const state = await db.getRoomState(roomId);
  roomCache.set(roomId, { state, lastFetch: Date.now() });
  return state;
}
```

---

## 4. Vulnerabilidades de Seguridad

### 4.1 — Crítico: HOST_TOKEN expuesto públicamente

Ya descrito en §1.1. Fix: el `hostToken` solo debe entregarse en la cookie `HttpOnly` al final del callback de OAuth, nunca en un endpoint GET público.

```js
// En /api/callback, después de guardar tokens:
res.cookie('hostToken', room.hostToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
});
res.redirect(`/?roomId=${room.id}`);
```

### 4.2 — Crítico: `/api/auth/token` sin protección

Ya descrito en §1.2. Fix: añadir `hostAuthMiddleware`.

### 4.3 — CORS completamente abierto

```js
app.use(cors()); // ← Permite cualquier origen
```

En producción debe restringirse:

```js
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://jamspotify.onrender.com'
    : 'http://localhost:5173',
  credentials: true  // necesario para cookies
}));
```

### 4.4 — Sin rate limiting

Un invitado malicioso puede hacer miles de requests por segundo a `/api/queue` o `/api/search`. Solución con `express-rate-limit`:

```js
const rateLimit = require('express-rate-limit');

const guestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // max 60 requests por minuto por IP
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});

app.use('/api/queue', guestLimiter);
app.use('/api/search', guestLimiter);
```

### 4.5 — Identidad de invitado sin secreto de sesión

El nombre en localStorage como única credencial es trivialmente suplantable. Solución mínima sin cuentas — emitir un **token de sesión de invitado** al hacer join:

```js
// POST /api/rooms/:roomId/guests/join
const guestSessionToken = crypto.randomBytes(16).toString('hex');
room.pendingGuests[cleanName] = {
  status: 'pending',
  token: guestSessionToken  // guardado en el estado de sala
};
// devolver al cliente:
res.json({ status: 'pending', guestToken: guestSessionToken });
```

El frontend guarda `guestToken` en `sessionStorage` y lo envía en cada request. El servidor valida que el nombre + token coincidan. Así un invitado no puede suplantar a otro.

### 4.6 — QR apunta a servicio externo de terceros

```jsx
src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}`}
```

La URL de la sala (con `roomId`) se envía a un servicio externo. Alternativa: generar el QR en el cliente con la librería `qrcode` (npm) o `qrcode.react`.

### 4.7 — Sin validación de longitud/caracteres en nombres de invitados

```js
const cleanName = name.trim();
// ← No hay validación de longitud ni de caracteres
```

Fix:

```js
if (cleanName.length < 2 || cleanName.length > 30) {
  return res.status(400).json({ error: 'El nombre debe tener entre 2 y 30 caracteres.' });
}
if (!/^[\w\s\-\.áéíóúÁÉÍÓÚñÑüÜ]+$/.test(cleanName)) {
  return res.status(400).json({ error: 'El nombre contiene caracteres no permitidos.' });
}
```

---

## 5. Impacto del Polling HTTP y Alternativa con WebSockets

### El problema a escala

Con **20 invitados aprobados** y la frecuencia actual:

| Endpoint | Frecuencia | 20 invitados | Host | Total req/s |
|---|---|---|---|---|
| `/api/playback` | 1s | 20 | 1 | **21/s** |
| `/api/guest/status` | 1s | 20 (pendientes) | — | 20/s |
| `/api/guest/pending` | 1s | — | 1 | 1/s |
| `/api/playback/devices` | 7s | — | 1 | 0.14/s |
| **Total** | | | | **~42 req/s** |

**Problema con la caché de Spotify:** La caché de 1.5 segundos en el servidor no resuelve el problema correctamente porque **varios requests llegan simultáneamente**. Si 10 requests llegan en el mismo milisegundo y `lastSpotifyFetchTime` es 0, los 10 leerán `nowTime - lastSpotifyFetchTime > 1500 = true` y los 10 harán un fetch a Spotify antes de que cualquiera actualice `lastSpotifyFetchTime`. Esto puede resultar en **10 llamadas simultáneas a Spotify** por ciclo.

**Límite de tarifa de Spotify:** La API aplica throttling alrededor de ~180 req/30s = **6 req/s**. Con 21 req/s al endpoint `/api/playback` cada uno potencialmente tocando Spotify, se superará el límite con frecuencia y recibirás errores 429.

### Solución: WebSockets con Socket.IO

Arquitectura propuesta:

```
┌────────────────────────────────────────────────────────────┐
│  SERVIDOR (una sola fuente de verdad por sala)             │
│                                                            │
│  Spotify API ←──── 1 poll cada 2s (solo el servidor) ──── │
│       │                                                    │
│       ↓                                                    │
│  updateRoomState(roomId, newState)                         │
│       │                                                    │
│       ↓                                                    │
│  io.to(roomId).emit('state', newState)  ────────────────── │
│                                         │      │      │   │
└─────────────────────────────────────────┼──────┼──────┼───┘
                                          │      │      │
                                     Guest1  Guest2  Host
```

Con 20 clientes: el servidor hace **1 llamada a Spotify cada 2 segundos** por sala, y pushea el estado a todos los clientes via WebSocket. En vez de 21 req/s → **0.5 req/s a Spotify**. Una reducción del 97.6%.

### Ejemplo mínimo de implementación en el servidor

```js
const { Server } = require('socket.io');
const io = new Server(httpServer, { cors: { origin: ... } });

const roomPollingIntervals = new Map();

async function startRoomPolling(roomId) {
  if (roomPollingIntervals.has(roomId)) return; // Ya está corriendo

  const interval = setInterval(async () => {
    try {
      const state = await fetchSpotifyStateForRoom(roomId);
      await db.updateRoomState(roomId, state);
      io.to(roomId).emit('room:state', state);
    } catch (err) {
      console.error(`[Room ${roomId}] Error polling Spotify:`, err);
    }
  }, 2000);

  roomPollingIntervals.set(roomId, interval);
}

function stopRoomPolling(roomId) {
  const interval = roomPollingIntervals.get(roomId);
  if (interval) {
    clearInterval(interval);
    roomPollingIntervals.delete(roomId);
  }
}

io.on('connection', (socket) => {
  socket.on('join:room', async ({ roomId, guestName, guestToken }) => {
    // Validar acceso del invitado...
    socket.join(roomId);
    startRoomPolling(roomId);
    // Enviar estado actual de inmediato al cliente que se conecta
    const state = await getRoomState(roomId);
    socket.emit('room:state', state);
  });

  socket.on('disconnect', () => {
    // Actualizar activeUsers, detener polling si la sala quedó vacía
    const rooms = [...socket.rooms];
    rooms.forEach(roomId => {
      const clients = io.sockets.adapter.rooms.get(roomId);
      if (!clients || clients.size === 0) {
        stopRoomPolling(roomId);
      }
    });
  });
});
```

### Ejemplo en el frontend (React)

```jsx
import { io } from 'socket.io-client';

useEffect(() => {
  const socket = io('/', { query: { roomId } });

  socket.emit('join:room', { roomId, guestName, guestToken });

  socket.on('room:state', (data) => {
    setCurrentlyPlaying(data.currentlyPlaying);
    setQueue(data.queue);
    setHistory(data.history);
    setConnectedUsers(data.users);
  });

  socket.on('guest:approved', () => setGuestApprovalStatus('approved'));
  socket.on('guest:rejected', () => setGuestApprovalStatus('rejected'));

  return () => socket.disconnect();
}, [roomId]);
```

---

## Resumen de Prioridades

| Prioridad | Issue | Impacto |
|---|---|---|
| 🔴 **Urgente** | `HOST_TOKEN` expuesto en `/api/auth/status` | Cualquiera controla el host |
| 🔴 **Urgente** | `/api/auth/token` sin protección | Cualquiera obtiene token Spotify |
| 🔴 **Urgente** | Revocar credenciales expuestas en el XML | Tokens reales filtrados |
| 🟠 **Alta** | Identidad de invitado sin sesión real | Suplantación trivial |
| 🟠 **Alta** | Variables globales → modelo de Rooms | Prerequisito multi-tenant |
| 🟠 **Alta** | Migrar de archivos JSON a PostgreSQL | Prerequisito deploy en Render |
| 🟡 **Media** | Bug de doble historial en `/next` + polling | Historial corrupto |
| 🟡 **Media** | Race condition en detección de desviación | Bucles de redirect |
| 🟡 **Media** | Polling → WebSockets | Escalabilidad y rate limits |
| 🟢 **Baja** | CORS abierto | Menor riesgo en producción única |
| 🟢 **Baja** | Sin rate limiting por IP | Abuse pero no crítico |
