# Handoff: Rediseño de interfaz JamSpotify

## Overview
Rediseño visual completo de **JamSpotify**, la app de cola de reproducción colaborativa (Spotify compartido en una sala/fiesta vía QR). Cubre las 4 pantallas del sistema. El objetivo del rediseño fue: **búsqueda y cola siempre visibles sin scroll de página**, look de app musical moderna (tipo Spotify/Apple Music), tema **claro y oscuro**, y paleta **verde Spotify + acento violeta**.

> ⚠️ **La lógica de negocio NO cambia.** Esto es solo una nueva capa visual/UX. Todos los estados, sockets, aprobación de invitados, integración con Spotify, etc. que ya existen en el código se conservan. Aquí solo se redefine el layout, los estilos y el flujo de las vistas.

## About the Design Files
Los archivos en `reference/` son **referencias de diseño hechas en HTML** — prototipos que muestran el aspecto y comportamiento buscados, **no** código de producción para copiar y pegar. La tarea es **recrear estos diseños dentro del código React existente** (el proyecto ya usa React + CSS vanilla con variables, ver `uploads/` original), reutilizando sus componentes, hooks y patrones actuales.

- `reference/JamSpotify - Todas las vistas.html` — prototipo interactivo autónomo (ábrelo en el navegador). Trae un **selector de vistas flotante abajo** para navegar entre las 4 pantallas, un toggle de tema claro/oscuro (icono sol/luna en el header), y un switch Álbum/Vinilo en el reproductor.
- `reference/source/JamSpotify Dashboard.dc.html` — fuente legible del prototipo (marcado + lógica de demo). Útil para copiar valores exactos de estilo.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciados e interacciones son finales. Recrea la UI pixel-perfect usando las librerías/patrones del código. Los datos (canciones, carátulas, nombres) son de ejemplo: las **carátulas son mosaicos de color generados** a partir del título — en producción usa las imágenes reales de la API de Spotify.

---

## Design Tokens

El sistema usa **CSS custom properties** que cambian según el tema. Aplícalas en un contenedor raíz (`data-theme="dark|light"`) o como clase.

### Tema oscuro (default)
| Token | Valor |
|---|---|
| `--bg` | `#0a0a0d` + dos halos radiales: `radial-gradient(1100px 600px at 12% -12%, rgba(124,92,255,.10), transparent 58%)` y `radial-gradient(1000px 620px at 105% 112%, rgba(29,185,84,.09), transparent 55%)` |
| `--surface` | `#141419` (tarjetas/paneles) |
| `--surface2` | `#1b1b22` (inputs, chips, hover) |
| `--surface3` | `#24242d` |
| `--border` | `rgba(255,255,255,.08)` |
| `--border2` | `rgba(255,255,255,.15)` (hover/foco de bordes) |
| `--text` | `#f4f4f5` (primario) |
| `--text2` | `#a1a1aa` (secundario) |
| `--text3` | `#71717a` (terciario/labels) |
| `--track` | `rgba(255,255,255,.1)` (fondo de barras) |
| `--shadow` | `0 16px 44px rgba(0,0,0,.5)` |

### Tema claro
| Token | Valor |
|---|---|
| `--bg` | `#f3f3f0` + mismos halos con alpha `.12` |
| `--surface` | `#ffffff` |
| `--surface2` | `#f3f3f4` |
| `--surface3` | `#e9e9ec` |
| `--border` | `rgba(0,0,0,.08)` |
| `--border2` | `rgba(0,0,0,.16)` |
| `--text` | `#18181b` |
| `--text2` | `#55555f` |
| `--text3` | `#9a9aa4` |
| `--track` | `rgba(0,0,0,.1)` |
| `--shadow` | `0 16px 40px rgba(0,0,0,.1)` |

### Acento (igual en ambos temas)
| Token | Valor | Uso |
|---|---|---|
| `--green` | `#1db954` | Acento primario (Spotify): botones, progreso, activos |
| `--greenText` | oscuro `#25e06a` / claro `#12813b` | Texto verde (contraste por tema) |
| `--onGreen` | `#04160b` | Texto/iconos sobre relleno verde |
| `--greenSoft` | `rgba(29,185,84,.14)` | Fondos suaves verdes (chips "En cola", pills) |
| `--violet` | `#8b5cf6` | Acento secundario (punto de "Sala", detalles). Alternativas ofrecidas: `#f0883e`, `#3b82f6`, `#ec4899` |

### Tipografía
- **Display / títulos:** `Outfit`, pesos 500–800. Títulos de sección 18px/700, título de la app 20–28px/800, letter-spacing `-.02em`.
- **Texto / UI:** `Inter`, pesos 400–700. Cuerpo 14–15px, labels 11–12.5px/700 con `letter-spacing:.14em` y `text-transform:uppercase`.
- Números (tiempos, %, volumen): `font-variant-numeric: tabular-nums`.

### Radios y otros
- Radios: tarjetas/paneles **22px**, modales **22–26px**, inputs/botones **11–14px**, filas de lista **12–13px**, pills **999px**.
- Espaciado base: múltiplos de ~4px; padding de paneles 20px; gap del grid 18px.
- Iconos: SVG stroke, `stroke-width` 2–2.6, `stroke-linecap/linejoin: round`. Logo de Spotify en `fill`.

### Animaciones (keyframes)
- `jamspin` 16s linear infinite → giro del vinilo (pausa con `animation-play-state`).
- `jampulse` 2s infinite → halo del punto "en línea" y dots de "esperando".
- `jameq` .9s ease-in-out infinite alternando `scaleY(.35→1)` → barras del ecualizador (3 barras con delays 0/.15s/.3s).
- `jamup` .28–.4s ease → entrada (fade + `translateY(8px)`) de filas, tarjetas y modales.
- Transiciones de hover: `all .15s`.

---

## Screens / Views

### 1. Dashboard (pantalla principal)
**Propósito:** el anfitrión reproduce y todos ven/editan la cola. Es donde se concentra la app.

**Layout desktop (≥1000px):** columna vertical de altura completa (`100vh`, sin scroll de página).
- **Header** (barra superior, 14px 22px, borde inferior): izquierda = logo Spotify + wordmark "JamSpotify" (Outfit 800/20px) + pill "Sala de {host}" con punto violeta. Derecha = pill "{n} en línea" (punto verde con `jampulse`) · botón selector de dispositivo · botón toggle de tema (38×38, icono sol/luna) · botón **Invitar** (relleno verde).
- **Grid de 3 columnas** debajo: `grid-template-columns: 300px minmax(0,1fr) 336px; gap:18px; padding:18px 22px 22px`. **Cada columna es una tarjeta con scroll interno propio** (`overflow-y:auto; overflow-x:hidden`), así la página nunca hace scroll.

  - **Col A — Reproductor (300px):** label "REPRODUCIENDO" + switch segmentado **Álbum / Vinilo**. Carátula 200×200 (mosaico degradado con inicial, radio 20px) **o** vinilo 200×200 (disco radial girando con `jamspin`, etiqueta central con degradado). Badge de ecualizador (3–4 barras) arriba a la derecha de la carátula. Título (Outfit 700/21px) + artista (verde 600/14px). Barra de progreso 6px con relleno verde + tiempos `m:ss`. Transporte: anterior (40px) · **play/pausa** (56px, relleno verde, sombra) · siguiente (40px). Barra de volumen en pill (mute toggle + `input[type=range]` con `accent-color:var(--green)` + "%").

  - **Col B — Buscar (flexible):** título "Buscar y proponer canción". Input de búsqueda con icono lupa a la izquierda (padding-left 44px, foco = borde verde + ring `0 0 0 3px greenSoft`). Label "SUGERIDAS PARA LA FIESTA" (o "RESULTADOS" al escribir). Lista scrolleable de filas: carátula 46px + título/artista + botón **Agregar** (pill outline → hover verde) que cambia a chip **"En cola"** (fondo `greenSoft`, check) si ya está. Estado vacío: "Sin resultados para "{query}"".

  - **Col C — Cola (336px):** dos tabs con subrayado verde: **Cola · {n}** / **Historial · {n}**. Filas de cola: índice + carátula 42px + título + **pill del nombre de quien la agregó** (verde sobre `greenSoft`) + artista + botón eliminar (hover rojo `#ef4444`). Tab Historial: filas atenuadas (opacity .85) con "{artista} · {hace X min}" y botón "volver a agregar" (+). Estado vacío: "La cola está vacía. ¡Busca una canción y agrégala!".

**Layout móvil (<1000px):** se ocultan los chips del header (Sala, en línea, dispositivo). Cuerpo = segmento **Buscar / Cola·{n}** arriba, una sola tarjeta scrolleable debajo, y **mini-reproductor fijo abajo** (barra de progreso 4px + carátula 44px + título/artista + play/pausa 46px + siguiente).

**Modales/overlays del dashboard:**
- **Invitar** (max-width 400px): título "Invita a la fiesta", texto explicativo, **QR 180×180** (fondo blanco, radio 16px), fila con la URL de la sala + botón **Copiar** (verde) que pasa a "¡Copiado!" con check por ~1.8s. Fondo `rgba(0,0,0,.6)` + `backdrop-filter:blur(6px)`. Cierra al clic en el backdrop.
- **Popover de dispositivos** (288px, top:64px right:22px): label "DISPOSITIVOS" + lista (navegador / teléfono / altavoz); el activo tiene fondo `greenSoft`, borde verde y punto verde con glow.

---

### 2. Bienvenida / elegir rol
**Propósito:** primera pantalla; elegir entrar como Anfitrión o Invitado.

**Layout:** tarjeta centrada (max-width 452px, radio 26px, padding 42px 36px, `text-align:center`, entra con `jamup`).
- Logo Spotify 36px + wordmark "JamSpotify" (Outfit 800/28px).
- Párrafo (text2, 15px, line-height 1.6): "Comparte la cola de Spotify en tu sala o fiesta. Cualquiera puede agregar canciones escaneando un código QR."
- Botón primario **"Iniciar como Anfitrión"** (relleno verde, 15px/700, con logo Spotify).
- Botón secundario **"Unirse como Invitado"** (surface2, borde, hover borde verde) → abre el modal de nickname.
- Fila inferior con 3 mini-features (icono en cuadro `greenSoft` 38px + label 11.5px): "Escanea el QR", "Agrega canciones", "En tiempo real". Separada por borde superior.

---

### 3. Invitado esperando aprobación
**Propósito:** el invitado envió su solicitud; espera que el anfitrión lo acepte.

**Layout:** tarjeta centrada (max-width 420px, radio 26px, padding 40px 34px).
- Logo + wordmark 20px.
- **3 dots verdes** con `jampulse` (delays 0/.3s/.6s) como indicador de carga.
- Título "Esperando aprobación" (Outfit 700/22px).
- Texto: "Hola **{nombre}**, tu solicitud de acceso fue enviada al anfitrión. Pídele que te acepte para entrar y encolar canciones." (el nombre en `--text` bold).
- Botón secundario "Cambiar nombre / Cancelar" → vuelve al modal de nickname.

**Estados relacionados:** desde aquí el sistema transiciona a **Dashboard** (aprobado) o **Rechazado** (denegado) según la respuesta del anfitrión.

---

### 4. Acceso denegado (rechazado)
**Propósito:** el anfitrión rechazó al invitado.

**Layout:** tarjeta centrada (max-width 420px), **borde rojo** `rgba(239,68,68,.28)`.
- Círculo 60px con fondo `rgba(239,68,68,.12)` e icono X en círculo, color `#ef4444`.
- Título "Acceso denegado".
- Texto: "El anfitrión rechazó tu solicitud de acceso para el nombre **{nombre}**."
- Botón **rojo** "Intentar con otro nombre" → modal de nickname.

---

### Modal: Nickname (compartido por Bienvenida / Esperando / Rechazado)
**Propósito:** capturar el apodo del invitado para atribuir canciones.
- max-width 420px, radio 22px, padding 28px.
- Título "¿Cómo te llamas?" + texto "Ingresa un apodo para que todos sepan quién encoló cada canción."
- Input (placeholder "Ej. Raúl, María, DJ_Fiesta", `maxlength=20`, foco verde + ring).
- Acciones a la derecha: "Cancelar" (surface2) + **"Empezar"** (verde).

---

## Interactions & Behavior
- **Play/Pausa:** alterna estado; pausa el giro del vinilo y las barras del ecualizador. La barra de progreso avanza 1s por segundo (demo) y reinicia al llegar al final.
- **Siguiente:** saca la primera de la cola, la pone como "reproduciendo", y manda la anterior al historial. Si la cola está vacía, avanza en el catálogo.
- **Buscar:** filtra por título+artista en vivo; sin query muestra sugeridas.
- **Agregar:** empuja a la cola con `addedBy` = nombre propio; el botón de esa canción pasa a "En cola" (deshabilitado visualmente).
- **Eliminar de la cola / volver a agregar desde historial.**
- **Toggle de tema:** conmuta `dark`/`light` (persiste como prefieras: `localStorage` / contexto).
- **Invitar:** abre modal con QR + copiar enlace (feedback "¡Copiado!" temporal).
- **Responsive:** breakpoint en **1000px** (3 columnas → móvil con tabs + mini-player). Ajústalo a tu sistema de breakpoints.
- Hover en filas: fondo `--surface2`, radio 12–13px. Todas las transiciones `.15s`.

## State Management
Estado que la UI necesita (mapéalo a tu store/sockets existentes, **no** reinventar la lógica):
- `theme` ('dark' | 'light'), `artStyle` ('album' | 'vinyl')
- Reproductor: `isPlaying`, `nowPlaying` (id/título/artista/carátula), `progressMs`, `durationMs`, `volume`, `muted`
- Colas: `queue[]` (con `addedBy`), `history[]`
- Búsqueda: `query`, resultados derivados
- Sesión invitado: `screen` (welcome/pending/rejected/dashboard), `nickname`
- UI: `showShare`, `showDevices`, `showNick`, `activeDevice`, `isMobile`

## Assets
- **Logo de Spotify:** SVG inline (path incluido en el marcado de referencia). Verifica derechos de marca en tu producto.
- **Iconos:** SVG inline estilo Feather (lupa, +, check, basura, skip, play/pausa, volumen, compartir, sol/luna, monitor, X, rayo, grid). Sustituye por tu librería de iconos si ya usas una.
- **QR:** en el prototipo se genera vía `api.qrserver.com`. En producción genera el QR del lado del cliente/servidor con tu propia lib.
- **Carátulas:** mosaicos de color por hash del título (helper `grad(seed)` en la fuente). Reemplázalas por las imágenes reales de Spotify.
- **Fuentes:** Google Fonts `Outfit` e `Inter`.

## Files
- `reference/JamSpotify - Todas las vistas.html` — prototipo interactivo (todas las vistas, selector abajo).
- `reference/source/JamSpotify Dashboard.dc.html` — fuente del prototipo con todos los valores de estilo y la lógica de demo.
- Código original del usuario (en `uploads/` del proyecto): `App.jsx`, `App.css`, `index.css`, `CONTEXT.md` — el entorno destino donde integrar el rediseño.
