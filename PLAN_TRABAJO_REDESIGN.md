# Rediseño de Interfaz — JamSpotify

## Objetivo
Reimplementar el diseño de `design_handoff_jamspotify_redesign` (spec + mockup de Claude Design) en frontend/src/App.jsx e index.css, sin tocar lógica de negocio ni backend.

## Estado
**Fase 5 completada** (switch Álbum/Vinilo). Sigue Fase 6 (layout móvil).

## Fases
0. Checkpoint (rama + commit) — ✅ hecho, commit b98eebf
1. Fundaciones de estilo (tokens tema + keyframes en index.css) — ✅ hecho
2. Toggle de tema claro/oscuro — ✅ hecho
3. Pantallas simples (bienvenida, esperando, rechazado, modal nickname) — ✅ hecho
4. Dashboard: reestructuración 3 columnas + reinyección de gaps funcionales — ✅ hecho
   - 4.A Cascarón estructural (shell 100vh + header + grid 3 col) — ✅ hecho
   - 4.B Columna A: reproductor (carátula álbum, transporte 5 botones, volumen, estado vacío) — ✅ hecho
   - 4.C Columna B: buscador (input, filas, botón Agregar 4 estados) — ✅ hecho
   - 4.D Columna C: cola/historial (tabs, drag&drop, permisos, 3 acciones historial) — ✅ hecho
   - 4.E Tarjeta de aprobaciones restilizada (encima de la cola, col C) — ✅ hecho
   - 4.F Modal Compartir (botón Invitar → modal; URL sigue OCULTA) — ✅ hecho
   - 4.G Popover Dispositivos (conserva Refrescar/WebPlayer/estados) — ✅ hecho
5. Switch Álbum/Vinilo — ✅ hecho
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

### Fase 4.C — Columna B: buscador (App.jsx + index.css)
**Qué cambió:** restilizado del panel de búsqueda. **Ningún handler, estado, prop, debounce ni useEffect tocado** — mismos `setSearchQuery`, `addToQueue`, `queueStatus`, mismas condiciones de render y el mismo `disabled={loading || duplicate}`; solo JSX de presentación y clases.
- `index.css` (aditivo): bloque `.rd-search-*` — `.rd-search` (tarjeta `--surface`, `flex:1 1 auto; min-height:0; overflow:hidden` para llenar la columna con scroll interno de la lista), `.rd-search-head/title`, `.rd-search-input` con icono interior absoluto (`.rd-search-icon`) y focus verde con anillo `--greenSoft`, `.rd-search-heading` ("RESULTADOS", visible solo con query), `.rd-search-list` (scroll interno), `.rd-search-row/art/info/name/artist` (filas con hover `--surface2` y `jamup`), y los 4+1 estados del botón: `.rd-search-add` (pill outline "+ Agregar"; deshabilitada+opaca en loading "Agregando…"; variante `.error` con borde/texto rojos "Error al agregar", clicable para reintentar), `.rd-search-chip` (chip verde "✓ Agregada") y `.rd-search-chip.muted` (chip atenuado "Ya en cola", deshabilitado). Media query <1000px: `.rd-search { max-height:70vh }` para scroll interno en el apilado temporal. Clases viejas (`.search-input-wrapper`, `.input-glow`, `.track-list/item/art/info`) intactas (aún las usa la columna C hasta 4.D; limpieza en Fase 7).
- `App.jsx`: solo el bloque `{/* Panel de Búsqueda */}`. Título en sentence case como el mockup ("Buscar y proponer canción"). El botón conmuta clase por `queueStatus` (misma lógica ternaria de antes, ahora en `className` en vez de estilos inline).
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub, desktop 1340×864):
  - **Estructura:** título, icono dentro del input, heading RESULTADOS con query, filas con `<img>` real + título/artista, tarjeta llenando la columna B.
  - **Debounce/estados de búsqueda:** al teclear aparece "Buscando en Spotify..." (capturado a los 100ms) y luego los resultados; query sin matches → "No se encontraron resultados para «zzzznoexiste»".
  - **4 estados del botón:** default (pill "+ Agregar") → **loading** ("Agregando…" deshabilitado; capturado retrasando el POST /queue 800ms) → **success** (chip verde "✓ Agregada"); **duplicate** con canción ya en cola (chip atenuado "Ya en cola", deshabilitado); **error** con 500 simulado del stub (pill roja "Error al agregar", clicable, y el banner `errorAlert` apareció bajo el header).
  - **Tema claro:** tarjeta blanca, input `--surface2` claro, textos oscuros.
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

### Fase 4.D — Columna C: cola + historial (App.jsx + index.css)
**Qué cambió:** restilizado de la tarjeta de cola/historial. **Ningún handler, estado, prop, drag&drop ni useEffect tocado** — mismos `setSidebarTab`, `handleDragStart/Over/End`, `removeFromQueue`, `playTrackImmediately`, `removeFromHistory`, `addToQueue`, `queueStatus`, `formatPlayedAt` y las mismas condiciones de rol; solo JSX de presentación y clases.
- `index.css` (aditivo): bloque `.rd-qh-*` — `.rd-qh` (tarjeta `--surface`, `flex:1 1 auto`, `min-height:280px` transitorio mientras aprobaciones+compartir sigan en la columna hasta 4.E/4.F), `.rd-qh-tabs`/`.rd-qh-tab` (pestañas subrayadas: borde inferior 2px verde en activa, Outfit 14.5px), `.rd-qh-list` (scroll interno), `.rd-qh-row` (hover `--surface2`, `jamup`, `.dragging` al 40%), `.rd-qh-index`, `.rd-qh-art` (42px, `.faded` para historial), `.rd-qh-chip` (chip verde `addedBy`), `.rd-qh-artist`, `.rd-qh-action` (botón icono 32px: hover verde; `.danger` hover rojo para quitar/borrar; `.success` verde persistente para re-agregado; `:disabled` opaco), `.rd-qh-empty`. Media query <1000px: `max-height:70vh`. Clases viejas (`.tabs-container`, `.tab-btn`, `.btn-delete-item`, `.track-*`, `.added-by-tag`) sin uso en el dashboard pero intactas (limpieza en Fase 7).
- `App.jsx`: solo el bloque `{/* Cola de Reproducción Compartida e Historial */}`. Etiquetas de tab en formato mockup ("Cola · N"). Fila de cola: índice + carátula + nombre + chip `addedBy` + artista + Quitar (misma condición `host || item.addedBy === guestName`); atributos `draggable`/`onDrag*` y `animationDelay` intactos. Fila de historial: subline "chip · artista · hace X" (antes chip y hora iban apilados a la derecha), 3 acciones host (▶/🗑/+) y solo + para invitado, con el mismo estado success/disabled del re-agregado.
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub con endpoint `/queue/reorder` real añadido, desktop 1340×864):
  - **Host — cola:** tabs "Cola · 3 / Historial · 2" con subrayado activo; **drag&drop** sintético fila 1→3: reordena en vivo, la clase `.dragging` sigue a la fila arrastrada, se limpia en dragend y el orden **persiste** tras el PUT reorder + siguiente poll; quitar de cola funciona (probado hasta vaciarla).
  - **Host — historial:** las 3 acciones por fila: ▶ Reproducir ahora (el reproductor cambió a la canción), 🗑 Eliminar (contador 2→1, probado hasta vaciar), + Re-agregar (cola 3→4 y check verde `.success`).
  - **Estados vacíos:** "La cola está vacía…" y "Aún no se han reproducido canciones…" con contadores "· 0".
  - **Invitado (Pepe):** ninguna fila `draggable`; botón Quitar **solo** en su propia canción (agregó "Flowers" → apareció solo ahí, y pudo borrarla); historial con **una sola** acción (re-agregar).
  - **Tema claro:** tarjeta blanca, tab activa verde, chip con `--greenText` claro (#12813b), textos oscuros.
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

### Fase 4.E — Columna C: tarjeta de aprobaciones (App.jsx + index.css)
**Qué cambió:** restilizado del panel de solicitudes de acceso. **Ningún handler, estado, prop ni useEffect tocado** — mismo `handleApproveGuest(name, 'approve'|'reject')`, misma condición `appMode === 'host' && pendingApprovals.length > 0` y el mismo poll de `/guest/pending`; solo JSX de presentación y clases.
- `index.css` (aditivo): bloque `.rd-approvals-*` — `.rd-approvals` (tarjeta `--surface`, `flex-shrink:0`, encima de la cola en col C, borde violeta `color-mix(in srgb, var(--violet) 35%, transparent)`, entrada `jamup`), `.rd-approvals-title` (Outfit, color `--violet`) con `.rd-approvals-dot` (punto violeta con glow), `.rd-approvals-sub`, `.rd-approvals-list/row` (filas `--surface2`), `.rd-approvals-name` (con ellipsis), `.rd-approvals-accept` (verde sólido, pill, `--onGreen`) y `.rd-approvals-reject` (outline rojo, hover con fondo rojo suave).
- `App.jsx`: solo el bloque `{/* Solicitudes de Acceso */}` — clases en lugar de los estilos inline y colores hardcodeados (#c084fc/#a855f7) que usaba antes.
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub con 2 invitados pendientes, desktop 1340×864):
  - **Estructura:** tarjeta encima de la tarjeta de cola, `flex-shrink:0`, borde violeta al 35%, título/punto en `--violet`, filas con Aceptar (fondo `--green`, texto `--onGreen`) y Rechazar (transparente, texto/borde rojos).
  - **Funcional:** el panel **aparece por el poll** al cargar (0→2); **Aceptar** a Sofía → fila fuera y contador (2)→(1); **Rechazar** a Andrés → panel **desaparece por completo** al quedar `pendingApprovals` vacío; tras reiniciar el stub, el panel **reaparece sin recargar** vía poll (→(2)).
  - **Tema claro:** tarjeta blanca, filas `--surface2` claras, nombre oscuro, título violeta.
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

### Fase 4.F — Modal Compartir (App.jsx + index.css)
**Qué cambió:** el panel fijo de compartir de la columna C (fallback transitorio de 4.A) se convirtió en modal. `copyLink`, `copied` y `serverInfo.joinUrl` **intactos**; único añadido de estado (autorizado): `showShare` (`useState(false)`).
- `App.jsx`: (1) estado `showShare`; (2) el botón verde **Invitar** del header pasa de `scrollIntoView` al panel a `setShowShare(true)`; (3) eliminado el bloque `{/* Información de Compartir */}` de la columna C (la columna queda: aprobaciones + cola/historial, y la cola gana el espacio); (4) nuevo modal (junto al de nickname) condicionado a `showShare && appMode === 'host'`: overlay `.rd-modal-overlay` (reutilizado de Fase 3) que **cierra al clicar fuera** (`stopPropagation` en la tarjeta), cabecera con título y botón ✕, texto, QR (misma URL de qrserver con `serverInfo.joinUrl` + fallback "Cargando información de red..."), y fila con la **URL oculta** ("Enlace de Invitación (Oculto por seguridad)" — decisión confirmada) + botón Copiar con feedback "¡Copiado!". Sin manejo de Escape (no existía antes; no se añade lógica nueva).
- `index.css` (aditivo): bloque `.rd-share-*` — `.rd-share-modal` (400px, `--surface`, radius 22, `jamup`), `.rd-share-head/title/close`, `.rd-share-text`, `.rd-share-qr` (blanco, 180px, padding 12, radius 16) + `.rd-share-qr-label`/`.rd-share-loading`, `.rd-share-row/url` (caja `--surface2` en cursiva `--text3`) y `.rd-share-copy` (verde, `--onGreen`). Clases viejas (`.share-section`, `.share-link-copy`, `.qr-code-img`, etc.) sin uso pero intactas (limpieza en Fase 7).
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub, desktop 1340×864):
  - El panel viejo ya no existe (`#rd-share-panel` ausente; columna C con 2 tarjetas). El botón **Invitar abre el modal**: overlay con `blur(6px)`, QR cargado (`naturalWidth > 0`), caja de enlace con el texto oculto y **ningún** `http`/`localhost` visible en el modal.
  - **Cierres:** botón ✕ y clic fuera del modal — ambos cierran; clic dentro no.
  - **Copiar:** con el clipboard real del preview headless falla por foco ("Document is not focused" — limitación del entorno, no del código); stubbeando `writeText` se verificó la ruta completa: botón → "**¡Copiado!**" con check → revierte a "Copiar" a los 2s, y el argumento escrito fue el `joinUrl` real (`?roomId=…&mode=guest`) aunque el modal no lo muestre.
  - **Tema claro:** modal blanco, título oscuro, caja de URL clara.
  - Invitado: sin botón Invitar y modal condicionado a host (condición verificada en código; el header de invitado ya se validó en 4.A).
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

### Fase 4.G — Popover de Dispositivos (App.jsx + index.css) — cierra la Fase 4
**Qué cambió:** el panel inline de dispositivos (transitorio en columna A desde 4.A) se convirtió en un popover anclado al botón de dispositivo del header. **Ningún handler ni estado tocado** — mismos `setShowDeviceSelector(!showDeviceSelector)`, `refreshDevices`, `transferDevice` (que ya cerraba el selector y refetcheaba al transferir) y las mismas condiciones de `webPlayerState`/`devices`; solo presentación y anclaje.
- `App.jsx`: el botón del header se envuelve en `.rd-devices-anchor` (posicionamiento relativo); dentro, condicionado a `showDeviceSelector`: un **backdrop transparente** `fixed inset-0` que cierra al clic fuera (sin listeners nuevos de documento) + el popover `.rd-devices-pop`. Contenido conservado tal cual: cabecera "DISPOSITIVOS" + botón **Refrescar**, texto guía (con la parte extendida cuando `webPlayerState !== 'ready'`), entrada especial del **Web Player** ("Este Navegador (PC Actual)", verde, punto pulsante), estado **connecting** ("Iniciando reproductor…"), estado **vacío** ("No se encontraron otros dispositivos…") y la lista de dispositivos con activo resaltado (fondo `--greenSoft` + borde verde + punto con glow). Se retiró el botón "Cerrar" (redundante: cierran el clic fuera y el propio botón del header; no estaba en la lista de preservación). El bloque inline de la columna A se eliminó.
- `index.css` (aditivo): bloque `.rd-devices-*` — anchor/backdrop/pop (320px, `top: calc(100%+10px); right:0`, `jamup`, `max-width: calc(100vw - 28px)` para el apilado <1000px), head/label/refresh, guide, item (+`.active`, +`.webplayer`), dot con glow y status. Clases viejas (`.device-select-list`, `.device-item`, `.device-status-dot`) sin uso pero intactas (limpieza en Fase 7).
**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub con `/playback/transfer` real que conmuta `is_active`, desktop 1340×864):
  - **Anclaje:** popover exactamente bajo el botón (top = borde inferior + 10px, alineado a su derecha), panel inline ausente de la columna A.
  - **Transferir:** clic en "iPhone…" → POST transfer → popover se cierra, el botón del header pasa a mostrar el nuevo dispositivo (via poll) y al reabrir el activo/punto cambió de fila.
  - **Refrescar:** dispara exactamente 1 fetch a `/playback/devices` y el popover permanece abierto. **Clic fuera** (backdrop) cierra.
  - **Estado vacío:** interceptando devices→`[]` + Refrescar → "No se encontraron otros dispositivos activos…".
  - **Estados del Web Player** (inyectando un SDK falso vía `window.onSpotifyWebPlaybackSDKReady`, sin tocar código): `connect()` exitoso → popover muestra "**Iniciando reproductor en el navegador...**" con la guía extendida; al disparar `ready` → aparece la **entrada especial** ("Este Navegador (PC Actual)" en `--greenText`, punto pulsante, subtítulo "JamSpotify Web Player"), desaparece el connecting y la guía se acorta, con los otros 2 dispositivos aún listados.
  - **Tema claro:** popover blanco, textos oscuros, Web Player con `--greenText` claro (#12813b).
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.

**Con esto la Fase 4 queda completa: dashboard en 3 columnas con todos los gaps funcionales preservados (aprobaciones, reset/desconectar, seek, historial completo, 4 estados de Agregar, drag&drop, permisos por rol y selector de dispositivos rico).**

### Fase 5 — Switch Álbum/Vinilo (App.jsx + index.css)
**Qué cambió:** se recuperó el vinilo giratorio (retirado en 4.B) como **estilo alternativo** de la carátula, alternable con un toggle propio en la tarjeta del reproductor. **Ningún handler de reproducción, estado de playback ni el resto del reproductor tocado** (progreso, transporte, volumen, seek intactos); único añadido de estado: `artStyle` (`'album' | 'vinyl'`).
- `App.jsx`:
  - Estado `artStyle` inicializado desde `localStorage['jamspotify-art-style']`, default `'album'`. `useEffect([artStyle])` que persiste la preferencia. Handler `toggleArtStyle` que alterna album↔vinyl.
  - Iconos `Disc` (círculo con orificio, vinilo) y `Album` (cuadro con orificio) agregados al objeto `Icons`.
  - Nueva fila `.rd-player-head` que envuelve el label "REPRODUCIENDO" + botón toggle `.rd-player-artstyle` (solo visible con `currentlyPlaying`; muestra el icono+nombre del **otro** modo, ej. "Vinilo" cuando está en álbum). El botón vive **en la tarjeta del reproductor**, no en el header (es preferencia de la carátula, no de tema).
  - La carátula (dentro del `.rd-player-art-wrap` de 200×200, compartido) renderiza condicionalmente: `artStyle === 'vinyl'` → disco `.rd-player-vinyl` con la **imagen real de Spotify** al centro (`.rd-player-vinyl-cover`) y el orificio (`.rd-player-vinyl-hole`); si no → la `<img>` cuadrada `.rd-player-art` de la Fase 4.B. La insignia EQ queda **una sola vez** sobre el wrap (sirve a ambos modos).
  - El disco recibe la clase `paused` cuando `!currentlyPlaying.isPlaying` (mismo patrón que el EQ), pausando el giro.
- `index.css` (aditivo): `.rd-player-head` (flex, hereda el margin-bottom que tenía el label), `.rd-player-label` (sin margin propio ahora), `.rd-player-artstyle` (pill `--surface2` con hover `--surface3`), y el bloque del vinilo `.rd-player-vinyl` (disco 200px, `animation: jamspin 20s linear infinite` — el keyframe de la Fase 1; `.paused` → `animation-play-state: paused`), `::before`/`::after` (surcos), `.rd-player-vinyl-cover` (carátula circular 82px al centro) y `.rd-player-vinyl-hole` (orificio con `background: var(--surface)`, token de tema). El disco es negro realista (records son negros) pero el orificio y el botón usan tokens `--surface`/`--surface2`, por lo que responden al tema. Las clases viejas del vinilo pre-rediseño (`.vinyl-*`, `.spin-animation`) siguen sin uso (limpieza en Fase 7).

**Antes/después:**
- Antes (Fase 4): carátula siempre álbum (cuadrada); el vinilo no existía en el dashboard rediseñado.
- Después: toggle Álbum/Vinilo en la tarjeta del reproductor; en vinilo, disco giratorio con la carátula real al centro que **se detiene en pausa**; la preferencia persiste entre recargas y funciona en dark/light.

**Cómo se validó:**
- `npm run build` → exitoso. `eslint src/App.jsx` → 16 problemas, **todos preexistentes**, 0 nuevos.
- Navegador (Vite dev + backend stub en :3000, host, desktop 1340×864):
  - **Default:** carga en `album` (`.rd-player-art` presente, toggle muestra "Vinilo"), `localStorage['jamspotify-art-style']` ausente→'album'.
  - **Toggle a vinilo:** `.rd-player-vinyl` presente, `.rd-player-art` ausente, `.rd-player-vinyl-cover` con la URL real de la carátula (`picsum.../t1/100`), `animationName: jamspin`, `animationPlayState: running`, toggle→"Álbum", `localStorage`→'vinyl'.
  - **Pausa/reanuda:** al pausar, el disco toma `.paused` y `animationPlayState: paused` (igual que el EQ, `eqPaused: true`); al reanudar vuelve a `running`.
  - **Persistencia:** tras recargar sigue en vinilo (`localStorage`='vinyl', disco girando).
  - **Tema:** en light el orificio usa `--surface` (blanco) y el botón `--surface2` claro; verificado álbum y vinilo en **dark y light** (capturas). El disco negro se lee bien sobre la tarjeta blanca.
  - Errores de consola: solo los del Spotify Web Player SDK con token stub (preexistentes, ajenos al rediseño).
**Archivos tocados:** `frontend/src/App.jsx`, `frontend/src/index.css`, `PLAN_TRABAJO_REDESIGN.md`.
