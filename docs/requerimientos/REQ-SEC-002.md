# REQ-SEC-002 — XSS almacenado en el render del frontend

> **Estado:** IMPLEMENTADO — `index.html`. Tests de node 17/17 + smoke en el
> navegador (payloads no ejecutan). Pendiente: QA (Duck) y deploy a GitHub Pages.
> **Dueño técnico:** Jay · **AppSec:** Julia · **QA:** Duck
> **Depende de:** nada. Backlog #2 tras REQ-DATA-001.

## Problema

`renderPlanes()` y `renderCategorias()` arman HTML por interpolación de strings
y lo meten con `innerHTML`. Varios valores vienen de la planilla (los edita el
usuario a mano) y se interpolaban **sin escapar**:

| Sink | Contexto | Riesgo |
|---|---|---|
| `cat.nombre` | texto de `<span class="categoria-badge">` y `<option>` | `<img src=x onerror=…>` → ejecución de JS |
| `cat.colorHex` | dentro de `style="background:${…};color:${…}"` | `#fff" onmouseover="…` → rompe el atributo, inyecta handler |
| `fotoUrl` (avatar del creador) | `src` de `<img>` + `alt` | rompe el atributo; `alt="${creador}"` tampoco se escapaba |
| `creador` (nombre del otro usuario) | `alt` del avatar | idem |
| `plan.planId` / `cat.categoriaId` | `onclick="fn('${id}')"` y `value="${id}"` | hoy los genera el backend, pero una `'` rompería el literal JS |

Reportado por Julia en la revisión de REQ-AUTH-001 (backlog #2).

## Solución

Tres helpers nuevos en `index.html`, al lado de `escapeHtml`:

- **`safeColor(v)`** — allowlist: solo `#` + 3–8 hex. Cualquier otra cosa cae a
  `PRESET_COLORS[0]`. (Escapar no alcanza: un valor no-color dentro de `style`
  igual es basura; se valida.)
- **`safeImageUrl(v)`** — solo `http(s)://` y `data:image/`. Bloquea `javascript:`
  y demás. Lo que pasa, además se escapa. `''` ⇒ no se renderiza `<img>`, se usa
  la inicial.
- **`safeId(v)`** — se queda solo con `[A-Za-z0-9_-]` (lo que genera el backend).
  Para IDs dentro de handlers inline y de `value`.

`escapeHtml` (ya existía: escapa `& < > "`) se aplica ahora a `cat.nombre`,
`creador` (en `alt`) y la inicial de fallback.

### Puntos tocados

| Archivo | Función | Cambio |
|---|---|---|
| `index.html` | `escapeHtml` (zona helpers) | + `safeColor`, `safeImageUrl`, `safeId` |
| `index.html` | `setAvatarEl` | `safeImageUrl(fotoUrl)` + `escapeHtml(nombreDisplay)` en `alt` |
| `index.html` | `renderPlanes` | `safeColor` en el badge, `escapeHtml(cat.nombre)`, `safeImageUrl` en el avatar, `escapeHtml` en `alt` y en la inicial, `safeId(plan.planId)` en los 3 `onclick` |
| `index.html` | `renderCategorias` | `safeColor(cat.colorHex)`, `safeId(cat.categoriaId)` en los `onclick` |
| `index.html` | select de categorías (`openModalPlan`) | `safeId(c.categoriaId)`, `escapeHtml(c.nombre)` |

### Fuera de alcance

- `openModalFoto` arma el preview con `createElement` + `img.src = …` (propiedad
  DOM, no parsea HTML) y es data de la propia sesión → no es sink, no se toca.
- Refactor de `onclick` inline a delegación de eventos con `data-*` — es el fix
  "de raíz" para esa familia, pero es un cambio grande en toda la capa de render
  y Duck tendría que re-testear todas las interacciones. Queda para la pasada de
  UI (backlog #7). Con `safeId` el riesgo actual queda cerrado.
- El backend ya escapa fechas (`formatDate` → ISO); `formatDateDisplay` no
  valida pero el input está saneado aguas arriba.

## Criterios de aceptación (Duck)

| # | Criterio |
|---|---|
| 1 | Categoría con `nombre` = `<img src=x onerror=alert(1)>` → se ve el texto literal, no ejecuta. En la lista de categorías, en el badge del plan y en el `<option>` del select. |
| 2 | Categoría con `color_hex` = `#fff" onmouseover="alert(1)` → el badge/dot usa el color por defecto, sin atributo `onmouseover`. |
| 3 | Categoría con `color_hex` válido (`#a0c8e8`) → se sigue viendo con ese color (sin regresión visual). |
| 4 | Usuario con `foto_url` = `javascript:alert(1)` o `x" onerror="alert(1)` → no se renderiza `<img>`, se muestra la inicial. |
| 5 | Usuario con `foto_url` válido de Drive → el avatar se sigue viendo. |
| 6 | Los botones Completar / Editar / Eliminar de un plan y de una categoría siguen funcionando (los IDs reales pasan intactos por `safeId`). |
| 7 | Ningún elemento renderizado tiene atributos `on*` fuera de los `onclick` propios de los botones. |
| 8 | Sin regresión: crear/editar/completar/borrar plan y categoría, cambiar de filtro, subir avatar. |

## Verificación hecha

- `scratchpad/xss-test.js` — 17/17: allowlists de `safeColor`/`safeImageUrl`,
  strip de `safeId`, payloads clásicos contra `escapeHtml`.
- Smoke en el navegador: `state` cargado con `nombre` / `color_hex` / `foto_url`
  / `planId` / `categoriaId` maliciosos, `renderPlanes()` + `renderCategorias()`,
  forzado el `onerror` de las imágenes → `window.__xss` quedó `false`, 0 `<img>`
  del payload, 0 handlers inyectados, `onclick` con IDs saneados.
- No se pudo probar el flujo real con backend (archivo estático). Duck lo valida
  en el deployment de test cargando una categoría con payload a mano en la hoja.

## Cierre

_pendiente — QA + deploy_
