# REQ-MEDIA-001 — Servido de archivos gateado por sesión

> **Estado:** DEFINIDO (2026-09-11) — sin implementar. Ver [Alcance](#alcance--entra).
> **Dueño técnico:** Bob (back) + Jay (front) · **AppSec:** Julia · **DBA:** Gary · **QA:** Duck · **PM:** Paul
> **Depende de:** [REQ-DATA-001](REQ-DATA-001.md) (hoja `Archivos`, ya cerrado).
> Ver contexto en [../modelo-datos.md](../modelo-datos.md) sección "Compartir la carpeta raíz" y decisión D1 de Julia.

## Objetivo

Cerrar el hueco de seguridad que REQ-DATA-001 dejó abierto a propósito: los
archivos (hoy solo avatares) se sirven con `setSharing(ANYONE_WITH_LINK)` —
cualquiera con la URL puede verlos, sin sesión. La decisión de diseño D1
(Julia, REQ-DATA-001) fue **nunca** compartir archivos como
`ANYONE`/`ANYONE_WITH_LINK`; ese REQ dejó la línea temporalmente porque el
endpoint que la reemplaza (`getArchivo`) todavía no existía. Este REQ lo crea
y saca la línea.

## Problema

`handleUploadPhoto` sube el archivo a Drive y lo marca público por link
([Code.gs:716](../../Code.gs:716), comentario explícito: *"El sharing público
se mantiene SOLO hasta REQ-MEDIA-001"*). El frontend consume esa URL pública
directo en `<img src>` ([index.html:1979](../../index.html:1979) y otros
puntos que leen `fotoUrl`). Cualquiera que consiga la URL —logueada en algún
lado, compartida por error, adivinada— ve la foto sin pasar por
`validarSesion()`.

## Usuarios afectados

Las 2 cuentas de la app (Fran, Noelia) — hoy solo suben/ven avatares propios y
ajenos (los otros usuarios ven el avatar de quien creó cada plan/categoría).

## Alcance — entra

1. **Endpoint `getArchivo`** (acción nueva en `doPost`, requiere sesión
   válida como el resto de los endpoints): recibe `archivoId`, valida sesión,
   busca la fila en `Archivos` (`estado='activo'`), lee el binario de Drive
   por `drive_file_id`, devuelve `{ base64, mimeType }`. Nunca expone
   `drive_file_id` crudo al frontend si no hace falta.
2. **Revocar `ANYONE_WITH_LINK`** de los 2 avatares ya migrados por
   REQ-DATA-001 (one-shot, sobre los `drive_file_id` de esas filas).
3. **Sacar la línea `setSharing(ANYONE_WITH_LINK)`** de `handleUploadPhoto`
   ([Code.gs:716](../../Code.gs:716)) — los archivos nuevos nacen privados.
4. **Backfill de `mime_type` / `tamano_bytes`** en las 2 filas de `Archivos`
   migradas por REQ-DATA-001 (quedaron vacías — nota pendiente de ese cierre).
   Se completan leyendo el archivo de Drive por `drive_file_id`.
5. **Frontend (Jay)**: todo punto que hoy pinta `fotoUrl` como `<img src>`
   directo pasa a pedir el archivo por `getArchivo` (POST con sesión) y
   renderizarlo como blob/data URL. Afecta como mínimo
   [index.html:1977-1982](../../index.html:1977) (`setAvatarEl`) y el preview
   de subida ([index.html:2490-2496](../../index.html:2490)).
6. **Columna `foto_url` deja de leerse** una vez el frontend usa
   `getArchivo` — no se borra la columna todavía (dato histórico, sale en un
   REQ de limpieza aparte si hace falta).

## Alcance — fuera de este REQ (a confirmar si se quiere después)

- **Fotos de planes** (adjuntar una imagen a un plan, no solo avatar de
  usuario): el modelo de `Archivos` ya soporta `owner_tipo`/`proposito`
  genéricos, así que técnicamente no hace falta cambiar el esquema — pero es
  una funcionalidad nueva de cara al usuario (UI de subida en el modal de
  plan, límites de tamaño, etc.), no una migración de seguridad. **Paul: lo
  separaría en su propio REQ una vez que este cierre**, para no mezclar
  "cerrar un hueco de seguridad" con "feature nueva". Si Franco lo quiere
  adentro de este mismo REQ, lo sumo — pero cambia el alcance y el tamaño del
  trabajo.
- Borrar la columna `Usuarios.foto_url`.
- Rol `admin` / hoja `Config` → REQ-ADMIN-001.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | `getArchivo` sin sesión válida → 401, igual que el resto de los endpoints. |
| 2 | `getArchivo` con sesión válida y `archivoId` existente/activo → devuelve `base64` + `mimeType` correctos (comparar contra el archivo real de Drive). |
| 3 | `getArchivo` con `archivoId` inexistente o `estado != 'activo'` → 404. |
| 4 | `getArchivo` con `archivoId` de un archivo ajeno (otro usuario) → decisión explícita a confirmar: ¿cualquier usuario logueado puede ver cualquier avatar (como hoy, público-pero-logueado), o solo el dueño? Marcar la respuesta acá antes de implementar. |
| 5 | Tras el REQ, los 2 archivos migrados por REQ-DATA-001 **no** tienen permiso `ANYONE_WITH_LINK` en Drive (verificable con `file.getSharingAccess()`). |
| 6 | Subir un avatar nuevo: la fila de Drive nace **sin** `ANYONE_WITH_LINK`. |
| 7 | Las 2 filas migradas de `Archivos` tienen `mime_type` y `tamano_bytes` poblados tras el backfill. |
| 8 | El frontend muestra avatares (propio y ajenos) igual que antes — sin regresión visual — pero ya no hay ningún `<img src>` apuntando a una URL pública de Drive (verificable inspeccionando el DOM/Network). |
| 9 | Ningún `Logger.log` incluye contenido de imagen (base64 ni bytes) — mismo criterio que REQ-DATA-001. |
| 10 | Sin regresión funcional: login, planes, categorías, subida de avatar, todo el resto de la app igual que antes. |

*(Falta cerrar el criterio 4 con Franco/Julia antes de que Bob empiece.)*

## Datos sensibles

Archivos (`owner_tipo='usuario'`) son datos personales (Ley 25.326) — mismo
marco que REQ-DATA-001. Este REQ además *reduce* exposición (cierra un
sharing público), así que Julia lo revisa como hardening, no como riesgo
nuevo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Revocar `ANYONE_WITH_LINK` antes de que el frontend nuevo esté desplegado rompe el `<img src>` viejo (404/403 de Drive) | Orden de deploy: primero el frontend que usa `getArchivo`, revocar el sharing público recién después de confirmar que nada depende ya de la URL pública. |
| `getArchivo` devuelve base64 de imágenes grandes por el mismo canal que el resto de la API (límites de tamaño de respuesta de Apps Script) | Ya hay precedente: `handleUploadPhoto` sube base64 de entrada sin problema a esta escala (2 usuarios). Revisar si se agranda mucho el uso. |
| Backfill de `mime_type`/`tamano_bytes` toca Drive por cada fila | Solo 2 filas hoy. One-shot, idempotente (no reescribe si ya está poblado). |

## Plan de pruebas (Duck)

1. `getArchivo` sin sesión / sesión vencida / sesión de otro usuario (según
   se resuelva el criterio 4) → criterios 1, 3, 4.
2. `getArchivo` con sesión válida sobre un archivo real → comparar el binario
   devuelto contra el original en Drive → criterio 2.
3. Backfill → inspeccionar las 2 filas migradas → criterio 7.
4. Subir avatar nuevo → verificar en Drive que nace sin `ANYONE_WITH_LINK` →
   criterio 6.
5. Correr el backfill de revocación sobre los 2 avatares migrados →
   `file.getSharingAccess()` → criterio 5.
6. Recorrer la app completa con Network abierto → confirmar que no hay
   ningún request a una URL pública de Drive → criterio 8.
7. Suite de regresión completa (como en REQ-DATA-001/002) → criterios 9, 10.
