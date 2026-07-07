# Rediseño de Interfaz — JamSpotify

## Objetivo
Reimplementar el diseño de `design_handoff_jamspotify_redesign` (spec + mockup de Claude Design) en frontend/src/App.jsx e index.css, sin tocar lógica de negocio ni backend.

## Estado
Fase 3 completada (pantallas simples). Fase 4 pendiente.

## Fases
0. Checkpoint (rama + commit) — ✅ hecho, commit b98eebf
1. Fundaciones de estilo (tokens tema + keyframes en index.css) — ✅ hecho
2. Toggle de tema claro/oscuro — ✅ hecho
3. Pantallas simples (bienvenida, esperando, rechazado, modal nickname) — ✅ hecho
4. Dashboard: reestructuración 3 columnas + reinyección de gaps funcionales — pendiente
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
