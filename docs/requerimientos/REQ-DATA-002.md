# REQ-DATA-002 — Borrado lógico + auditoría + timestamps ISO UTC

> **Estado:** ABIERTO (2026-09-10) — definición de Paul, pendiente de implementación de Bob.
> **Dueño técnico:** Bob · **QA:** Duck · **PM:** Paul · **Revisa datos:** Gary (DBA), Julia (AppSec)
> **Depende de:** nada aguas arriba. Comparte terreno con REQ-DATA-001 (ya cerrado).
> Ver diseño en [../modelo-datos.md](../modelo-datos.md) secciones 2 (problemas 2, 3, 4), 3 (fechas), 8 (Auditoria).

## Problema real

Hoy `Categorias` y `Planes` se borran con `deleteRow` (Code.gs:629, Code.gs:760):
la fila desaparece sin rastro y sin undo. Si alguien borra una categoría o un
plan por error, no hay forma de recuperarlo ni de saber quién lo hizo. Además la
app maneja datos personales (Ley 25.326) y no existe ningún registro de accesos
ni de cambios sensibles.

Este REQ cierra tres huecos de una vez porque tocan las mismas hojas y el mismo
código:

1. Borrado lógico (soft-delete) en `Categorias` y `Planes`.
2. Columnas de auditoría por fila (`creado_por`, `fecha_creacion`,
   `modificado_por`, `fecha_modificacion`, `estado`) en `Categorias` y `Planes`.
3. Hoja `Auditoria` — log liviano de accesos y cambios sensibles.

## Usuarios afectados

Las dos personas de la app (miembros). El borrado lógico es transparente para
ellas: siguen viendo lo mismo (lo eliminado no aparece). El beneficio es
recuperabilidad y trazabilidad, que hoy se ejerce solo desde la planilla / el
editor de Apps Script (owner).

## Alcance — entra

### A. Columnas de auditoría en `Categorias` y `Planes`

`setupSheets()` agrega, **solo al final y sin reordenar** (patrón `ensureColumn`
ya existente, Code.gs:966), a cada hoja:

| Hoja | Columnas nuevas |
|---|---|
| `Categorias` | `creado_por`, `fecha_creacion`, `modificado_por`, `fecha_modificacion`, `estado`, `eliminado_por`, `fecha_eliminacion` |
| `Planes` | `modificado_por`, `fecha_modificacion`, `eliminado_por`, `fecha_eliminacion` |

`Planes` ya tiene `creado_por`, `fecha_creacion` y `estado` — no se duplican.

- **`estado`** en `Categorias`: enum `activa` \| `eliminada`. Default para filas
  existentes y nuevas: `activa`.
- **`estado`** en `Planes`: ya es enum `pendiente` \| `completado`. Se **amplía**
  con `eliminado`. El borrado lógico setea `estado='eliminado'` — se pierde el
  estado previo (pendiente/completado); es aceptable, un plan eliminado no se
  re-listará con su estado anterior. Si se necesitara restaurar con el estado
  previo, es otro REQ.
- Todos los timestamps nuevos: **texto ISO 8601 UTC** (`new Date().toISOString()`,
  termina en `Z`). Ver modelo de datos sección 3.

### B. Backfill de las columnas de auditoría (one-shot idempotente)

`backfillAuditoriaCategoriasPlanes()`:

- Por cada fila existente de `Categorias` sin `estado`: setea `estado='activa'`.
  `creado_por` y `fecha_creacion` quedan **vacíos** (no se inventan: no hay dato
  de origen). `fecha_creacion` vacío es válido y significa "anterior a la
  auditoría".
- Por cada fila existente de `Planes` sin `estado` reconocido: no toca `estado`
  (ya viene poblado). Los campos nuevos quedan vacíos.
- Idempotente: segunda corrida no cambia nada (log `actualizados=0`).

### C. Borrado lógico

- **`handleDeleteCategoria`**: reemplaza `sheet.deleteRow(i+1)` por setear
  `estado='eliminada'`, `eliminado_por=authUserId`, `fecha_eliminacion=<ISO>`.
  - El chequeo "no hay planes que usan esta categoría" (Code.gs:617) ahora **solo
    cuenta planes con `estado != 'eliminado'`**. Un plan eliminado no bloquea el
    borrado de su categoría.
  - Borrar una categoría ya eliminada → `404` (no está entre las activas).
- **`handleDeletePlan`**: reemplaza `sheet.deleteRow(i+1)` por setear
  `estado='eliminado'`, `eliminado_por=authUserId`, `fecha_eliminacion=<ISO>`.
  - Borrar un plan ya eliminado → `404`.
- **`handleGetCategorias`**: filtra las filas con `estado='eliminada'`. No se
  devuelven al frontend.
- **`handleGetPlanes`**: filtra las filas con `estado='eliminado'`.
- **`categoriaExists` / `handleUpdateCategoria` / `handleUpdatePlan` /
  `handleCompletePlan`**: operan solo sobre filas no eliminadas. Update sobre una
  fila eliminada → `404`.
- **`handleCreateCategoria`**: el chequeo de nombre único ignora las eliminadas
  (se puede reusar el nombre de una categoría borrada).
- Al crear/actualizar, poblar `modificado_por` + `fecha_modificacion`
  (y `creado_por` + `fecha_creacion` al crear categoría).

### D. Hoja `Auditoria`

`setupSheets()` crea la hoja con headers exactos (modelo de datos sección 8):

```
fecha | usuario_id | accion | entidad | entidad_id | detalle
```

Helper **`registrarAuditoria(usuarioId, accion, entidad, entidadId, detalle)`**:

- `fecha`: `new Date().toISOString()`.
- `detalle`: objeto → `JSON.stringify` truncado a 500 caracteres; vacío → `''`.
- Nunca registra binario, tokens, secretos ni contraseñas.
- Falla silenciosa: si el append a `Auditoria` tira, se loguea con `Logger.log`
  pero **no** se aborta la operación principal (auditar no debe romper la app).

Puntos de registro en este REQ (allowlist — nada más):

| accion | entidad | entidad_id | detalle | dónde |
|---|---|---|---|---|
| `login` | `Usuarios` | `usuario_id` | `{email}` | `handleLoginGoogle` al crear sesión OK |
| `login_denegado` | `Usuarios` | `''` | `{email}` | `handleLoginGoogle` cuenta no whitelisteada |
| `logout` | `Sesiones` | `session_id` | `{}` | `handleLogout` cuando revoca una sesión activa |
| `categoria.eliminar` | `Categorias` | `categoria_id` | `{nombre}` | `handleDeleteCategoria` |
| `plan.eliminar` | `Planes` | `plan_id` | `{titulo}` | `handleDeletePlan` |

### E. Estandarización parcial de timestamps de sistema a ISO UTC

- Los timestamps **nuevos** de este REQ (`fecha_modificacion`,
  `fecha_eliminacion`, `Categorias.fecha_creacion`, todo `Auditoria`) se escriben
  ISO 8601 UTC desde el día uno.
- **`Planes.fecha_creacion`** (hoy `new Date()` nativo, Code.gs:685): se cambia a
  `new Date().toISOString()` para las **altas nuevas**. Las filas viejas **no se
  reescriben** (`formatDate()` ya normaliza ambos formatos al leer). Se acepta la
  inconsistencia histórica; la fuente de verdad de lectura es `formatDate`.

## Alcance — NO entra

- Endpoint / pantalla para **restaurar** lo eliminado. Recuperación hoy = editar
  la planilla a mano. Un REQ futuro puede agregar `restoreCategoria`/`restorePlan`.
- Endpoint para **ver** el log de `Auditoria` desde la web → futuro (rol admin,
  cae con REQ-ADMIN-001).
- Purga / retención del log de `Auditoria` → futuro.
- Cascada plan→archivos (borrar plan archiva sus `Archivos`): **no** entra acá
  porque hoy no hay archivos de planes. Entra con REQ-MEDIA-001.
- Reescritura de `Planes.fecha_programada` / `fecha_vencimiento` (son fecha de
  dominio, formato `AAAA-MM-DD`, fuera de "timestamps de sistema").
- Reescritura de las filas históricas de `Planes.fecha_creacion`.
- Cambios en `index.html`. Este REQ es **solo backend + datos**. El frontend no
  cambia: lo eliminado simplemente deja de llegar en `getCategorias`/`getPlanes`.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | `setupSheets()` sobre la planilla existente agrega a `Categorias` las 7 columnas nuevas y a `Planes` las 4 columnas nuevas, **al final, sin mover ni perder datos existentes**. Correrlo dos veces no duplica columnas ni hojas. |
| 2 | `setupSheets()` crea la hoja `Auditoria` con exactamente los 6 headers `fecha, usuario_id, accion, entidad, entidad_id, detalle`. Idempotente. |
| 3 | `backfillAuditoriaCategoriasPlanes()` deja todas las filas de `Categorias` con `estado='activa'`. Segunda corrida: `actualizados=0`. No toca `Planes.estado`. |
| 4 | `deleteCategoria` sobre una categoría sin planes activos: la fila **sigue existiendo** con `estado='eliminada'`, `eliminado_por` = usuario de la sesión, `fecha_eliminacion` en ISO 8601 UTC (`Z`). Devuelve `200`. |
| 5 | Tras eliminar esa categoría, `getCategorias` **no la devuelve**. `updateCategoria` / `deleteCategoria` sobre ella → `404`. |
| 6 | `deleteCategoria` sobre una categoría que tiene ≥1 plan **no eliminado** → `409` con el mensaje actual. Si todos sus planes están eliminados → `200` (borrado lógico). |
| 7 | `deletePlan`: la fila sigue existiendo con `estado='eliminado'`, `eliminado_por`, `fecha_eliminacion` ISO UTC. `200`. Segundo `deletePlan` sobre el mismo → `404`. |
| 8 | Tras eliminar un plan, `getPlanes` no lo devuelve; `updatePlan` / `completePlan` sobre él → `404`. |
| 9 | Crear una categoría nueva: `creado_por`, `fecha_creacion` (ISO UTC), `estado='activa'` quedan poblados. Editarla: `modificado_por` + `fecha_modificacion` (ISO UTC) se actualizan. |
| 10 | Crear un plan nuevo: `fecha_creacion` se guarda como **texto ISO 8601 UTC** (no fecha nativa). `getPlanes` lo devuelve bien formateado. Las filas históricas de `Planes` se siguen leyendo sin romper. |
| 11 | Se puede volver a crear una categoría con el mismo nombre que una eliminada (el chequeo de unicidad ignora las eliminadas). |
| 12 | Login OK escribe 1 fila en `Auditoria` (`accion='login'`, `entidad='Usuarios'`, `entidad_id`=usuario, `detalle` con el email, `fecha` ISO UTC). Login de cuenta no autorizada escribe `accion='login_denegado'`. Logout que revoca una sesión activa escribe `accion='logout'`. |
| 13 | `deleteCategoria` y `deletePlan` escriben su fila en `Auditoria` (`categoria.eliminar` / `plan.eliminar`) con el `entidad_id` correcto. |
| 14 | Si la hoja `Auditoria` se renombra/borra a mano, las operaciones (login, delete) **siguen funcionando** (fallo silencioso del log, queda en `Logger.log`). |
| 15 | Ningún `Logger.log` ni fila de `Auditoria` contiene tokens de sesión, secretos, `token_hash` ni contenido de imagen. |
| 16 | **Sin regresión**: login, ver/crear/editar categorías y planes, completar plan, subir avatar — todo igual que antes salvo que lo eliminado ya no aparece. |

## Datos sensibles (marcado para Julia y Gary)

- `Auditoria` guarda `usuario_id` + `email` (en `detalle` de `login`) → dato
  personal, Ley 25.326. **Julia:** confirmar que `detalle` nunca incluya el
  `token_hash`, el `sessionToken` ni el `google_sub`. Solo email y campos de
  dominio (nombre, título).
- **Gary:** revisar el esquema de `Auditoria` y de las columnas de auditoría
  nuevas antes de que Bob las cree. Confirmar tipos y que `estado` como enum de
  texto plano en `Categorias` es consistente con el resto del modelo.

## Dependencias y orden

1. **Gary** revisa el esquema (columnas nuevas + `Auditoria`) — antes de que Bob toque `setupSheets()`.
2. **Bob** implementa A→E.
3. **Julia** revisa que `registrarAuditoria` / `detalle` no filtre datos sensibles.
4. **Duck** corre el plan de pruebas sobre una **copia de la planilla de prod** (deployment de test), criterio por criterio.
5. Si Duck encuentra algo o propone un cambio, **Bob (autor) da su opinión primero** — de acuerdo / mejor de otra forma / falso positivo. Paul decide con esa ida y vuelta. No se toca el código por un hallazgo de Duck sin pasar por Bob.
6. **Paul** verifica contra los criterios originales y recién ahí se cierra.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `setupSheets()` agrega columnas sobre `Planes` / `Categorias` con datos reales | `ensureColumn` solo agrega al final, nunca inserta ni reordena (ya probado en REQ-DATA-001). Probar primero en copia. |
| Los índices de columna hoy son numéricos y hardcodeados (`getRange(i+1, 2)`, `getRange(i+1, 8)`) | Bob: al agregar columnas al final los índices existentes no se mueven. Igual, migrar los accesos nuevos a lookup por header (`h.indexOf(...)`) como en `Sesiones` / `Archivos`. |
| `handleCompletePlan` usa `columna 8 = estado` por número | No se mueve (las columnas nuevas van después de la 8). Verificar en Duck criterio 16. |
| El backfill corre antes que `setupSheets()` | El backfill chequea que exista la columna `estado` en `Categorias` y aborta con mensaje claro si falta. |
| Doble borrado lógico concurrente | A escala de 2 usuarios es despreciable. El segundo delete encuentra `estado='eliminada'` y devuelve `404`. |

## Plan de pruebas (Duck)

**Automatizado** — `Tests.gs :: probarDATA002()`, ejecutable con
`clasp run probarDATA002 -P .clasp-test.json`. Crea una planilla scratch propia,
corre contra Sheets real y verifica los criterios 1-16 salvo:
- **login / login_denegado** (criterio 12, parte): requieren un access token real
  de Google → cubierto por el harness de Node + un smoke manual de login en test.
- **subida de avatar** (criterio 16, parte): Drive + base64 → REQ-DATA-002 no toca
  `handleUploadPhoto`, sin regresión esperada.

El test se autovalidó con 5 mutantes (borrado físico en vez de lógico, fecha
nativa en vez de ISO, sin filtro de eliminados, fuga de `token_hash` en el log,
sin fallo silencioso): los 5 dan `RECHAZADO`.

**Manual (lo que queda fuera del automatizado):**

1. Copiar la planilla de prod a una de test; apuntar un deployment de test a esa copia.
2. Correr `setupSheets()` → criterios 1, 2.
3. Correr `backfillAuditoriaCategoriasPlanes()` ×2 → criterio 3.
4. Crear categoría + plan desde la app de test → criterios 9, 10.
5. `deleteCategoria` sobre una con plan activo → 409 (criterio 6). Eliminar el plan → `deletePlan` (criterio 7). Reintentar delete de la categoría → 200 (criterio 6).
6. `getCategorias` / `getPlanes` no devuelven lo eliminado (criterios 5, 8).
7. `updateCategoria` / `updatePlan` / `completePlan` sobre lo eliminado → 404 (criterios 5, 8).
8. Crear categoría con el nombre de la eliminada → 200 (criterio 11).
9. Revisar `Auditoria`: filas de login, login_denegado, logout, categoria.eliminar, plan.eliminar (criterios 12, 13).
10. Renombrar `Auditoria` a mano, repetir un login y un delete → no rompe (criterio 14).
11. Revisión de código: logs y `detalle` sin secretos (criterio 15).
12. Recorrer la app completa (criterio 16).
