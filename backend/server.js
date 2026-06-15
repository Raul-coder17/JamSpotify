const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

/* ==========================================================================
   ESTADO DE SALAS EN MEMORIA
   Mapa de roomId → RoomState (respaldado por PostgreSQL cuando está disponible)
   ========================================================================== */

const rooms = new Map();

function createEmptyRoomState() {
  return {
    // Credenciales de Spotify (persistidas)
    hostSpotifyId: null,
    hostName: 'Anfitrión',
    hostToken: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    // Estado de sala (persistido)
    jamQueue: [],
    jamHistory: [],
    pendingGuests: {},
    guestTokens: {},
    // Estado runtime (solo en memoria)
    activeUsers: {},
    currentTrackState: null,
    cachedSpotifyPlayback: null,
    lastSpotifyFetchTime: 0,
    lastForcedUri: null,
    spotifyFetchPromise: null
  };
}

function getOrCreateRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, createEmptyRoomState());
  }
  return rooms.get(roomId);
}

// Persiste los campos durables de una sala a la BD (fire-and-forget por defecto)
function persistRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.hostToken) return;
  db.saveRoom(roomId, {
    hostSpotifyId: room.hostSpotifyId || '',
    hostName: room.hostName,
    hostToken: room.hostToken,
    accessToken: room.accessToken || '',
    refreshToken: room.refreshToken || '',
    expiresAt: room.expiresAt || 0,
    jamQueue: room.jamQueue,
    jamHistory: room.jamHistory,
    pendingGuests: room.pendingGuests,
    guestTokens: room.guestTokens
  }).catch(err => console.error(`[DB] Error persistiendo sala ${roomId}:`, err.message));
}

/* ==========================================================================
   UTILIDADES DE RED
   ========================================================================== */

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = 'localhost';
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
          return ip;
        }
        if (!ip.startsWith('25.') && !ip.startsWith('26.')) {
          fallbackIp = ip;
        }
      }
    }
  }
  return fallbackIp;
}

const localIp = getLocalIp();
const baseUrl = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL || `https://jamspotify.onrender.com`)
  : `http://${localIp}:${PORT}`;

/* ==========================================================================
   HELPERS DE SPOTIFY (por sala)
   ========================================================================== */

async function fetchHostProfileName(accessToken) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      return data.display_name || data.id || null;
    }
  } catch {}
  return null;
}

async function fetchHostSpotifyId(accessToken) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      return data.id || null;
    }
  } catch {}
  return null;
}

async function refreshRoomToken(room) {
  if (!room.refreshToken) throw new Error('No hay refresh token disponible.');

  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', room.refreshToken);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Error al refrescar token');

  room.accessToken = data.access_token;
  room.expiresAt = Date.now() + data.expires_in * 1000;
  if (data.refresh_token) room.refreshToken = data.refresh_token;

  return room.accessToken;
}

async function getValidRoomToken(room) {
  if (!room.accessToken) throw new Error('El Host no está autenticado con Spotify.');
  if (Date.now() + 300000 > room.expiresAt) {
    return await refreshRoomToken(room);
  }
  return room.accessToken;
}

/* ==========================================================================
   MIDDLEWARE
   ========================================================================== */

async function roomMiddleware(req, res, next) {
  const { roomId } = req.params;

  if (!rooms.has(roomId)) {
    // Intentar cargar desde BD
    const dbData = await db.loadRoom(roomId);
    if (!dbData) {
      return res.status(404).json({ error: 'Sala no encontrada.' });
    }
    const state = getOrCreateRoomState(roomId);
    Object.assign(state, dbData);
  }

  req.room = rooms.get(roomId);
  req.roomId = roomId;
  next();
}

function isHostRequest(req) {
  const room = req.room;
  if (!room || !room.hostToken) return false;
  const cookieToken = req.cookies.jam_host_token;
  const headerToken = req.headers['x-host-token'] || req.query.hostToken;
  return cookieToken === room.hostToken || headerToken === room.hostToken;
}

function hostAuthMiddleware(req, res, next) {
  if (isHostRequest(req)) return next();
  res.status(403).json({ error: 'Acceso no autorizado. Se requieren credenciales de anfitrión.' });
}

function verifyGuestToken(req, guestName) {
  const token = req.headers['x-guest-token'];
  return token && req.room.guestTokens[guestName] === token;
}

function invalidatePlaybackCache(room) {
  room.lastSpotifyFetchTime = 0;
}

/* ==========================================================================
   RUTAS DE AUTENTICACIÓN (OAuth — sin roomId, crean la sala)
   ========================================================================== */

app.get('/api/auth/login', (req, res) => {
  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-email',
    'user-read-private'
  ].join(' ');

  const spotifyAuthUrl = 'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      show_dialog: 'true'
    }).toString();

  res.redirect(spotifyAuthUrl);
});

app.get('/api/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.redirect('/?error=state_mismatch');

  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Error Callback]', data);
      return res.redirect('/?error=token_exchange_failed');
    }

    // Crear sala nueva con UUID
    const roomId = crypto.randomUUID();
    const room = getOrCreateRoomState(roomId);

    room.accessToken = data.access_token;
    room.refreshToken = data.refresh_token;
    room.expiresAt = Date.now() + data.expires_in * 1000;
    room.hostToken = crypto.randomBytes(16).toString('hex');

    const [spotifyId, hostName] = await Promise.all([
      fetchHostSpotifyId(room.accessToken),
      fetchHostProfileName(room.accessToken)
    ]);
    room.hostSpotifyId = spotifyId || '';
    room.hostName = hostName || 'Anfitrión';

    await db.saveRoom(roomId, {
      hostSpotifyId: room.hostSpotifyId,
      hostName: room.hostName,
      hostToken: room.hostToken,
      accessToken: room.accessToken,
      refreshToken: room.refreshToken,
      expiresAt: room.expiresAt,
      jamQueue: room.jamQueue,
      jamHistory: room.jamHistory,
      pendingGuests: room.pendingGuests,
      guestTokens: room.guestTokens
    });

    console.log(`[Auth] Sala creada: ${roomId} para host: ${room.hostName}`);

    if (process.env.NODE_ENV === 'production') {
      res.cookie('jam_host_token', room.hostToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.redirect(`/?roomId=${roomId}`);
    } else {
      res.redirect(`http://localhost:5173/?roomId=${roomId}#host_token=${room.hostToken}`);
    }
  } catch (error) {
    console.error('[Error Callback]', error);
    res.redirect('/?error=internal_server_error');
  }
});

/* ==========================================================================
   RUTAS DE SALA — /api/rooms/:roomId/...
   ========================================================================== */

// Estado de autenticación
app.get('/api/rooms/:roomId/auth/status', roomMiddleware, (req, res) => {
  const room = req.room;
  res.json({
    isAuthenticated: !!room.accessToken,
    expiresAt: room.expiresAt,
    hostName: room.hostName
  });
});

// Token de acceso de Spotify (solo host, para el Web Playback SDK)
app.get('/api/rooms/:roomId/auth/token', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidRoomToken(req.room);
    res.json({ accessToken: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cerrar sesión
app.post('/api/rooms/:roomId/auth/logout', roomMiddleware, hostAuthMiddleware, (req, res) => {
  const { roomId, room } = req;
  room.accessToken = null;
  room.refreshToken = null;
  room.expiresAt = null;
  res.clearCookie('jam_host_token');
  db.deleteRoom(roomId).catch(() => {});
  rooms.delete(roomId);
  console.log(`[Auth] Sala ${roomId} cerrada.`);
  res.json({ success: true });
});

// Restablecer sala
app.post('/api/rooms/:roomId/admin/reset', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  const { roomId } = req;
  console.log(`[Admin] Restableciendo sala ${roomId}`);
  await db.deleteRoom(roomId);
  rooms.delete(roomId);
  res.clearCookie('jam_host_token');
  res.json({ success: true });
});

// Información de red (para QR y compartir enlace)
app.get('/api/rooms/:roomId/info', roomMiddleware, (req, res) => {
  const { roomId, room } = req;
  const joinUrl = `${baseUrl}?roomId=${roomId}&mode=guest`;
  res.json({
    localIp,
    port: PORT,
    joinUrl,
    hostName: room.hostName || 'Anfitrión',
    roomId
  });
});

/* ==========================================================================
   RUTAS DE INVITADOS
   ========================================================================== */

app.post('/api/rooms/:roomId/guest/join', roomMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nombre de usuario requerido.' });
  }

  const cleanName = name.trim();

  if (cleanName.length < 2 || cleanName.length > 30) {
    return res.status(400).json({ error: 'El nombre debe tener entre 2 y 30 caracteres.' });
  }
  if (!/^[\w\s\-\.áéíóúÁÉÍÓÚñÑüÜ]+$/.test(cleanName)) {
    return res.status(400).json({ error: 'El nombre contiene caracteres no permitidos.' });
  }

  const room = req.room;

  if (!room.guestTokens[cleanName]) {
    room.guestTokens[cleanName] = crypto.randomBytes(16).toString('hex');
  }

  if (room.pendingGuests[cleanName] === 'approved') {
    room.activeUsers[cleanName] = Date.now();
    return res.json({ status: 'approved', guestToken: room.guestTokens[cleanName] });
  }

  if (room.pendingGuests[cleanName] === 'rejected') {
    room.pendingGuests[cleanName] = 'pending';
    persistRoom(req.roomId);
    return res.json({ status: 'pending', guestToken: room.guestTokens[cleanName] });
  }

  if (!room.pendingGuests[cleanName]) {
    room.pendingGuests[cleanName] = 'pending';
    console.log(`[Guest] Nueva solicitud: ${cleanName} en sala ${req.roomId}`);
    persistRoom(req.roomId);
  }

  res.json({ status: room.pendingGuests[cleanName], guestToken: room.guestTokens[cleanName] });
});

app.get('/api/rooms/:roomId/guest/status', roomMiddleware, (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'Falta parámetro name.' });

  const cleanName = name.trim();
  const room = req.room;
  const status = room.pendingGuests[cleanName] || 'not_requested';

  if (status === 'approved') {
    room.activeUsers[cleanName] = Date.now();
  }

  res.json({ status });
});

app.get('/api/rooms/:roomId/guest/pending', roomMiddleware, hostAuthMiddleware, (req, res) => {
  const pending = Object.keys(req.room.pendingGuests)
    .filter(name => req.room.pendingGuests[name] === 'pending')
    .map(name => ({ name }));
  res.json(pending);
});

app.post('/api/rooms/:roomId/guest/approve', roomMiddleware, hostAuthMiddleware, (req, res) => {
  const { name, action } = req.body;
  if (!name || !action) return res.status(400).json({ error: 'Faltan parámetros name y action.' });

  const cleanName = name.trim();
  const room = req.room;

  if (action === 'approve') {
    room.pendingGuests[cleanName] = 'approved';
    room.activeUsers[cleanName] = Date.now();
    console.log(`[Guest] Aprobado: ${cleanName}`);
  } else if (action === 'reject') {
    room.pendingGuests[cleanName] = 'rejected';
    delete room.activeUsers[cleanName];
    console.log(`[Guest] Rechazado: ${cleanName}`);
  } else {
    return res.status(400).json({ error: 'Acción no válida.' });
  }

  persistRoom(req.roomId);
  invalidatePlaybackCache(room);
  res.json({ success: true });
});

/* ==========================================================================
   RUTAS DE PLAYBACK
   ========================================================================== */

app.get('/api/rooms/:roomId/playback', roomMiddleware, async (req, res) => {
  const room = req.room;
  const { guestName } = req.query;

  // Registrar actividad del invitado
  if (guestName && guestName.trim()) {
    const cleanName = guestName.trim();
    if (cleanName === 'Host' || cleanName === 'Anfitrión' || room.pendingGuests[cleanName] === 'approved') {
      room.activeUsers[cleanName] = Date.now();
    }
  }

  // Limpiar usuarios inactivos (>10 s sin responder)
  const now = Date.now();
  for (const name in room.activeUsers) {
    if (now - room.activeUsers[name] > 10000) delete room.activeUsers[name];
  }

  try {
    const nowTime = Date.now();
    const cacheExpired = !room.cachedSpotifyPlayback || (nowTime - room.lastSpotifyFetchTime > 1500);

    if (cacheExpired && !room.spotifyFetchPromise) {
      // Solo un fetch simultáneo por sala — las demás requests esperan a esta promesa
      room.spotifyFetchPromise = (async () => {
        const token = await getValidRoomToken(room);

        const playbackResponse = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        let activeDevice = null;
        let currentlyPlaying = null;

        if (playbackResponse.status === 200) {
          const data = await playbackResponse.json();
          activeDevice = data.device;

          // Desactivar repetición si está activa
          if (data.repeat_state && data.repeat_state !== 'off') {
            fetch('https://api.spotify.com/v1/me/player/repeat?state=off', {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
          }

          if (data.item) {
            currentlyPlaying = {
              id: data.item.id,
              uri: data.item.uri,
              name: data.item.name,
              artists: data.item.artists.map(a => a.name).join(', '),
              albumArt: data.item.album?.images?.[0]?.url || '',
              durationMs: data.item.duration_ms,
              progressMs: data.progress_ms,
              isPlaying: data.is_playing
            };

            if (room.currentTrackState && room.currentTrackState.id !== currentlyPlaying.id) {
              const isForcedTransition = room.lastForcedUri !== null && room.lastForcedUri === currentlyPlaying.uri;
              if (isForcedTransition) room.lastForcedUri = null;

              if (room.jamQueue.length > 0 && !isForcedTransition) {
                const nextExpected = room.jamQueue[0];
                if (currentlyPlaying.uri !== nextExpected.uri) {
                  console.log(`[Queue Sync] Desviación detectada en sala ${req.roomId}. Redirigiendo a: ${nextExpected.name}`);
                  fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uris: [nextExpected.uri] })
                  }).catch(() => {});

                  room.currentTrackState = currentlyPlaying;
                  room.cachedSpotifyPlayback = { currentlyPlaying, activeDevice };
                  room.lastSpotifyFetchTime = Date.now();
                  room.spotifyFetchPromise = null;
                  return;
                }
              }

              // Flujo normal: guardar en historial la canción anterior
              const matchedItem = room.jamQueue.find(i => i.uri === room.currentTrackState.uri) ||
                                  room.jamHistory.find(i => i.uri === room.currentTrackState.uri);
              const addedBy = matchedItem ? matchedItem.addedBy : 'Sistema / Spotify';

              if (room.jamHistory.length === 0 || room.jamHistory[0].uri !== room.currentTrackState.uri) {
                room.jamHistory.unshift({
                  id: `${room.currentTrackState.uri}-${Date.now()}`,
                  uri: room.currentTrackState.uri,
                  name: room.currentTrackState.name,
                  artists: room.currentTrackState.artists,
                  albumArt: room.currentTrackState.albumArt,
                  addedBy,
                  playedAt: Date.now()
                });
                if (room.jamHistory.length > 30) room.jamHistory.pop();
                persistRoom(req.roomId);
              }

              // Sincronizar cola: eliminar hasta la canción actual
              const idx = room.jamQueue.findIndex(i => i.uri === currentlyPlaying.uri);
              if (idx !== -1) {
                console.log(`[Queue Sync] Sala ${req.roomId}: avanzando cola al índice ${idx}`);
                room.jamQueue = room.jamQueue.slice(idx + 1);
                persistRoom(req.roomId);
              }
            } else if (!room.currentTrackState) {
              // Carga inicial
              if (room.jamQueue.length > 0 && room.jamQueue[0].uri === currentlyPlaying.uri) {
                room.jamQueue = room.jamQueue.slice(1);
                persistRoom(req.roomId);
              }
            }

            room.currentTrackState = currentlyPlaying;
          }
        } else if (playbackResponse.status === 204 || (currentlyPlaying && !currentlyPlaying.isPlaying)) {
          const wasNearEnd = room.currentTrackState &&
            (room.currentTrackState.durationMs - room.currentTrackState.progressMs < 5000);

          if ((playbackResponse.status === 204 || wasNearEnd) && room.jamQueue.length > 0) {
            const nextTrack = room.jamQueue[0];
            console.log(`[Queue Sync] Sala ${req.roomId}: reproduciendo siguiente de cola: ${nextTrack.name}`);
            fetch('https://api.spotify.com/v1/me/player/play', {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ uris: [nextTrack.uri] })
            }).catch(() => {});
          }
          room.currentTrackState = null;
        }

        room.cachedSpotifyPlayback = { currentlyPlaying, activeDevice };
        room.lastSpotifyFetchTime = Date.now();
      })()
        .catch(err => { console.error(`[Playback] Error sala ${req.roomId}:`, err.message); })
        .finally(() => { room.spotifyFetchPromise = null; });
    }

    // Si hay un fetch en curso, esperarlo antes de responder
    if (room.spotifyFetchPromise) {
      await room.spotifyFetchPromise;
    }

    res.json({
      currentlyPlaying: room.cachedSpotifyPlayback?.currentlyPlaying ?? null,
      activeDevice: room.cachedSpotifyPlayback?.activeDevice ?? null,
      queue: room.jamQueue,
      history: room.jamHistory,
      users: Object.keys(room.activeUsers)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/playback/devices', roomMiddleware, async (req, res) => {
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return res.json([]);
    const data = await response.json().catch(() => ({}));
    res.json(data.devices || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/:roomId/playback/transfer', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Falta deviceId' });
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: true })
    });
    if (response.ok || response.status === 204) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rooms/:roomId/playback/pause', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rooms/:roomId/playback/play', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  const { uris } = req.body || {};
  try {
    const token = await getValidRoomToken(req.room);
    const options = { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } };
    if (uris && Array.isArray(uris)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ uris });
    }
    const response = await fetch('https://api.spotify.com/v1/me/player/play', options);
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/:roomId/playback/next', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  const room = req.room;
  try {
    const token = await getValidRoomToken(room);

    if (room.jamQueue.length > 0) {
      const nextTrack = room.jamQueue[0];
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [nextTrack.uri] })
      });

      if (response.status === 204 || response.ok) {
        // Agregar al historial la canción que se está saltando (la actual)
        if (room.currentTrackState) {
          const matchedItem = room.jamQueue.find(i => i.uri === room.currentTrackState.uri);
          const addedBy = matchedItem
            ? matchedItem.addedBy
            : (room.jamHistory.find(i => i.uri === room.currentTrackState.uri)?.addedBy || 'Sistema / Spotify');
          if (room.jamHistory.length === 0 || room.jamHistory[0].uri !== room.currentTrackState.uri) {
            room.jamHistory.unshift({
              id: `${room.currentTrackState.uri}-${Date.now()}`,
              uri: room.currentTrackState.uri,
              name: room.currentTrackState.name,
              artists: room.currentTrackState.artists,
              albumArt: room.currentTrackState.albumArt,
              addedBy,
              playedAt: Date.now()
            });
            if (room.jamHistory.length > 30) room.jamHistory.pop();
          }
        }
        room.jamQueue.shift();
        room.lastForcedUri = nextTrack.uri;
        persistRoom(req.roomId);
        invalidatePlaybackCache(room);
        return res.json({ success: true, queue: room.jamQueue, history: room.jamHistory });
      }
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json(err);
    } else {
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 204 || response.ok) {
        invalidatePlaybackCache(room);
        return res.json({ success: true });
      }
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/:roomId/playback/previous', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rooms/:roomId/playback/seek', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  let { positionMs, relativeMs } = req.body;
  try {
    const token = await getValidRoomToken(req.room);

    if (relativeMs !== undefined) {
      const playResponse = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (playResponse.status === 200) {
        const data = await playResponse.json();
        positionMs = Math.max(0, (data.progress_ms || 0) + relativeMs);
        if (data.item && positionMs > data.item.duration_ms) positionMs = data.item.duration_ms - 1000;
      } else {
        return res.status(400).json({ error: 'No hay reproducción activa.' });
      }
    }

    if (positionMs === undefined) return res.status(400).json({ error: 'Falta posición (positionMs).' });

    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok || response.status === 204) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true, positionMs });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/rooms/:roomId/playback/volume', roomMiddleware, hostAuthMiddleware, async (req, res) => {
  const { volumePercent } = req.body;
  if (volumePercent === undefined || volumePercent < 0 || volumePercent > 100) {
    return res.status(400).json({ error: 'Volumen inválido (0–100).' });
  }
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok || response.status === 204) {
      invalidatePlaybackCache(req.room);
      return res.json({ success: true, volumePercent });
    }
    const err = await response.json().catch(() => ({}));
    res.status(response.status).json(err);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   RUTAS DE BÚSQUEDA Y COLA
   ========================================================================== */

app.get('/api/rooms/:roomId/search', roomMiddleware, async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  try {
    const token = await getValidRoomToken(req.room);
    const response = await fetch(
      'https://api.spotify.com/v1/search?' + new URLSearchParams({ q: query, type: 'track', limit: 15 }),
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const tracks = (data.tracks?.items || []).map(track => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists.map(a => a.name).join(', '),
      albumArt: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '',
      durationMs: track.duration_ms
    }));
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/queue', roomMiddleware, (req, res) => {
  res.json(req.room.jamQueue);
});

app.post('/api/rooms/:roomId/queue', roomMiddleware, async (req, res) => {
  const { uri, name, artists, albumArt, addedBy } = req.body;
  if (!uri) return res.status(400).json({ error: 'Falta URI de la canción.' });

  const room = req.room;
  const isDuplicate = room.jamQueue.some(item => item.uri === uri);
  if (isDuplicate) return res.status(400).json({ error: 'Esta canción ya está en la cola.' });

  const guestName = addedBy ? addedBy.trim() : 'Anónimo';
  const isHost = isHostRequest(req);

  if (!isHost) {
    if (guestName === 'Host' || guestName === 'Anfitrión') {
      return res.status(403).json({ error: 'Nombre reservado para el anfitrión.' });
    }
    if (room.pendingGuests[guestName] !== 'approved') {
      return res.status(403).json({ error: 'No tienes acceso autorizado para agregar canciones.' });
    }
    if (!verifyGuestToken(req, guestName)) {
      return res.status(403).json({ error: 'Token de invitado inválido. Vuelve a unirte a la sala.' });
    }
  }

  try {
    const token = await getValidRoomToken(room);

    const playbackCheck = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let isIdle = true;
    if (playbackCheck.status === 200) {
      const pbData = await playbackCheck.json();
      if (pbData && pbData.item) isIdle = false;
    }

    // Reservar slot en la cola ANTES del await a Spotify (evita race condition)
    const queueItem = {
      id: `${uri}-${Date.now()}`,
      uri, name, artists, albumArt,
      addedBy: guestName,
      addedAt: Date.now()
    };
    room.jamQueue.push(queueItem);

    if (room.jamQueue.length === 1 && isIdle) {
      console.log(`[Queue] Sala ${req.roomId}: reproductor inactivo, reproduciendo directamente: ${name}`);
      const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
      });
      if (!playResponse.ok && playResponse.status === 404) {
        room.jamQueue.pop(); // revertir
        return res.status(404).json({
          error: 'No se detecta reproducción activa. El anfitrión debe abrir Spotify primero.'
        });
      }
    }

    persistRoom(req.roomId);
    invalidatePlaybackCache(room);
    res.json({ success: true, queue: room.jamQueue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rooms/:roomId/queue/:id', roomMiddleware, (req, res) => {
  const { id } = req.params;
  const { guestName } = req.query;
  const room = req.room;

  const index = room.jamQueue.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ error: 'Canción no encontrada.' });

  const item = room.jamQueue[index];
  const isHost = isHostRequest(req);

  if (!isHost) {
    if (!guestName || guestName.trim() === '') {
      return res.status(403).json({ error: 'Identificación de invitado requerida.' });
    }
    const cleanGuestName = guestName.trim();
    if (cleanGuestName === 'Host' || cleanGuestName === 'Anfitrión') {
      return res.status(403).json({ error: 'Nombre reservado para el anfitrión.' });
    }
    if (!verifyGuestToken(req, cleanGuestName)) {
      return res.status(403).json({ error: 'Token de invitado inválido. Vuelve a unirte a la sala.' });
    }
    if (item.addedBy !== cleanGuestName) {
      return res.status(403).json({ error: 'Solo puedes eliminar canciones que tú agregaste.' });
    }
  }

  room.jamQueue.splice(index, 1);
  persistRoom(req.roomId);
  invalidatePlaybackCache(room);
  res.json({ success: true, queue: room.jamQueue });
});

app.put('/api/rooms/:roomId/queue/reorder', roomMiddleware, hostAuthMiddleware, (req, res) => {
  const { newQueue } = req.body;
  if (!Array.isArray(newQueue)) return res.status(400).json({ error: 'Cola inválida.' });

  req.room.jamQueue = newQueue;
  persistRoom(req.roomId);
  invalidatePlaybackCache(req.room);
  res.json({ success: true, queue: req.room.jamQueue });
});

/* ==========================================================================
   CATCH-ALL: servir frontend en producción
   ========================================================================== */

if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

db.initSchema().then(() => {
  app.listen(PORT, () => {
    console.log('==================================================');
    console.log(` JamSpotify Backend — puerto ${PORT}`);
    console.log(` Acceso local: http://localhost:${PORT}`);
    console.log(` IP de red:    http://${localIp}:${PORT}`);
    console.log('==================================================');
  });
});
