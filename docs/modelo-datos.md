# Modelo de datos — Nuestros Planes

> Documento de diseño. Fuente de verdad del modelo de datos y las convenciones.
> **Estado:** borrador — pendiente de aprobación del owner.
> D1 (servido de imágenes) cerrada por Julia (AppSec) el 2026-09-07.
> Redactado por Gary (DBA) y Paul (PM), sesión 2026-09-07.

Nada de lo que está acá está implementado todavía. `Code.gs` no se toca hasta que
este documento esté aprobado.

---

## 1. Contexto

App web privada para dos personas. Frontend en GitHub Pages, backend en Google
Apps Script, datos en Google Sheets, archivos binarios en Google Drive.

El modelo actual guarda las fotos de perfil como una URL suelta en la hoja
`Usuarios`. Esto no escala: se vienen fotos asociadas a planes y fotos sueltas
por fecha. Este documento define una estructura que soporta esos casos sin
rediseñar nada cuando lleguen.

---

## 2. Modelo actual (referencia)

| Hoja | Columnas |
|---|---|
| `Usuarios` | `usuario_id`, `nombre_display`, `email`, `google_sub`, `foto_url` |
| `Categorias` | `categoria_id`, `nombre`, `color_hex` |
| `Planes` | `plan_id`, `titulo`, `categoria_id`, `creado_por`, `fecha_creacion`, `fecha_programada`, `fecha_vencimiento`, `estado` |

Problemas conocidos (se corrigen en los REQs de este documento):

1. `Usuarios.foto_url` guarda una URL completa de Drive — dato derivado y frágil
   (el formato de URL de Drive ya se rompió una vez: `uc?export=view` fue
   bloqueado por Google).
2. Borrado físico (`deleteRow`) en `Categorias` y `Planes` — sin rastro, sin undo.
3. `Categorias` no tiene columnas de auditoría.
4. No hay log de auditoría, y la app maneja datos personales (Ley 25.326).
5. IDs generados con `Date.now()` — colisión posible entre dos altas en el mismo
   milisegundo, sin componente aleatorio.

---

## 3. Convenciones de nombres

Reglas transferibles a cualquier tabla u hoja del proyecto.

| Elemento | Regla | Ejemplo |
|---|---|---|
| Hojas / tablas | sustantivo en plural | `Usuarios`, `Planes`, `Archivos` |
| Columnas | `snake_case`, sin tildes, sin mayúsculas | `fecha_creacion` |
| Clave primaria | `<prefijo>_<id>`, prefijo estable de 3–4 letras por tabla | `usr_`, `cat_`, `pln_`, `arc_` |
| Fechas | prefijo `fecha_`; ver [Convención de fechas y horas](#convención-de-fechas-y-horas) | `fecha_subida` |
| Enums | valores en minúscula, sin espacios | `pendiente`, `completado` |
| Booleanos | prefijo `es_` / `tiene_` | `es_publico` |
| Auditoría estándar | toda tabla lleva `creado_por`, `fecha_creacion`, `modificado_por`, `fecha_modificacion`, `estado` | — |

### Generación de IDs

Reemplaza `'<prefijo>_' + Date.now()`. ID ordenable cronológicamente + sufijo
aleatorio anti-colisión.

```javascript
// Ej: 'arc_m8x2k1p9_7f3a2c'
// Sufijo de 6 caracteres (~2.000 M de combinaciones): descarta colisiones
// aunque se generen muchos IDs en el mismo milisegundo.
function newId(prefijo) {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefijo}_${ts}_${rnd}`;
}
```

> Los IDs ya existentes (`cat_...`, `plan_...`) **no se migran**. La convención
> aplica de acá en adelante.

### Convención de fechas y horas

| Tipo de campo | Formato guardado | Ejemplo | Quién lo escribe |
|---|---|---|---|
| **Timestamp de sistema / auditoría** (`fecha_subida`, `fecha_modificacion`, `fecha_creacion`, `fecha_eliminacion`, y todo lo que vaya en `Auditoria`) | **texto ISO 8601 UTC** — `new Date().toISOString()`, termina en `Z` | `2026-09-07T21:21:46.731Z` | solo el backend |
| **Fecha del dominio, editable por el usuario** (`fecha_contenido`, `fecha_programada`, `fecha_vencimiento`) | **solo-fecha** `AAAA-MM-DD` | `2026-09-07` | usuario (vía frontend) |

Reglas:

- **Nunca se guarda hora local.** Todo timestamp es UTC con `Z` explícita. Si hace
  falta mostrarlo en hora Argentina (UTC-3), se hace en el frontend o en una
  columna auxiliar con fórmula — el valor guardado no cambia.
- Los timestamps de sistema se guardan como **texto**, no como fecha nativa de
  Sheets: es metadata de auditoría, no se filtra ni se formatea desde la
  planilla, y el texto ISO no sufre corrimientos por locale ni zona horaria de
  quien abre el archivo. Ordena cronológicamente como texto.
- El texto ISO 8601 UTC es también el formato de los logs y de la futura hoja
  `Auditoria`.

**Deuda conocida:** la hoja `Planes` guarda `fecha_creacion` / `fecha_programada`
/ `fecha_vencimiento` como **fecha nativa de Sheets** (`new Date()`), no como
texto ISO. Es una inconsistencia con `Archivos`. Se decide **no** reescribir
`Planes` ahora (funciona y `formatDate()` normaliza al leer); la estandarización
de timestamps de sistema a ISO UTC entra con **REQ-DATA-002**, junto con las
columnas de auditoría y la hoja `Auditoria`.

---

## 4. Hoja nueva: `Archivos`

No se llama `Fotos` a propósito: hoy son fotos, mañana puede ser el PDF de una
reserva o un ticket. El modelo no debería mentir sobre eso.

### Esquema

| Columna | Tipo | Notas |
|---|---|---|
| `archivo_id` | string (PK) | `arc_` + `newId()` |
| `owner_tipo` | enum | `usuario` \| `plan` \| `libre` |
| `owner_id` | string (FK) | `usuario_id` o `plan_id`; vacío si `owner_tipo='libre'` |
| `proposito` | enum | `avatar` \| `adjunto` \| `portada` |
| `titulo` | string | texto libre, editable por el usuario (nullable) |
| `fecha_contenido` | date | `AAAA-MM-DD` — la fecha "de la foto" (para la vista por fecha); default = `fecha_subida` |
| `drive_file_id` | string | **fuente de verdad del binario.** UNIQUE |
| `mime_type` | enum | `image/jpeg` \| `image/png` \| `image/webp` |
| `tamano_bytes` | number | control de cuota / diagnóstico |
| `subido_por` | string (FK) | `usuario_id` — lo pone el server |
| `fecha_subida` | datetime | ISO 8601 UTC — lo pone el server |
| `modificado_por` | string (FK) | `usuario_id` |
| `fecha_modificacion` | datetime | ISO 8601 UTC |
| `estado` | enum | `activo` \| `archivado` \| `eliminado` |
| `eliminado_por` | string (FK) | `usuario_id` — quién hizo el borrado lógico |
| `fecha_eliminacion` | datetime | ISO 8601 UTC |

### Constraints

Sheets no tiene claves foráneas. Los hace cumplir el backend en código.

| Regla | Detalle |
|---|---|
| PK | `archivo_id` único, formato `arc_...` |
| Enum `owner_tipo` | `usuario` \| `plan` \| `libre` |
| FK condicional | `owner_tipo='usuario'` → `owner_id` existe en `Usuarios` y `proposito='avatar'`. `owner_tipo='plan'` → `owner_id` existe en `Planes`. `owner_tipo='libre'` → `owner_id` vacío |
| Enum `proposito` | `avatar` \| `adjunto` \| `portada` |
| Unicidad lógica | un solo archivo con `estado='activo'` y `proposito='avatar'` por `owner_id` de tipo `usuario` |
| `drive_file_id` | requerido, único (no puede haber dos filas apuntando al mismo binario) |
| Enum `mime_type` | allowlist: `image/jpeg`, `image/png`, `image/webp` |
| Enum `estado` | `activo` \| `archivado` \| `eliminado` |
| Borrado | **nunca** `deleteRow`. Se setea `estado='eliminado'` + `eliminado_por` + `fecha_eliminacion` |
| Cascada | borrar (lógicamente) un plan → sus archivos pasan a `estado='archivado'` (recuperables si se restaura el plan) |

### Relación con `Usuarios`

`Usuarios.foto_url` se elimina. Se reemplaza por `avatar_archivo_id` (FK a
`Archivos`, nullable). Es un cache opcional para no consultar `Archivos` en cada
`getUser`. La foto se resuelve:
`avatar_archivo_id` → `Archivos.drive_file_id` → se sirve el binario.
**Nunca se guarda una URL en la base.**

---

## 5. Estructura de Drive

Una sola carpeta raíz **privada** para todo el proyecto, con la jerarquía
espejando el modelo.

```
<raíz configurable>/
└── media/
    ├── usuarios/
    │   └── <usuario_id>/
    │       └── avatar/
    │           └── <archivo_id>.<ext>
    ├── planes/
    │   └── <plan_id>/
    │       └── <archivo_id>.<ext>
    └── libres/
        └── <AAAA>/
            └── <MM>/
                └── <archivo_id>.<ext>
```

Reglas:

- **Nombre del archivo = `<archivo_id>.<ext>` y nada más.** La app nunca lee el
  nombre para obtener información — para eso está la fila en `Archivos`. El
  `archivo_id` en el nombre es solo para orientarse navegando Drive a mano.
- `<ext>` se deriva del `mime_type`: `image/jpeg→jpg`, `image/png→png`,
  `image/webp→webp`.
- `libres/` particionado por **año/mes**: Drive se degrada arriba de ~2000
  archivos por carpeta.
- **Recuperación ante desastre:** al crear el archivo, escribir en el campo
  *Descripción* de Drive un JSON con
  `{archivo_id, owner_tipo, owner_id, proposito, subido_por, fecha_subida}`.
  Si se corrompe la hoja `Archivos`, se puede reconstruir recorriendo Drive.
- **Los subfolders no se guardan en ningún lado.** Se guarda solo el ID de la
  raíz. El árbol se arma con un helper get-or-create:

```javascript
// getOrCreateFolderPath(['media', 'planes', planId]) -> Folder
function getOrCreateFolderPath(segments) {
  let folder = DriveApp.getFolderById(getConfig('drive_root_folder_id'));
  for (const name of segments) {
    const it = folder.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : folder.createFolder(name);
  }
  return folder;
}
```

---

## 6. Configuración: `Config` vs Script Properties

| Va en… | Qué | Por qué |
|---|---|---|
| **Script Properties** (solo el owner, desde el editor de Apps Script) | `SESSION_SECRET`, `OAUTH_CLIENT_ID`, `SPREADSHEET_ID` | Secretos, o cosas que si cambian mal dejan la app inaccesible |
| **Hoja `Config`** (rol `admin`, desde la web) | `drive_root_folder_id`, y a futuro cualquier ajuste operativo | Cambios legítimos de operación que no deberían requerir abrir el editor |

`DRIVE_FOLDER_ID` deja de leerse de Script Properties y pasa a `Config`
(con cache en memoria por request).

### Esquema `Config`

| Columna | Notas |
|---|---|
| `clave` | PK. Ej: `drive_root_folder_id` |
| `valor` | string |
| `descripcion` | para qué sirve |
| `modificado_por` | `usuario_id` |
| `fecha_modificacion` | ISO 8601 UTC |

Fila inicial:
`['drive_root_folder_id', '<ID actual>', 'Carpeta raíz de media en Drive', '', '']`

---

## 7. Rol `admin` y cambio de carpeta raíz

### `Usuarios` gana columna `rol`

`rol`: enum `admin` \| `miembro`. Default `miembro`. El owner se pone `admin` a
mano una sola vez.

### Por qué cambiar la carpeta no rompe nada

La base guarda `drive_file_id`, no rutas. Drive direcciona los archivos por ID
sin importar en qué carpeta estén. Cambiar la raíz solo decide **dónde caen los
archivos nuevos**. Reubicar los viejos es un extra opcional.

### Endpoint `setDriveRootFolder` (solo `admin`)

```
POST { action: 'setDriveRootFolder', sessionToken, userId, nuevoFolderId }
```

1. `rol==='admin'` o → `403`.
2. `DriveApp.getFolderById(nuevoFolderId)` — si tira excepción, el script no
   tiene acceso → `400`.
3. Chequeo de sharing: si la carpeta es `ANYONE` / `ANYONE_WITH_LINK` → `409`
   (cerrado por Julia, ver D1).
4. Verificar que ambos usuarios tengan acceso a la carpeta nueva; si falta
   alguno, devolver la lista y ofrecer agregarlo como Viewer.
5. Escribe `drive_root_folder_id` en `Config` + auditoría de la fila.
6. Log a `Auditoria` con valor anterior y nuevo.
7. Devuelve `{ ok: true, archivos_en_raiz_anterior: N }`.

### Mover lo existente (opcional, batch)

```javascript
// Trigger time-driven. Procesa ~50 archivos por corrida para no pasar el
// límite de 6 min de Apps Script. Avance en Config.migracion_cursor.
function migrarArchivosANuevaRaiz() { /* itera Archivos activos, mueve cada drive_file_id */ }
```

Si no se corre, no pasa nada: las fotos viejas quedan donde están y siguen
funcionando por su ID.

---

## 8. Hoja nueva: `Auditoria`

La app maneja datos personales (`email`, `google_sub`, fotos de personas) → cae
bajo la **Ley 25.326** (Argentina). Log liviano de accesos y cambios sensibles.

| Columna | Notas |
|---|---|
| `fecha` | ISO 8601 UTC |
| `usuario_id` | quién hizo la acción |
| `accion` | ej: `login`, `config.drive_root_folder_id`, `archivo.eliminar` |
| `entidad` | ej: `Archivos`, `Config` |
| `entidad_id` | ID afectado |
| `detalle` | JSON corto opcional (valor anterior/nuevo) |

---

## 9. Datos sensibles (marcado explícito)

| Dato | Clasificación |
|---|---|
| `Usuarios.email` | dato personal — Ley 25.326 |
| `Usuarios.google_sub` | identificador personal — Ley 25.326 |
| `Archivos` con `owner_tipo` en `usuario` / `libre` | contenido personal — Ley 25.326 |

---

## Decisiones cerradas

### D1 — Servido de imágenes al frontend

**Responsable:** Julia (AppSec). **Estado:** CERRADA (2026-09-07). **Bloquea:** REQ-MEDIA-001.

**Decisión: Opción B (proxy con sesión). Los archivos nunca se comparten como
`ANYONE` / `ANYONE_WITH_LINK`.**

Son dos canales de acceso distintos y se resuelven por separado:

| Canal | Quién accede | Cómo se protege |
|---|---|---|
| Drive directo (navegando drive.google.com) | las 2 cuentas de Google (owner + Noelia) | la carpeta raíz se comparte con esas 2 cuentas nominales, nada más |
| El sitio web (JS anónimo en github.io) | cualquiera con sesión válida de la app | endpoint `getArchivo` que valida sesión antes de devolver el binario |

#### Compartir la carpeta raíz

- Se comparte `<raíz>/` con la cuenta de Google de Noelia como **Viewer**. Los
  permisos se heredan a todo lo que cuelga. La carpeta sigue siendo privada
  (2 cuentas nominales, no enumerable, no filtrable por URL).
- **Viewer, no Editor**, mientras el sistema esté en uso: alcanza para preservar
  y descargar todo, y evita que un movimiento/renombre accidental de carpeta
  rompa `getOrCreateFolderPath` (que busca por nombre). Al dar de baja el
  sistema, el owner pasa a Editor o transfiere la propiedad.
- Los archivos quedan propiedad de la cuenta que corre el script. La garantía de
  "queda todo guardado si dejamos de usar el sistema" depende de que esa cuenta
  siga existiendo. Con Gmail personal no hay Unidad Compartida (es Workspace,
  pago). Aceptable para 2 personas; señalado para Roy.

#### Endpoint `getArchivo`

1. Valida sesión (igual que el resto de los endpoints).
2. `archivo_id` → fila en `Archivos`. Si `estado='eliminado'` → `404`.
3. Autorización: sesión válida + archivo no eliminado. Ambos usuarios ven todo el
   espacio compartido; no hay chequeo por-usuario.
4. Devuelve el binario.

**Restricción de implementación:** Apps Script `ContentService` no transmite
binario real. `getArchivo` devuelve el contenido en **base64** dentro del JSON;
el frontend lo renderiza como `data:` URI o `Blob` URL. Overhead ~33%, aceptable.
El `archivo_id` es inmutable → el frontend cachea la imagen para siempre por ID.

#### Impacto en el código actual

- Se **elimina** la línea `file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, ...)`
  de `handleUploadPhoto` (Code.gs:252). Los archivos nuevos heredan los permisos
  de la carpeta.
- En la migración (REQ-DATA-001) se revoca el `ANYONE_WITH_LINK` de los 2
  avatares actuales.

#### `setDriveRootFolder` — chequeos de seguridad

- Rechazar si el sharing de la carpeta nueva es `ANYONE` / `ANYONE_WITH_LINK` → `409`.
- Verificar que ambos usuarios tengan acceso; si falta alguno, devolver la lista
  y ofrecer agregarlo como Viewer.
- Registrar en `Auditoria` (carpeta anterior y nueva).

#### Riesgos residuales aceptados

| Riesgo | Por qué se acepta |
|---|---|
| Comprometer cualquiera de las 2 cuentas de Google expone todas las fotos | Mismo riesgo que tener la app; no lo agrava |
| La durabilidad del archivo depende de la cuenta de Google del owner | Aceptable para 2 personas; alternativa (Workspace) es paga — queda para Roy |
| Las fotos pasan por Apps Script como base64 | Los logs nunca registran el blob ni el base64 |

En todos los casos la base guarda `drive_file_id`, nunca una URL.

---

## Plan de REQs

| REQ | Qué | Depende de | Prioridad |
|---|---|---|---|
| **REQ-DATA-001** | Hoja `Archivos` + convenciones + `newId` + migración de los 2 avatares actuales | — | Alta (fundación) |
| **REQ-DATA-002** | Borrado lógico en `Categorias`/`Planes` + columnas de auditoría + hoja `Auditoria` + estandarizar timestamps de sistema a ISO 8601 UTC | — | Media |
| **REQ-SEC-001** | Token de sesión con expiración + revocable (backlog #1; sube de prioridad al exponer config por web) | — | Alta |
| **REQ-ADMIN-001** | Rol `admin` + hoja `Config` + `setDriveRootFolder` + pantalla de ajustes | DATA-001, SEC-001 | Media |
| **REQ-MEDIA-001** | Subida y servido de fotos de planes (`getArchivo` proxy) | DATA-001 | Baja (cuando se pida) |

Backlog independiente que sigue abierto: XSS en `renderPlanes` (escapar
`cat.nombre` / `cat.colorHex` / `fotoUrl`), endurecimiento backend (sanitizar
celdas `= + - @`, pre-validar JWT antes de `tokeninfo`).
