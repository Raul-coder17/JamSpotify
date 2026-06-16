const crypto = require('crypto');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  pool.on('error', (err) => {
    console.error('[DB] Error inesperado en cliente de base de datos:', err.message);
  });
  return pool;
}

async function initSchema() {
  const p = getPool();
  if (!p) {
    console.log('[DB] DATABASE_URL no configurado — estado de sala en memoria solamente.');
    return;
  }
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        host_spotify_id TEXT NOT NULL DEFAULT '',
        host_name TEXT DEFAULT 'Anfitrión',
        host_token TEXT NOT NULL,
        access_token TEXT NOT NULL DEFAULT '',
        refresh_token TEXT NOT NULL DEFAULT '',
        expires_at BIGINT NOT NULL DEFAULT 0,
        jam_queue JSONB DEFAULT '[]',
        jam_history JSONB DEFAULT '[]',
        pending_guests JSONB DEFAULT '{}',
        guest_tokens JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rooms_last_active ON rooms(last_active_at);
    `);
    console.log('[DB] Schema inicializado correctamente.');
  } catch (err) {
    console.error('[DB] Error al inicializar schema:', err.message);
  }
}

function encryptToken(token) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || !token) return token || '';
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    return iv.toString('hex') + ':' + cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
  } catch {
    return token;
  }
}

function decryptToken(encrypted) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || !encrypted || !encrypted.includes(':')) return encrypted || '';
  try {
    const [ivHex, data] = encrypted.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(ivHex, 'hex'));
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
  } catch {
    return encrypted;
  }
}

async function saveRoom(roomId, fields) {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(`
      INSERT INTO rooms (
        id, host_spotify_id, host_name, host_token,
        access_token, refresh_token, expires_at,
        jam_queue, jam_history, pending_guests, guest_tokens, last_active_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (id) DO UPDATE SET
        host_spotify_id = EXCLUDED.host_spotify_id,
        host_name       = EXCLUDED.host_name,
        host_token      = EXCLUDED.host_token,
        access_token    = EXCLUDED.access_token,
        refresh_token   = EXCLUDED.refresh_token,
        expires_at      = EXCLUDED.expires_at,
        jam_queue       = EXCLUDED.jam_queue,
        jam_history     = EXCLUDED.jam_history,
        pending_guests  = EXCLUDED.pending_guests,
        guest_tokens    = EXCLUDED.guest_tokens,
        last_active_at  = NOW()
    `, [
      roomId,
      fields.hostSpotifyId || '',
      fields.hostName || 'Anfitrión',
      fields.hostToken || '',
      encryptToken(fields.accessToken || ''),
      encryptToken(fields.refreshToken || ''),
      fields.expiresAt || 0,
      JSON.stringify(fields.jamQueue || []),
      JSON.stringify(fields.jamHistory || []),
      JSON.stringify(fields.pendingGuests || {}),
      JSON.stringify(fields.guestTokens || {})
    ]);
  } catch (err) {
    console.error('[DB] Error al guardar sala:', err.message);
  }
}

async function loadRoom(roomId) {
  const p = getPool();
  if (!p) return null;
  try {
    const result = await p.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (!result.rows.length) return null;
    const r = result.rows[0];
    return {
      hostSpotifyId: r.host_spotify_id,
      hostName: r.host_name,
      hostToken: r.host_token,
      accessToken: decryptToken(r.access_token),
      refreshToken: decryptToken(r.refresh_token),
      expiresAt: Number(r.expires_at),
      jamQueue: r.jam_queue || [],
      jamHistory: r.jam_history || [],
      pendingGuests: r.pending_guests || {},
      guestTokens: r.guest_tokens || {}
    };
  } catch (err) {
    console.error('[DB] Error al cargar sala:', err.message);
    return null;
  }
}

async function deleteRoom(roomId) {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM rooms WHERE id = $1', [roomId]);
  } catch (err) {
    console.error('[DB] Error al eliminar sala:', err.message);
  }
}

module.exports = { initSchema, saveRoom, loadRoom, deleteRoom };
