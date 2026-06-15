const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Servir archivos estáticos del frontend en producción
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Ruta del archivo para guardar los tokens
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

// Estado en memoria
let spotifyTokens = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null // Timestamp en ms
};

let jamQueue = []; // Cola colaborativa de invitados
let jamHistory = []; // Historial de canciones reproducidas
let activeUsers = {}; // Usuarios/Invitados activos { nombre: último_timestamp }
let pendingGuests = {}; // Lista de control de acceso de invitados: { nombre: 'pending' | 'approved' | 'rejected' }
let currentTrackState = null; // Guardará el estado de reproducción de Spotify

const STATE_FILE = path.join(__dirname, 'jam_state.json');

function saveJamState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      jamQueue,
      jamHistory,
      pendingGuests
    }, null, 2));
  } catch (error) {
    console.error('[Error] No se pudo guardar el estado del Jam:', error);
  }
}

// Cargar estado inicial del Jam
if (fs.existsSync(STATE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    jamQueue = data.jamQueue || [];
    jamHistory = data.jamHistory || [];
    pendingGuests = data.pendingGuests || {};
    console.log('[JamState] Estado del Jam cargado exitosamente desde disco.');
  } catch (error) {
    console.error('[Error] No se pudo cargar el estado del Jam:', error);
  }
}

// Cache de estado de Spotify para evitar Rate Limits de la API
let cachedSpotifyPlayback = null;
let lastSpotifyFetchTime = 0;
let removedQueueUris = new Set(); // URIs eliminadas manualmente para ocultar en la cola
let lastForcedUri = null; // URI que /api/playback/next forzó; evita falsos positivos en detección de desviación
let guestTokens = {}; // Mapa { nombre: token } para verificar identidad de invitados

function invalidatePlaybackCache() {
  lastSpotifyFetchTime = 0;
}

// Generar token secreto del anfitrión para seguridad de las APIs
const crypto = require('crypto');
let HOST_TOKEN = crypto.randomBytes(16).toString('hex');

function isHostRequest(req) {
  const cookieToken = req.cookies.jam_host_token;
  const headerToken = req.headers['x-host-token'] || req.query.hostToken;
  return cookieToken === HOST_TOKEN || headerToken === HOST_TOKEN;
}

// Middleware de validación del Host
function hostAuthMiddleware(req, res, next) {
  if (isHostRequest(req)) {
    next();
  } else {
    res.status(403).json({ error: 'Acceso no autorizado. Se requieren credenciales de anfitrión.' });
  }
}

// Cargar tokens existentes desde el archivo si existe
if (fs.existsSync(TOKENS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    spotifyTokens = data;
    if (spotifyTokens.hostToken) {
      HOST_TOKEN = spotifyTokens.hostToken;
    } else {
      spotifyTokens.hostToken = HOST_TOKEN;
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(spotifyTokens, null, 2));
    }
    console.log('[Auth] Tokens cargados correctamente desde el disco.');

    // Recuperar el nombre de perfil del host si no está guardado aún
    if (spotifyTokens.accessToken && !spotifyTokens.hostName) {
      getValidAccessToken().then(async (token) => {
        const name = await fetchHostProfileName(token);
        if (name) {
          saveTokens({ hostName: name });
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error('[Error] No se pudieron cargar los tokens guardados:', error);
  }
}

// Obtener la IP local de la red Wi-Fi (filtrando VPNs/Hamachi y priorizando red física)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  let fallbackIp = 'localhost';
  
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      // Filtrar IPv4 y direcciones no internas
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        
        // Priorizar rangos estándar locales de Wi-Fi/Ethernet domésticos
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
          return ip;
        }
        
        // Guardar como fallback si no es de red virtual Hamachi (25.x.x.x o 26.x.x.x)
        if (!ip.startsWith('25.') && !ip.startsWith('26.')) {
          fallbackIp = ip;
        }
      }
    }
  }
  
  return fallbackIp;
}

const localIp = getLocalIp();
const joinUrl = `http://${localIp}:${PORT}`;

// Obtener el nombre del Host de su perfil de Spotify
async function fetchHostProfileName(accessToken) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data.display_name || data.id;
    }
  } catch (err) {
    console.error('Error fetching host profile:', err);
  }
  return null;
}



// Guardar tokens en disco
function saveTokens(tokens) {
  spotifyTokens = { ...spotifyTokens, ...tokens };
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(spotifyTokens, null, 2));
    console.log('[Auth] Tokens guardados en disco.');
  } catch (error) {
    console.error('[Error] No se pudieron guardar los tokens:', error);
  }
}

// Helper: Refrescar el token de Spotify
async function refreshSpotifyToken() {
  if (!spotifyTokens.refreshToken) {
    throw new Error('No hay refresh token disponible.');
  }

  console.log('[Auth] Refrescando token de acceso de Spotify...');
  
  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', spotifyTokens.refreshToken);

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
    console.error('[Error Auth] Falló el refresco del token:', data);
    throw new Error(data.error_description || 'Error al refrescar el token');
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  saveTokens({
    accessToken: data.access_token,
    expiresAt,
    // Si viene un nuevo refresh token lo guardamos, si no dejamos el que estaba
    refreshToken: data.refresh_token || spotifyTokens.refreshToken
  });

  return data.access_token;
}

// Helper: Obtener un token de acceso válido
async function getValidAccessToken() {
  if (!spotifyTokens.accessToken) {
    throw new Error('El Host no está autenticado con Spotify.');
  }

  // Si expira en menos de 5 minutos, lo refrescamos
  if (Date.now() + 300000 > spotifyTokens.expiresAt) {
    return await refreshSpotifyToken();
  }

  return spotifyTokens.accessToken;
}

/* ==========================================================================
   RUTAS DE AUTENTICACIÓN (OAUTH 2.0)
   ========================================================================== */

// 1. Redirección para iniciar sesión en Spotify
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

// 2. Callback de redirección de Spotify
app.get('/api/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) {
    return res.redirect('/?error=state_mismatch');
  }

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
      console.error('[Error Callback] Falló el intercambio de código:', data);
      return res.redirect('/?error=token_exchange_failed');
    }

    const expiresAt = Date.now() + data.expires_in * 1000;
    const hostName = await fetchHostProfileName(data.access_token);
    saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      hostToken: HOST_TOKEN,
      hostName: hostName || 'Anfitrión'
    });

    // En producción: cookie HttpOnly + redirect a raíz
    // En desarrollo: token en el fragmento de URL (no viaja al servidor, solo lo lee el JS del host)
    if (process.env.NODE_ENV === 'production') {
      res.cookie('jam_host_token', HOST_TOKEN, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.redirect('/');
    } else {
      res.redirect(`http://localhost:5173/#host_token=${HOST_TOKEN}`);
    }
  } catch (error) {
    console.error('[Error Callback] Error en el intercambio:', error);
    res.redirect('/?error=internal_server_error');
  }
});

// 3. Estado de autenticación del host
app.get('/api/auth/status', (req, res) => {
  res.json({
    isAuthenticated: !!spotifyTokens.accessToken,
    expiresAt: spotifyTokens.expiresAt
  });
});

// 3.5. Obtener token de acceso para el SDK de reproducción web (solo el host verificado)
app.get('/api/auth/token', hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidAccessToken();
    res.json({ accessToken: token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  spotifyTokens = { accessToken: null, refreshToken: null, expiresAt: null };
  res.clearCookie('jam_host_token');
  if (fs.existsSync(TOKENS_FILE)) {
    try {
      fs.unlinkSync(TOKENS_FILE);
      console.log('[Auth] Tokens borrados del disco.');
    } catch (e) {
      console.error('[Error] No se pudo borrar el archivo de tokens:', e);
    }
  }
  res.json({ success: true });
});

// 4.5. Restablecer datos y base de datos local (Host)
app.post('/api/admin/reset', hostAuthMiddleware, (req, res) => {
  console.log('[Admin] Solicitud de restablecimiento de datos recibida de Host.');
  
  // Limpiar variables del servidor
  jamQueue = [];
  jamHistory = [];
  activeUsers = {};
  pendingGuests = {};
  currentTrackState = null;
  cachedSpotifyPlayback = null;
  lastSpotifyFetchTime = 0;
  
  // Eliminar archivos de estado y tokens
  if (fs.existsSync(STATE_FILE)) {
    try {
      fs.unlinkSync(STATE_FILE);
      console.log('[Admin] Archivo de estado jam_state.json borrado.');
    } catch (e) {
      console.error('[Error] No se pudo borrar jam_state.json:', e);
    }
  }

  if (fs.existsSync(TOKENS_FILE)) {
    try {
      fs.unlinkSync(TOKENS_FILE);
      spotifyTokens = { accessToken: null, refreshToken: null, expiresAt: null };
      console.log('[Admin] Archivo de tokens tokens.json borrado.');
    } catch (e) {
      console.error('[Error] No se pudo borrar tokens.json:', e);
    }
  }

  res.json({ success: true });
});

/* ==========================================================================
   RUTAS DE SEGURIDAD Y CONTROL DE ACCESO (INVITADOS)
   ========================================================================== */

// 1. Unirse como invitado (Solicitud de acceso)
app.post('/api/guest/join', (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Nombre de usuario requerido.' });
  }
  const cleanName = name.trim();

  // Asegurar que el invitado tenga un token de sesión
  if (!guestTokens[cleanName]) {
    guestTokens[cleanName] = crypto.randomBytes(16).toString('hex');
  }

  // Si ya estaba aprobado
  if (pendingGuests[cleanName] === 'approved') {
    activeUsers[cleanName] = Date.now();
    return res.json({ status: 'approved', guestToken: guestTokens[cleanName] });
  }

  // Si está rechazado, permitir re-solicitar reiniciando a pending
  if (pendingGuests[cleanName] === 'rejected') {
    pendingGuests[cleanName] = 'pending';
    console.log(`[Security] Invitado rechazado re-solicita acceso: ${cleanName}`);
    saveJamState();
    return res.json({ status: 'pending', guestToken: guestTokens[cleanName] });
  }

  // De lo contrario, iniciar solicitud o mantener estado 'pending'
  if (!pendingGuests[cleanName]) {
    pendingGuests[cleanName] = 'pending';
    console.log(`[Security] Nueva solicitud de acceso de invitado: ${cleanName}`);
    saveJamState();
  }

  res.json({ status: pendingGuests[cleanName], guestToken: guestTokens[cleanName] });
});

// 2. Consultar estado de aprobación del invitado
app.get('/api/guest/status', (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Falta parámetro name.' });
  }
  const cleanName = name.trim();
  const status = pendingGuests[cleanName] || 'not_requested';

  if (status === 'approved') {
    activeUsers[cleanName] = Date.now();
  }

  res.json({ status });
});

// 3. Obtener lista de solicitudes pendientes y rechazadas/aprobadas
app.get('/api/guest/pending', (req, res) => {
  const pending = Object.keys(pendingGuests)
    .filter(name => pendingGuests[name] === 'pending')
    .map(name => ({ name }));
  res.json(pending);
});

// 4. Aprobar/Rechazar solicitud
app.post('/api/guest/approve', hostAuthMiddleware, (req, res) => {
  const { name, action } = req.body; // action: 'approve' | 'reject'
  if (!name || !action) {
    return res.status(400).json({ error: 'Faltan parámetros name y action.' });
  }
  const cleanName = name.trim();

  if (action === 'approve') {
    pendingGuests[cleanName] = 'approved';
    activeUsers[cleanName] = Date.now();
    console.log(`[Security] Invitado aprobado por el Host: ${cleanName}`);
  } else if (action === 'reject') {
    pendingGuests[cleanName] = 'rejected';
    delete activeUsers[cleanName];
    console.log(`[Security] Invitado rechazado por el Host: ${cleanName}`);
  } else {
    return res.status(400).json({ error: 'Acción no válida.' });
  }

  saveJamState();
  invalidatePlaybackCache();
  res.json({ success: true, pendingGuests });
});

/* ==========================================================================
   RUTAS DE INFORMACIÓN DE RED
   ========================================================================== */

app.get('/api/info', (req, res) => {
  res.json({
    localIp,
    port: PORT,
    joinUrl,
    hostName: spotifyTokens.hostName || 'Anfitrión'
  });
});

/* ==========================================================================
   RUTAS DEL REPRODUCTOR Y PLAYBACK
   ========================================================================== */

// 1. Obtener estado del reproductor actual (Dispositivos + Cola + Canción actual)
app.get('/api/playback', async (req, res) => {
  // Registrar actividad del invitado (si se proporciona su nombre en el polling y está aprobado)
  const { guestName } = req.query;
  if (guestName && guestName.trim()) {
    const cleanName = guestName.trim();
    if (cleanName === 'Host' || cleanName === 'Anfitrión' || pendingGuests[cleanName] === 'approved') {
      activeUsers[cleanName] = Date.now();
    }
  }

  // Limpiar usuarios inactivos (más de 10 segundos sin responder)
  const now = Date.now();
  for (const name in activeUsers) {
    if (now - activeUsers[name] > 10000) {
      delete activeUsers[name];
    }
  }

  try {
    const nowTime = Date.now();
    
    // Si la caché expiró (más de 1.5 segundos), consultamos a Spotify
    if (!cachedSpotifyPlayback || (nowTime - lastSpotifyFetchTime > 1500)) {
      const token = await getValidAccessToken();

      // 1. Obtener canción actual
      const playbackResponse = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let activeDevice = null;
      let currentlyPlaying = null;

      if (playbackResponse.status === 200) {
        const data = await playbackResponse.json();
        activeDevice = data.device;
        
        // Auto-desactivar repetición si está activo para asegurar flujo de cola colaborativa
        if (data.repeat_state && data.repeat_state !== 'off') {
          console.log(`[Playback] Detectado modo de repetición: ${data.repeat_state}. Desactivándolo para asegurar flujo de cola...`);
          fetch(`https://api.spotify.com/v1/me/player/repeat?state=off`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(err => console.error('[Error Repeat] No se pudo desactivar repetición:', err));
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
          
          // Si cambió la canción en reproducción
          if (currentTrackState && currentTrackState.id !== currentlyPlaying.id) {
            // Si el cambio fue provocado por /api/playback/next, no es una desviación
            const isForcedTransition = (lastForcedUri !== null && lastForcedUri === currentlyPlaying.uri);
            if (isForcedTransition) {
              lastForcedUri = null;
            }

            // Si hay canciones en cola, verificar si se desvió de lo esperado
            // (omitir la comprobación en transiciones forzadas por el host)
            if (jamQueue.length > 0 && !isForcedTransition) {
              const nextExpectedTrack = jamQueue[0];
              if (currentlyPlaying.uri !== nextExpectedTrack.uri) {
                console.log(`[Queue Sync] Desviación detectada. Sonando: ${currentlyPlaying.name}, Esperada: ${nextExpectedTrack.name}. Redirigiendo reproducción...`);

                // Forzar reproducción de la canción esperada de nuestra cola
                fetch('https://api.spotify.com/v1/me/player/play', {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ uris: [nextExpectedTrack.uri] })
                }).catch(err => console.error('[Queue Sync Error] Falló redirección:', err));

                currentTrackState = currentlyPlaying;
                cachedSpotifyPlayback = { currentlyPlaying, activeDevice };
                lastSpotifyFetchTime = Date.now();
                return res.json({
                  currentlyPlaying,
                  activeDevice,
                  queue: jamQueue,
                  history: jamHistory,
                  users: Object.keys(activeUsers)
                });
              }
            }

            // Flujo normal: guardar en el historial la canción anterior
            const matchedItem = jamQueue.find(item => item.uri === currentTrackState.uri) || 
                                jamHistory.find(item => item.uri === currentTrackState.uri);
            const addedBy = matchedItem ? matchedItem.addedBy : 'Sistema / Spotify';

            if (jamHistory.length === 0 || jamHistory[0].uri !== currentTrackState.uri) {
              jamHistory.unshift({
                id: `${currentTrackState.uri}-${Date.now()}`,
                uri: currentTrackState.uri,
                name: currentTrackState.name,
                artists: currentTrackState.artists,
                albumArt: currentTrackState.albumArt,
                addedBy,
                playedAt: Date.now()
              });
              if (jamHistory.length > 30) {
                jamHistory.pop();
              }
              saveJamState();
            }

            // Auto-sincronización de la cola
            const index = jamQueue.findIndex(item => item.uri === currentlyPlaying.uri);
            if (index !== -1) {
              console.log(`[Queue Sync] Nueva canción detectada en reproducción. Limpiando cola local hasta el índice ${index}: ${jamQueue[index].name}`);
              jamQueue = jamQueue.slice(index + 1);
              saveJamState();
            }
          } else if (!currentTrackState) {
            // Carga inicial
            if (jamQueue.length > 0 && jamQueue[0].uri === currentlyPlaying.uri) {
              console.log(`[Queue Sync] Carga inicial: canción en reproducción detectada en el tope de la cola. Removiendo: ${jamQueue[0].name}`);
              jamQueue = jamQueue.slice(1);
              saveJamState();
            }
          }
          
          currentTrackState = currentlyPlaying;
        }
      } else if (playbackResponse.status === 204 || (currentlyPlaying && !currentlyPlaying.isPlaying)) {
        // Si no está reproduciendo o regresó 204, y teníamos una canción sonando que estaba por terminar
        const wasNearEnd = currentTrackState && (currentTrackState.durationMs - currentTrackState.progressMs < 5000);
        
        if ((playbackResponse.status === 204 || wasNearEnd) && jamQueue.length > 0) {
          const nextTrack = jamQueue[0];
          console.log(`[Queue Sync] El reproductor se detuvo o terminó la canción. Iniciando la siguiente de la cola: ${nextTrack.name}`);
          
          fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: [nextTrack.uri] })
          }).catch(err => console.error('[Queue Sync Error] Falló reproducción automática:', err));
        }
        currentTrackState = null;
      }

      cachedSpotifyPlayback = { currentlyPlaying, activeDevice };
      lastSpotifyFetchTime = Date.now();
    }

    res.json({
      currentlyPlaying: cachedSpotifyPlayback ? cachedSpotifyPlayback.currentlyPlaying : null,
      activeDevice: cachedSpotifyPlayback ? cachedSpotifyPlayback.activeDevice : null,
      queue: jamQueue,
      history: jamHistory,
      users: Object.keys(activeUsers)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener lista de dispositivos
app.get('/api/playback/devices', async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      console.warn('[Devices Fetch] Spotify regresó estado no exitoso:', response.status);
      return res.json([]);
    }
    const data = await response.json().catch(() => ({}));
    res.json(data.devices || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Transferir reproducción a un dispositivo
app.post('/api/playback/transfer', hostAuthMiddleware, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'Falta deviceId' });
  }

  try {
    const token = await getValidAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true
      })
    });

    if (response.ok || response.status === 204) {
      invalidatePlaybackCache();
      res.json({ success: true });
    } else {
      const errData = await response.json().catch(() => ({}));
      res.status(response.status).json(errData);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Pausar
app.put('/api/playback/pause', hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Spotify devuelve 204 No Content en caso de éxito
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache();
      res.json({ success: true });
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Reproducir (admite uris opcionales en el body)
app.put('/api/playback/play', hostAuthMiddleware, async (req, res) => {
  const { uris } = req.body || {};
  try {
    const token = await getValidAccessToken();
    const options = {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    
    if (uris && Array.isArray(uris)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ uris });
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/play', options);
    
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache();
      res.json({ success: true });
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Siguiente canción (Saltar)
app.post('/api/playback/next', hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidAccessToken();
    
    if (jamQueue.length > 0) {
      const nextTrack = jamQueue[0];
      console.log(`[Playback Next] Forzando reproducción de la primera canción de la cola: ${nextTrack.name}`);
      
      const response = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [nextTrack.uri] })
      });
      
      if (response.status === 204 || response.ok) {
        // Agregar al historial la canción que se está saltando (la actual), no la siguiente
        if (currentTrackState) {
          const matchedQueueItem = jamQueue.find(i => i.uri === currentTrackState.uri);
          const prevAddedBy = matchedQueueItem
            ? matchedQueueItem.addedBy
            : (jamHistory.find(i => i.uri === currentTrackState.uri)?.addedBy || 'Sistema / Spotify');
          if (jamHistory.length === 0 || jamHistory[0].uri !== currentTrackState.uri) {
            jamHistory.unshift({
              id: `${currentTrackState.uri}-${Date.now()}`,
              uri: currentTrackState.uri,
              name: currentTrackState.name,
              artists: currentTrackState.artists,
              albumArt: currentTrackState.albumArt,
              addedBy: prevAddedBy,
              playedAt: Date.now()
            });
            if (jamHistory.length > 30) jamHistory.pop();
          }
        }
        // Remover la siguiente canción de la cola y registrarla como transición forzada
        jamQueue.shift();
        lastForcedUri = nextTrack.uri;
        saveJamState();
        invalidatePlaybackCache();
        return res.json({ success: true, queue: jamQueue, history: jamHistory });
      } else {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json(err);
      }
    } else {
      // Si la cola está vacía, hacer el skip normal
      const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 204 || response.ok) {
        invalidatePlaybackCache();
        return res.json({ success: true });
      } else {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json(err);
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Canción anterior (Regresar)
app.post('/api/playback/previous', hostAuthMiddleware, async (req, res) => {
  try {
    const token = await getValidAccessToken();
    const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 204 || response.ok) {
      invalidatePlaybackCache();
      res.json({ success: true });
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Buscar/Avanzar/Retroceder en la canción actual (Seek)
app.post('/api/playback/seek', hostAuthMiddleware, async (req, res) => {
  let { positionMs, relativeMs } = req.body;
  try {
    const token = await getValidAccessToken();
    
    // Si se pasa una posición relativa (ej: -15000 para retroceder 15s)
    if (relativeMs !== undefined) {
      const playResponse = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (playResponse.status === 200) {
        const data = await playResponse.json();
        const currentProgress = data.progress_ms || 0;
        positionMs = Math.max(0, currentProgress + relativeMs);
        
        // No avanzar más allá del total de la canción
        if (data.item && positionMs > data.item.duration_ms) {
          positionMs = data.item.duration_ms - 1000;
        }
      } else {
        return res.status(400).json({ error: 'No hay reproducción activa para ajustar la posición.' });
      }
    }
    
    if (positionMs === undefined) {
      return res.status(400).json({ error: 'Falta posición (positionMs).' });
    }

    const response = await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok || response.status === 204) {
      invalidatePlaybackCache();
      res.json({ success: true, positionMs });
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Cambiar Volumen
app.put('/api/playback/volume', hostAuthMiddleware, async (req, res) => {
  const { volumePercent } = req.body;
  if (volumePercent === undefined || volumePercent < 0 || volumePercent > 100) {
    return res.status(400).json({ error: 'Volumen inválido. Debe estar entre 0 y 100.' });
  }

  try {
    const token = await getValidAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok || response.status === 204) {
      invalidatePlaybackCache();
      res.json({ success: true, volumePercent });
    } else {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json(err);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar que el token de invitado enviado coincida con el registrado para ese nombre
function verifyGuestToken(req, guestName) {
  const token = req.headers['x-guest-token'];
  return token && guestTokens[guestName] === token;
}

/* ==========================================================================
   RUTAS DE BÚSQUEDA Y GESTIÓN DE COLA (INVITADOS)
   ========================================================================== */

// 1. Buscar canciones
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  try {
    const token = await getValidAccessToken();
    const response = await fetch(
      'https://api.spotify.com/v1/search?' + new URLSearchParams({
        q: query,
        type: 'track',
        limit: 15
      }).toString(),
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('[Error Search] Falló búsqueda en Spotify:', data);
      return res.status(response.status).json(data);
    }

    // Simplificar resultados
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
    console.error('[Error Search]', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Agregar una canción a la cola
app.post('/api/queue', async (req, res) => {
  const { uri, name, artists, albumArt, addedBy } = req.body;

  if (!uri) {
    return res.status(400).json({ error: 'Falta URI de la canción.' });
  }

  // No permitir canciones duplicadas en la cola local
  const isDuplicate = jamQueue.some(item => item.uri === uri);
  if (isDuplicate) {
    return res.status(400).json({ error: 'Esta canción ya está en la cola de la sala.' });
  }

  const guestName = addedBy ? addedBy.trim() : 'Anónimo';
  const isHost = isHostRequest(req);

  // Validar si el invitado está aprobado por el Host antes de dejarlo encolar
  if (!isHost) {
    if (guestName === 'Host' || guestName === 'Anfitrión') {
      return res.status(403).json({ error: 'Nombre de usuario reservado para el anfitrión.' });
    }
    if (pendingGuests[guestName] !== 'approved') {
      return res.status(403).json({ error: 'No tienes acceso autorizado por el anfitrión para agregar canciones.' });
    }
    if (!verifyGuestToken(req, guestName)) {
      return res.status(403).json({ error: 'Token de invitado inválido. Vuelve a unirte a la sala.' });
    }
  }

  try {
    const token = await getValidAccessToken();

    // Consultar si hay reproducción activa para decidir si reproducir de inmediato
    const playbackCheck = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let isIdle = true;
    if (playbackCheck.status === 200) {
      const pbData = await playbackCheck.json();
      if (pbData && pbData.item) {
        isIdle = false;
      }
    }

    const queueItem = {
      id: `${uri}-${Date.now()}`,
      uri,
      name,
      artists,
      albumArt,
      addedBy: guestName,
      addedAt: Date.now()
    };

    // Si la cola local está vacía y el reproductor de Spotify está inactivo (idle), reproducir directamente
    if (jamQueue.length === 0 && isIdle) {
      console.log(`[Queue] Reproductor inactivo. Reproduciendo directamente la canción añadida: ${name}`);
      const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri] })
      });
      if (!playResponse.ok && playResponse.status === 404) {
        return res.status(404).json({ 
          error: 'No se detecta reproducción activa. El anfitrión debe abrir Spotify y reproducir algo primero.' 
        });
      }
    } else {
      console.log(`[Queue] Añadiendo a la cola colaborativa local (sin enviar a Spotify aún): ${name}`);
    }

    jamQueue.push(queueItem);
    saveJamState();
    invalidatePlaybackCache();
    res.json({ success: true, queue: jamQueue });
  } catch (error) {
    console.error('[Error Queue]', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Eliminar una canción de la cola colaborativa (por ID)
app.delete('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  const { guestName } = req.query;

  const index = jamQueue.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Canción no encontrada o no autorizada.' });
  }

  const item = jamQueue[index];
  const isHost = isHostRequest(req);
  
  // Si no es el host verificado, validar identidad y propiedad del invitado
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

  console.log(`[Queue Remove] Canción eliminada de la cola local: ${item.name} - ${item.artists} (por ${isHost ? 'Anfitrión' : guestName})`);
  jamQueue.splice(index, 1);
  saveJamState();
  invalidatePlaybackCache();
  res.json({ success: true, queue: jamQueue });
});

// 4. Reordenar la cola colaborativa (por el anfitrión)
app.put('/api/queue/reorder', hostAuthMiddleware, (req, res) => {
  const { newQueue } = req.body;
  if (!Array.isArray(newQueue)) {
    return res.status(400).json({ error: 'Cola de reproducción inválida.' });
  }

  // Actualizar jamQueue local en memoria con el nuevo orden
  jamQueue = newQueue;
  console.log('[Queue Reorder] La cola fue reordenada por el anfitrión.');
  saveJamState();
  invalidatePlaybackCache();
  res.json({ success: true, queue: jamQueue });
});

// 5. Obtener cola actual
app.get('/api/queue', (req, res) => {
  res.json(jamQueue);
});

// Redirigir cualquier otra petición al index.html en producción
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(` JamSpotify Backend escuchando en el puerto ${PORT}`);
  console.log(` Acceso local (Host): http://localhost:${PORT}`);
  console.log(` Enlace para invitados: ${joinUrl}`);
  console.log('==================================================');
});
