# REQ-DATA-001 — Fundación del modelo de archivos

> **Estado:** CERRADO (2026-09-08) — 10/10 criterios verificados, incluido el
> smoke test en producción. Ver [Cierre](#cierre).
> **Dueño técnico:** Bob · **QA:** Duck · **PM:** Paul
> **Depende de:** nada aguas arriba. REQ-MEDIA-001 y REQ-ADMIN-001 dependen de este.
> Ver diseño completo en [../modelo-datos.md](../modelo-datos.md).

## Objetivo

Crear la fundación del modelo de archivos **sin romper nada de lo que hoy
funciona**. Patrón: se empieza a poblar la estructura nueva (`Archivos`) mientras
la vieja (`Usuarios.foto_url`) sigue en uso; el switch de lectura y el borrado de
lo viejo son REQs posteriores.

## Alcance — entra

1. **Hoja `Archivos`** con el esquema de la sección 4 del modelo de datos
   (16 columnas).
2. **Helper `newId(prefijo)`** — ID ordenable + sufijo aleatorio. Se adopta en
   los `appendRow` de archivos. **Los IDs ya existentes (`cat_...`, `plan_...`)
   no se re-generan.**
3. **Columna `Usuarios.avatar_archivo_id`** (FK a `Archivos`, nullable).
4. **`setupSheets()` actualizado**: crea `Archivos`; agrega `avatar_archivo_id` a
   `Usuarios` si falta. Idempotente — correrlo dos veces no duplica nada.
5. **`migrarAvataresAArchivos()`** — one-shot, idempotente: por cada usuario con
   `foto_url`, extrae el `drive_file_id`, crea la fila en `Archivos`
   (`owner_tipo='usuario'`, `proposito='avatar'`, `estado='activo'`) y setea
   `avatar_archivo_id`.
6. **Rewire del alta de avatar** (`handleUploadPhoto`): además de subir el archivo
   a Drive, crea la fila en `Archivos`, archiva el avatar anterior del usuario
   (`estado='archivado'`) y actualiza `avatar_archivo_id`. Sigue escribiendo
   `foto_url` como cache. `handleUpdateAvatar` pasa a ser interno
   (`setAvatarEnUsuario`) y sale del router.
7. **Helpers de acceso**: `insertArchivo`, `getArchivoRow`, `archivoExists`,
   `archivarAvataresActivos`, `buscarAvatarActivo`, `extraerDriveFileId`.

### Hardening aplicado tras la revisión de Duck

- **F1**: en `handleUploadPhoto` se archiva el avatar anterior **antes** de
  insertar el nuevo como activo. Si algo falla en el medio, queda 0 avatares
  activos (el `foto_url` viejo sigue renderizando, se autocorrige en la próxima
  subida) en vez de 2.
- **F2**: `migrarAvataresAArchivos` es idempotente también ante una corrida
  previa que murió a mitad: si ya existe una fila `Archivos` activa de avatar
  para el usuario, la reusa (`reparados++`) en lugar de crear una duplicada.

## Alcance — NO entra (queda para después)

- Endpoint `getArchivo` de servido de imágenes → REQ-MEDIA-001.
- Revocar `ANYONE_WITH_LINK` de los avatares → REQ-MEDIA-001 (junto con
  `getArchivo` y el switch del frontend). `handleUploadPhoto` **mantiene** la
  línea `setSharing(ANYONE_WITH_LINK)` por ahora.
- Eliminar la columna `foto_url` → cuando el frontend use `getArchivo`.
- Borrado lógico de `Categorias`/`Planes`, hoja `Auditoria` → REQ-DATA-002.
- Rol `admin`, hoja `Config` → REQ-ADMIN-001.
- Cambios en el frontend (`index.html`). Este REQ es solo backend + datos.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | `setupSheets()` corre sin error sobre la planilla existente y crea `Archivos` con los 16 headers exactos. Correrlo dos veces no duplica hojas ni headers ni columnas. |
| 2 | Tras `setupSheets()`, `Usuarios` tiene la columna `avatar_archivo_id` y **no se perdió ningún dato ni se movió ninguna columna existente**. |
| 3 | `migrarAvataresAArchivos()` crea exactamente **una** fila en `Archivos` por cada usuario que tenía `foto_url`, con `owner_tipo='usuario'`, `owner_id`=usuario_id, `proposito='avatar'`, `estado='activo'`, `drive_file_id`=ID extraído de la URL, `subido_por`=usuario_id, `fecha_subida` en ISO 8601. |
| 4 | Tras la migración, cada uno de esos usuarios tiene `avatar_archivo_id` apuntando a su fila. |
| 5 | `migrarAvataresAArchivos()` es **idempotente**: una segunda corrida no crea filas duplicadas ni pisa nada (log dice `creados=0`). |
| 6 | `newId('arc')` devuelve formato `arc_<base36>_<6 alfanuméricos>`. 1000 llamadas seguidas en el mismo milisegundo: 0 colisiones (probado con 100k → 2 colisiones, ratio despreciable para la escala de la app). |
| 7 | **Sin regresión funcional**: login, ver planes, ver/editar categorías, ver avatar (sigue por `foto_url`) — todo igual que antes. |
| 8 | Subir un avatar nuevo (`uploadPhoto`): crea fila `Archivos` `activo`, marca la anterior `archivado`, actualiza `avatar_archivo_id` y `foto_url`. Queda **una sola** fila `activo` con `proposito='avatar'` para ese usuario. |
| 9 | Si un `foto_url` tiene un formato del que no se puede extraer el file ID, la migración lo **loguea y lo salta** — no aborta ni deja el usuario a medias. |
| 10 | Ningún `Logger.log` incluye contenido de imagen (base64 ni bytes). |

## Datos sensibles

Las filas de `Archivos` con `owner_tipo='usuario'` son datos personales
(Ley 25.326). Marcado para Julia y Gary.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `setupSheets()` sobre `Usuarios` con datos reales | `ensureColumn` solo agrega columna al final, nunca inserta ni reordena. Probar primero en una **copia** de la planilla. |
| La regex de `extraerDriveFileId` depende del formato actual de `foto_url` (`thumbnail?id=<ID>&sz=w400`) | Soporta también `uc?export=view&id=` y `/file/d/<ID>/`. Formato desconocido → salta y loguea (criterio 9). |
| Correr la migración antes de `setupSheets()` | `migrarAvataresAArchivos()` chequea que exista `avatar_archivo_id` y aborta con mensaje claro si falta. |

## Plan de pruebas (Duck)

1. Copiar la planilla de producción a una de prueba; apuntar un deployment de
   test a esa copia.
2. Correr `setupSheets()` → verificar criterios 1, 2.
3. Correr `migrarAvataresAArchivos()` → verificar criterios 3, 4.
4. Correr `migrarAvataresAArchivos()` de nuevo → verificar criterio 5.
5. Subir un avatar nuevo desde la app de test → verificar criterio 8.
6. Recorrer la app completa (login, planes, categorías, perfil) → criterio 7.
7. Editar a mano un `foto_url` a un valor basura en un usuario de prueba y
   re-migrar → criterio 9.

## Cierre

**2026-09-08 — CERRADO.** Los 10 criterios de aceptación verificados. Bob
entregó, Duck aprobó, Paul verificó contra los criterios originales.

### Verificado por Duck (planilla de test `Nuestros Planes — TEST`)

| Criterio | Resultado |
|---|---|
| 1 — `setupSheets()` crea `Archivos` con 16 headers, idempotente | ✅ |
| 2 — `Usuarios` gana `avatar_archivo_id` sin perder datos ni reordenar | ✅ |
| 3 — migración crea 1 fila/usuario con foto, campos correctos, fechas ISO | ✅ (2 filas: Fran, Noelita) |
| 4 — `avatar_archivo_id` apunta a la fila correcta | ✅ (`arc_mtrqx9m6_xfwmcs`, `arc_mtrqxa39_iauftu` coinciden en ambas hojas) |
| 5 — migración idempotente en re-corrida | ✅ (corrida 2: `creados:0, yaMigrados:2`) |
| 6 — formato de `newId` | ✅ |
| 9 — `foto_url` sin file ID extraíble → salta y loguea | ✅ (probado + `saltados:0` con datos reales, F3 descartado) |
| 10 — logs sin binario | ✅ (revisión de código) |

### Gate de promoción a producción (criterios 7 y 8) — smoke test 2026-09-08

Ejecutado sobre producción (`franago.github.io/NuestrosPlanes/`) después de
pegar `Code.gs` en el Apps Script real, correr `setupSheets()` +
`migrarAvataresAArchivos()` (`creados:2`) y republicar el Web App:

- [x] Login con Google funciona
- [x] Se ven planes y categorías (sin regresión)
- [x] El avatar existente sigue apareciendo
- [x] Subir un avatar nuevo: crea fila `activo` en `Archivos`, archiva la
  anterior, actualiza `avatar_archivo_id` + `foto_url`

### Notas trasladadas a otros REQs

- **REQ-MEDIA-001**: `mime_type` y `tamano_bytes` quedan vacíos en las 2 filas
  migradas. `getArchivo` deberá leer el MIME de Drive o backfillear esas filas.
- **REQ-MEDIA-001**: revocar `ANYONE_WITH_LINK` de los avatares + eliminar la
  línea `setSharing` de `handleUploadPhoto`.
- Bob señaló: `insertArchivo` no valida unicidad de `drive_file_id`. Aceptable a
  esta escala; revisar si aparece subida concurrente.
