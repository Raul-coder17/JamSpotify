# Rediseño de Interfaz — JamSpotify

## Objetivo
Reimplementar el diseño de `design_handoff_jamspotify_redesign` (spec + mockup de Claude Design) en frontend/src/App.jsx e index.css, sin tocar lógica de negocio ni backend.

## Estado
Fase 4 en curso: 4.A (cascarón) y 4.B (reproductor col A) completados. Siguen 4.C–4.G.

## Fases
0. Checkpoint (rama + commit) — ✅ hecho, commit b98eebf
1. Fundaciones de estilo (tokens tema + keyframes en index.css) — ✅ hecho
2. Toggle de tema claro/oscuro — ✅ hecho
3. Pantallas simples (bienvenida, esperando, rechazado, modal nickname) — ✅ hecho
4. Dashboard: reestructuración 3 columnas + reinyección de gaps funcionales — en curso
   - 4.A Cascarón estructural (shell 100vh + header + grid 3 col) — ✅ hecho
   - 4.B Columna A: reproductor (carátula álbum, transporte 5 botones, volumen, estado vacío) — ✅ hecho
   - 4.C Columna B: buscador (input, filas, botón Agregar 4 estados) — pendiente
   - 4.D Columna C: cola/historial (tabs, drag&drop, permisos, 3 acciones historial) — pendiente
   - 4.E Tarjeta de aprobaciones restilizada (encima de la cola, col C) — pendiente
   - 4.F Modal Compartir (botón Invitar → modal; URL sigue OCULTA) — pendiente
   - 4.G Popover Dispositivos (conserva Refrescar/WebPlayer/estados) — pendiente
5. Switch Álbum/Vinilo — pendiente
6. Layout móvil (tabs + mini-player) — pendiente
7. Limpieza y cierre — pendiente

## Gaps funcionales a preservar (el mockup no los incluye)
- Panel de aprobación de invitados pendientes
- Botones Restablecer Sala / Desconectar
- Seek ±15s + clic en barra de progreso
- "Reproducir ahora" desde historial
- 4 estados del botón Agregar (loading/success/duplicate/error)

## Changelog

### Fase 1 — Fundaciones de estilo (index.css)
**Qué cambió:** cambio puramente **aditivo** en `frontend/src/index.css`. No se modificó ni eliminó ninguna variable, regla o keyframe existente, ni el markup de `App.jsx`.
- Se agregaron al `:root` los tokens del rediseño para tema **oscuro** (default): `--bg`, `--bg-glow` (halos radiales violeta/verde), `--surface`, `--surface2`, `--surface3`, `--border`, `--border2`, `--text`, `--text2`, `--text3`, `--track`, `--shadow`, y los de acento `--green`, `--greenText`, `--onGreen`, `--greenSoft`, `--violet`.
- Se agregó el bloque `[data-theme="light"]` con los overrides del tema **claro** (incluye `--greenText: #12813b` por contraste). Sin efecto hasta que un contenedor reciba `data-theme` (Fase 2).
- Se agregaron 4 keyframes: `jamspin`, `jampulse`, `jameq`, `jamup`.

**Antes/después:** sin cambio visual en la app actual. El markup vigente sigue usando las variables antiguas (`--bg-primary`, `--spotify-green`, `--text-primary`, etc.), intactas. Los tokens nuevos quedan disponibles pero sin consumir todavía.

**Cómo se validó:**
- `npm run build` en `frontend/` → build exitoso (16 módulos, sin errores de sintaxis CSS).
- Grep del bundle `dist/assets/*.css`: confirmados los nuevos (`--surface2`, `--greenSoft`, `--violet`, `data-theme`, `jamspin/jampulse/jameq/jamup`) **y** los antiguos (`--bg-primary`, `--spotify-green`, `--text-primary`, `--border-glass`) coexistiendo.

**Archivos tocados:** `frontend/src/index.css` (solo adiciones).

### Fase 2 — Toggle de tema claro/oscuro (App.jsx)
**Qué cambió:** cambios acotados en `frontend/src/App.jsx` únicamente. No se tocó layout, columnas, ni otras pantallas/componentes.
- Iconos `Sun` y `Moon` (SVG inline estilo Feather) agregados al objeto `Icons`.
- Estado `theme` (`'dark' | 'light'`) inicializado desde `localStorage['jamspotify-theme']`, default `'dark'`.
- `useEffect([theme])` que aplica `data-theme={theme}` a `document.documentElement` (elemento raíz que envuelve todas las pantallas) y persiste en `localStorage`. Handler `toggleTheme` que alterna el valor.
- Botón sol/luna (`btn-secondary`, 38×38) agregado como primer elemento del clúster derecho del header, sin reordenar los controles existentes (dispositivo/reset/logout del host, tag del invitado). Visible en host e invitado.

**Antes/después:**
- Antes: app solo oscura; no había forma de cambiar tema; `[data-theme="light"]` de la Fase 1 nunca se activaba.
- Después: el header muestra sol (en oscuro) / luna (en claro); al pulsarlo, `document.documentElement` recibe `data-theme` y los tokens de la Fase 1 conmutan en tiempo real. La preferencia persiste entre recargas.

**Cómo se validó:**
- `npm run build` → exitoso.
- `eslint src/App.jsx`: 16 problemas, **todos preexistentes** (líneas 1, 134, 179, 238, 259, 275, 329, 336, 357, 379, 460, 486, 491, 510, 608, 887); ninguno en las regiones añadidas. Fase 2 = 0 problemas nuevos.
- Prueba en navegador (Vite dev + preview): al cargar, `data-theme="dark"` aplicado por el efecto; al conmutar a `light`, `--bg`/`--surface`/`--text`/`--greenText` cambian a los valores claros de la Fase 1 en tiempo real; `localStorage['jamspotify-theme']='light'`; **tras recargar**, React inicializa en `light` y aplica los tokens claros. Sin errores de consola.

**Archivos tocados:** `frontend/src/App.jsx` (adiciones acotadas). Nota: se creó `.claude/launch.json` (config del dev server para preview) — tooling local, sin trackear, fuera de este commit.

### Fase 3 — Pantallas simples (App.jsx + index.css)
**Qué cambió:** se reimplementó el **markup** de 4 vistas (bienvenida, esperando aprobación, rechazado, modal nickname) con el estilo del rediseño. **No se tocó ningún handler, estado, prop ni useEffect** — solo el JSX de presentación y las clases. El dashboard y su lógica quedaron intactos.
- `index.css`: se agregó un bloque de clases con prefijo `.rd-*` (`.rd-screen`, `.rd-card`, `.rd-brand`, `.rd-btn-primary/secondary/danger`, `.rd-input`, `.rd-modal-overlay`, `.rd-dots`/`.rd-dot`, `.rd-features`/`.rd-feature*`) construidas sobre los tokens de la Fase 1 y `[data-theme]`. Aisladas: el dashboard no usa ninguna. No se eliminó ni modificó ninguna clase previa (`.glass-panel`, `.btn-primary`, etc. siguen para el dashboard).
- `App.jsx`: los 4 bloques `return`/markup pasaron de `.app-container`/`.glass-panel`/`.logo`/`.btn-*`/`.input-glow`/`.modal-overlay` (tokens viejos) a las clases `.rd-*` (tokens nuevos). Se conservaron literalmente: `href="/api/auth/login"`, los `onClick` (setAppMode, setShowNickModal, `localStorage.removeItem('jam_guest_name')` + reset de estado), el `<form onSubmit={handleSaveNick}>`, los atributos del input (`required`, `maxLength`, `value`, `onChange`, `autoFocus`), y las condiciones (`urlError === 'not_authorized'`, `roomId`, `guestName`).
- `.gitignore`: se añadió `.claude/launch.json` (no se trackea).

**Antes/después:**
- Antes: 4 pantallas con el estilo viejo (glassmorphism oscuro, vars antiguas), sin respuesta al tema claro.
- Después: 4 pantallas con tarjetas `--surface`, tipografía Outfit/Inter, botones y features del mockup; **responden a dark/light** heredando los tokens del `data-theme` del elemento raíz.

**Cómo se validó:**
- `npm run build` → exitoso.
- `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend memory-only + preview): las **4 pantallas** verificadas visualmente en **dark y light**:
  - Bienvenida (dark/light), Esperando aprobación (dark/light), Rechazado (dark/light), Modal nickname (light). Rejected se forzó interceptando el poll `/guest/status` → `{status:'rejected'}` para ejercitar el render real de React.
  - Sin errores de consola nuevos atribuibles al rediseño: los únicos errores (`Error cargando info de sala`, `App.jsx:547`) provienen del fetch a `/info` contra la sala de prueba inexistente `demo` (manejo de error preexistente), no de la Fase 3.

**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `.gitignore`.

### Fix intermedio — Login OAuth en desarrollo (NO es rediseño)
**Problema:** con `redirect_uri` en `127.0.0.1:3000` (obligado por Spotify) y Vite en `localhost:5173`, el callback fijaba la cookie de host en `127.0.0.1` y redirigía a `localhost` → cookie invisible → el anfitrión nunca se autenticaba → no controlaba reproducción ni podía aprobar invitados. Ajeno al rediseño (preexistente).
**Arreglo:** en dev, el callback ahora devuelve el token del host por el **hash de la URL** (`#host_token=...`), independiente del origen (patrón ya documentado en CLAUDE.md). El frontend lo lee en el efecto de arranque, lo guarda en `localStorage.jam_host_token` y limpia el hash. Producción (cookie httpOnly) sin cambios.
**Archivos:** `backend/server.js` (rama dev del callback), `frontend/src/App.jsx` (efecto de auto-detección).
**Validado:** build OK, 0 lint nuevos, y en navegador el token del hash se captura en `localStorage` y el hash se limpia conservando `?roomId=`. El intercambio real con Spotify queda pendiente de prueba del usuario.

### Fix intermedio 2 — Header X-Host-Token faltante en llamadas de host (dev)
**Problema:** `GET /guest/pending` (y `POST /auth/logout`) se llamaban **sin** el header `X-Host-Token`. En producción funciona porque la cookie httpOnly `jam_host_token` viaja sola; en dev (sin esa cookie) el backend respondía **403** → el host no veía las solicitudes de invitados aunque la terminal las registrara, y no podía aprobarlas. Reproducción/búsqueda/otros controles sí funcionaban porque esos fetch ya mandaban el header.
**Arreglo:** añadido `headers: { 'X-Host-Token': hostToken }` a los fetch de `/guest/pending` (+ `hostToken` en las deps del efecto de polling) y `/auth/logout`. Auditados los 14 endpoints host-auth: el resto ya lo enviaba.
**Archivos:** `frontend/src/App.jsx`.
**Validado:** build OK, 0 lint nuevos. Confirmación end-to-end (aparición del invitado pendiente) pendiente de re-prueba del usuario con una sala real.

### Fase 4 — Decisiones de diseño confirmadas (Raúl)
1. Restablecer/Desconectar: botones compactos en el header (no menú "⋯").
2. URL de invitación: se mantiene **oculta** (no adoptar el texto plano del mockup).
3. En Fase 4 la carátula es estilo álbum (cuadrada); el switch álbum/vinilo llega en Fase 5.
4. Responsive <1000px hasta Fase 6: apilar las 3 columnas con scroll de página.
5. `errorAlert`: banner bajo el header, sin lógica nueva.
6. Gaps adicionales también intocables: drag&drop de la cola, eliminar del historial, permisos de borrado por rol (host todo / invitado solo lo suyo), selector de dispositivos rico (Refrescar, Web Player, estados connecting/vacío).

### Fase 4.A — Cascarón del dashboard (App.jsx + index.css)
**Qué cambió:** solo estructura/presentación del dashboard. **Ningún handler, estado, prop ni efecto tocado.**
- `index.css` (aditivo): bloque `.rd-dash-*` — `.rd-dash-shell` (100vh, flex column, `overflow:hidden`, fondo `--bg`/`--bg-glow`), `.rd-dash-header` (borde inferior, clústeres izq/der), `.rd-dash-brand`, `.rd-dash-pill` (+ `.rd-dash-dot` violeta / `.rd-dash-dot-online` verde con `jampulse`), `.rd-dash-hbtn` (+ variantes `-icon`, `-danger`, `.active`), `.rd-dash-invite` (verde), `.rd-dash-alert`, `.rd-dash-grid` (grid `300px / minmax(0,1fr) / 336px`, `min-height:0`), `.rd-dash-col` (scroll interno `overflow-y:auto`). Media query `<1000px`: shell con altura auto, grid en columna apilada con scroll de página (fallback temporal hasta Fase 6). Las clases viejas (`.app-container`, `.header`, `.dashboard-grid`) quedan sin uso pero intactas (limpieza en Fase 7).
- `App.jsx`: el `return` del dashboard pasa de `.app-container`/`.header`/`.dashboard-grid` (2 col) al shell nuevo (3 col). Header: marca clicable (mismo `setAppMode('choose')`), pill "Sala de {host}" (invitado), pill "N en línea" (mismas condiciones y tooltip), botón dispositivo (mismo toggle), toggle tema, Restablecer Sala (`-danger`) y Desconectar (host), botón verde **Invitar** (host; transitorio: hace scroll al panel de compartir vía `id="rd-share-panel"` hasta que 4.F lo convierta en modal), tag "Invitado: X" + Editar (invitado). Columnas: A = selector de dispositivos (transitorio aquí hasta 4.G, antes vivía entre header y grid) + reproductor; B = buscador; C = aprobaciones + compartir + cola/historial. Los paneles internos conservan sus clases `.glass-panel` viejas (se restilizan en 4.B–4.G).
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + **backend stub** en :3000 que simula los endpoints de sala; scratchpad, fuera del repo):
  - **Desktop (1340×864):** shell = 100vh exacto, sin scroll de página; grid `300/624/336`; columna C con scroll interno (contenido 1163px en viewport de 757px). Header host completo (pill online, dispositivo, tema, reset, desconectar, Invitar).
  - **Funcional (host):** búsqueda con debounce → resultados; Agregar → "Agregada" (success) y "Ya en cola" (duplicate, deshabilitado); contador de cola actualizado por polling (3→4); pestaña Historial con las 3 acciones (Reproducir ahora → cambió la canción del reproductor, Eliminar del historial, re-agregar); Aceptar solicitud → panel 2→1; seek +15s (0:12→0:27) y clic al 50% de la barra (→1:47 de 3:34); toggle tema → tokens light en el shell + persistencia.
  - **Invitado** (`mode=guest` aprobado por stub): pill "Sala de …", tag + Editar; sin transporte/volumen/seek/reset/Invitar/panel compartir; 0 botones de borrado en canciones ajenas.
  - **<1000px (817px):** columnas apiladas a ancho completo con scroll de página.
  - Errores de consola: solo los del Spotify Web Player SDK con token stub (preexistentes, ajenos al rediseño).
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

### Fase 4.B — Columna A: reproductor (App.jsx + index.css)
**Qué cambió:** restilizado completo de la tarjeta del reproductor. **Ningún handler, estado, prop ni useEffect tocado** — mismos `seekAbsolute`, `seekRelative`, `togglePlay`, `skipPrevious/Next`, `toggleMute`, `handleVolumeChange`, `setShowDeviceSelector` y expresiones de volumen, solo cambió el JSX de presentación y las clases.
- `index.css` (aditivo): bloque `.rd-player-*` sobre tokens del rediseño — `.rd-player` (tarjeta `--surface`, radius 22, `flex:1 0 auto` para llenar la columna sin encoger), `.rd-player-label` (REPRODUCIENDO), `.rd-player-art` (carátula **cuadrada 200px** con imagen real de Spotify; el vinilo giratorio se retira — el switch álbum/vinilo llega en Fase 5), `.rd-player-eq` (insignia ecualizador flotante sobre la carátula, 4 barras `jameq`, estado `.paused` estático; sustituye al texto "Sonando/Pausado" + visualizador viejo, el estado queda en el `title` y en la animación), `.rd-player-title/artist`, `.rd-player-progress/track/fill/times` (track 6px, `.clickable` con cursor pointer), `.rd-player-transport` + `.rd-player-btn`/`-seek`/`.rd-player-play` (5 botones: prev, −15s, play 56px verde, +15s, next — mismo orden que antes), `.rd-player-volume` (pill `--surface2` con mute + range `accent-color` + %), `.rd-player-empty*` (estado vacío: placeholder 200px con logo, título, texto y botón `rd-btn-primary` Seleccionar Reproductor). Las clases viejas (`.player-card`, `.vinyl-*`, `.visualizer-*`, `.playback-controls`, `.volume-*`, `.progress-*`) quedan sin uso en el dashboard pero intactas (limpieza en Fase 7).
- `App.jsx`: solo el bloque `{/* Card Reproductor Actual */}`. Condicionales preservados: transporte+volumen solo host, barra clicable solo host (invitado ve progreso sin cursor ni onClick), botón Seleccionar Reproductor solo host en estado vacío.
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub en :3000, desktop 1340×864):
  - **Estructura:** label, carátula `<img>` real, insignia EQ (4 barras), título/artista, transporte de 5 botones con títulos correctos, pill de volumen con slider y %. La tarjeta llena exactamente la altura de la columna A (757px) sin overflow horizontal a 300px.
  - **Funcional (host):** seek +15s (1:51→2:07), clic al 25% de la barra (→0:53 de 3:34), play/pausa (EQ pasa a `.paused` con animación detenida y `title` "Pausado", y vuelve al reanudar), mute (→0%), slider a 80 (→80%).
  - **Invitado:** ve label/carátula/EQ/título/progreso; sin `.clickable`, sin transporte, sin volumen.
  - **Estado vacío** (interceptando el poll `/playback` → `currentlyPlaying:null`): placeholder + "Sin reproducción activa" + texto + botón Seleccionar Reproductor que abre el selector de dispositivos.
  - **Tema claro:** tarjeta blanca (`--surface`) y textos oscuros conmutando en vivo.
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.
