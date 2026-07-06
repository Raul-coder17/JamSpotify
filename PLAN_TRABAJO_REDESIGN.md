# Rediseño de Interfaz — JamSpotify

## Objetivo
Reimplementar el diseño de `design_handoff_jamspotify_redesign` (spec + mockup de Claude Design) en frontend/src/App.jsx e index.css, sin tocar lógica de negocio ni backend.

## Estado
Fase 1 completada (tokens + keyframes). Fase 2 pendiente.

## Fases
0. Checkpoint (rama + commit) — ✅ hecho, commit b98eebf
1. Fundaciones de estilo (tokens tema + keyframes en index.css) — ✅ hecho
2. Toggle de tema claro/oscuro — pendiente
3. Pantallas simples (bienvenida, esperando, rechazado, modal nickname) — pendiente
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
