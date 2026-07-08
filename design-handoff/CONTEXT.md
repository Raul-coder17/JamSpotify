# JamSpotify — Contexto para Rediseño de Interfaz

Esta carpeta (`design-handoff/`) contiene **copias exactas** (sin modificar) de los archivos de interfaz del proyecto real, ubicado en `C:\JamSpotify`. Es solo material de referencia para diseñar — **ningún archivo de esta carpeta se ejecuta ni se importa en el proyecto real**. Los cambios de diseño finales se deben aplicar de vuelta en `frontend/src/` del proyecto original, no aquí.

## Qué es JamSpotify

App web de cola de reproducción colaborativa de Spotify. Un "Anfitrión" (Host) conecta su cuenta de Spotify y crea una sala; los invitados se unen vía link/QR, buscan canciones y las agregan a una cola compartida. El Host modera invitados y controla la reproducción (play/pause/skip/volumen/seek/reordenar cola) en tiempo real.

## Archivos incluidos y su rol

| Archivo | Rol |
|---|---|
| `src/App.jsx` (~1630 líneas) | **Único componente React** de todo el frontend. Contiene todo el estado, la lógica de polling con el backend, y el JSX/marcado de las 4 pantallas de la app. Sin sub-componentes. |
| `src/index.css` (~1020 líneas) | **Hoja de estilos principal.** Aquí viven casi todas las clases reales usadas por App.jsx: variables de diseño (`:root`), glassmorphism (`.glass-panel`), botones (`.btn-primary`, `.btn-secondary`, `.btn-icon`), la tarjeta del reproductor con vinilo animado (`.vinyl-*`), la cola de canciones (`.track-item`, `.track-list`), el grid del dashboard (`.dashboard-grid`), y los breakpoints responsive al final del archivo. |
| `src/App.css` | Residuo del boilerplate de Vite/React (`.counter`, `.hero`, `.ticks`, `#next-steps`, etc.). **No parece estar en uso real** por el layout actual de JamSpotify — verificar antes de asumir que hay que rediseñarlo, probablemente se puede vaciar o ignorar. |
| `src/main.jsx` | Entry point de React, monta `<App />` en `#root`. No debería necesitar cambios. |
| `index.html` | Metadatos, título, favicon inline (nota SVG verde de Spotify), y las fuentes de Google Fonts: **Inter** (cuerpo) y **Outfit** (encabezados, vía `--font-display`). Si el rediseño cambia tipografía, aquí se agregan/quitan los `<link>` de Google Fonts. |
| `vite.config.js` | Config de Vite — proxy de `/api` hacia `localhost:3000` (el backend). No relevante para diseño. |
| `public/icons.svg` | Sprite de iconos sociales (Bluesky, Discord, GitHub, X) — boilerplate de Vite, no usado por JamSpotify en sí. |
| `public/favicon.svg` | Favicon boilerplate de Vite (logo morado), **no es el favicon real** — el favicon real de JamSpotify está inline en `index.html` (ícono de Spotify en verde). |
| `src/assets/` | `hero.png`, `react.svg`, `vite.svg` — assets boilerplate sin uso confirmado en el JSX actual. |
| `package.json` | Confirma stack: React 19 + Vite, **sin librerías de UI externas** (no hay MUI, Tailwind, Chakra, etc.). Todo el estilo es CSS vanilla. |

## Las 4 pantallas/estados de la UI (todas dentro de App.jsx)

1. **Bienvenida / elección de rol** (líneas ~913–961) — pantalla `appMode === 'choose'`. Botón "Iniciar como Anfitrión" (OAuth Spotify) y "Unirse como Invitado".
2. **Invitado esperando aprobación / rechazado** (líneas ~963–1031) — estados `pending`, `not_requested`, `rejected` del invitado antes de ser aprobado por el Host.
3. **Dashboard principal** (líneas ~1033–1591) — layout de dos columnas (`dashboard-grid`, clase en `index.css` línea ~134):
   - **Columna izquierda**: tarjeta del reproductor con vinilo animado (`player-card`, `vinyl-*`), controles de playback (solo Host), buscador de canciones.
   - **Columna derecha**: panel de solicitudes de acceso pendientes (solo Host), sección de compartir con QR (solo Host), cola de reproducción / historial con pestañas (`tabs-container`, `track-list`).
   - Header (`.header`) con logo, indicador de usuarios en línea, selector de dispositivo y botones de admin (solo Host).
4. **Modal de nickname** (líneas ~1593–1627) — overlay para que el invitado (o el host, al editar) ingrese su nombre.

## Sistema de diseño actual (para mantener coherencia o reemplazar deliberadamente)

Definido en `:root` de `index.css`:
- Fondo oscuro (`--bg-primary: #09090b`) con glassmorphism (`--bg-card` semitransparente + `backdrop-filter: blur`).
- Verde Spotify como color de acento (`--spotify-green: #1db954`).
- Tipografía: Inter (texto) + Outfit (títulos), cargadas desde Google Fonts en `index.html`.
- Halos de color decorativos de fondo (`--glow-purple`, `--glow-blue`) vía `radial-gradient` en `body`.
- Iconos: **no hay librería de iconos**, todos son SVG inline definidos en el objeto `Icons` al inicio de `App.jsx` (líneas 4–88). Si el rediseño cambia de estilo de iconografía, hay que regenerar ese objeto completo.
- Responsive: dos breakpoints en `index.css`, `@media (max-width: 968px)` (colapsa el grid a una columna) y `@media (max-width: 768px)` / `480px` (ajustes móviles finos: tamaños de vinilo, botones, tipografía).

## Reglas para no romper nada al rediseñar

- **No tocar la lógica de estado ni los `useEffect`** de `App.jsx` (todo lo que está entre las líneas ~91 y ~908): polling cada 1-2.5s con el backend, integración con el Spotify Web Playback SDK, drag-and-drop de la cola, debounce de búsqueda. El rediseño solo debe tocar el JSX de retorno (`return (...)`, desde la línea ~913 en adelante) y las hojas de estilo.
- **Cuidado con estilos inline (`style={{ ... }}`)**: gran parte del layout de `App.jsx` usa estilos inline en vez de clases CSS (especialmente spacing y layout ad-hoc). Un rediseño "solo tocando CSS" no va a alcanzar todo — hay que decidir si se migran esos inline styles a clases nuevas o se dejan igual.
- **Las clases con lógica condicional** (ej. `active`, `dragging`, `spin-animation`, `spin-paused`, `visualizer-paused`) se agregan/quitan dinámicamente desde JSX según el estado de reproducción — si se renombran en CSS, hay que renombrarlas también en los template strings de `className` dentro de `App.jsx`.
- El backend (`backend/`) **no participa** en la interfaz. Ningún cambio de diseño debería requerir tocarlo.
- No hay tests automatizados — la única verificación posible es manual: correr `npm run dev` desde la raíz del proyecto real y revisar las 4 pantallas (bienvenida, invitado pendiente/rechazado, dashboard host, dashboard invitado aprobado) tras cada cambio.
- Cuando el rediseño esté listo, los cambios se **aplican de vuelta manualmente en `C:\JamSpotify\frontend\src\`** (no reemplazar los archivos originales automáticamente) — esta carpeta es solo insumo de referencia.
