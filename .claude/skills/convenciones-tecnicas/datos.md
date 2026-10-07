# Datos: lo propio de Nuestros Planes

Forma e integridad de lo que se guarda en Google Sheets y Drive. El
procedimiento vive en `hgary-cambio-datos` y `hgary-integridad`; el mapa
de hojas, columnas, IDs y carpetas, en `docs/modelo-datos.md` (con
huecos conocidos: BL-042); acá, los cuidados de este proyecto. Orden de
columnas y altas por posición: `contratos.md` §5. Escrituras
concurrentes, locks y caché: `sheets-concurrencia.md`.

Contenido: 1. Columna nueva, que cambia o que se saca · 2. Borrar ·
3. Funciones que escriben sobre datos reales · 4. Chequeos de solo
lectura · 5. Ediciones a mano en la planilla · 6. Respaldo antes de
escribir.

## 1. Columna nueva, que cambia o que se saca

**Qué cuidar:**
- Una columna nueva se agrega al final con `ensureColumn` dentro de
  `setupSheets()`, nunca insertando ni reordenando. `ensureColumn` usa
  `getLastColumn()`: si el código nuevo ya escribió una fila con una
  celda de más antes de que exista el header, el header queda corrido una
  columna. Por eso en prod el orden es `clasp push`, `clasp run
  setupSheets`, y recién después `version` + `redeploy`
  (`apps-script-clasp.md`).
- Antes de decir "no hace falta migrar", buscar todos los lectores:
  handlers de `Code.gs` (por nombre y por posición), la normalización del
  front al cargar (`index.html`), los `probarXXX()` y sus sembrados
  (`probarDATA002` compara headers contra la constante), y las funciones
  de mantenimiento.
- Sacar o renombrar una columna: primero ningún lector por posición ni por
  nombre (el login lee `Usuarios` con `row[1]` y `row[4]`), deploy, y
  recién después la columna. Lo más seguro suele ser dejarla vacía y
  sacarla de la constante solo si nada la escribe.

**Por qué:** REQ-DATA-002 (columnas de auditoría al final, bitácora
2026-09). REQ-PLAN-001 (2026-09-28): el `setupSheets` de prod habría
corrido con el código de v24 si se hacía antes del push. Validación con
Claude B (2026-10-06): sacar `foto_url` de `Usuarios` corría
`avatar_archivo_id` a la posición que el login lee como foto.

## 2. Borrar

**Qué cuidar:** `Planes` y `Categorias` tienen borrado lógico: `estado`
pasa a `eliminado` / `eliminada`, con `eliminado_por` y
`fecha_eliminacion`; la fila queda. Todo lector filtra por estado. Al
borrar una tarea, sus fotos pasan a `archivado` en `Archivos`
(`archivarFotosDePlanes`); Drive no se toca (ni los archivos ni la
carpeta de la tarea). Borrados físicos que sí existen:
- `purgarSesiones` borra de `Sesiones` las filas revocadas y las vencidas
  hace más de 7 días;
- dar de baja a un usuario es borrar su fila de `Usuarios` (comentario al
  final de `Code.gs`). Sus `creado_por` quedan apuntando a un id que ya no
  está; el front lo tolera.

**Por qué:** REQ-DATA-002 (borrado lógico y auditoría). Parche 1.8.1
(BL-017): una foto de una tarea borrada se seguía sirviendo. BL-039: dos
casos raros en que el archivado no pasa.

## 3. Funciones que escriben sobre datos reales

**Qué cuidar:** un backfill o una corrección es una función de `Code.gs`
que no se expone en `doPost` y se corre con `clasp run` (perfil `duck`).
- **Proyecto explícito**: `clasp run` sin `-P` va a **prod** (usa
  `.clasp.json`). Para test, siempre `-P .clasp-test.json`.
- **Simulación por defecto**: las funciones nuevas reciben un parámetro
  que por defecto no escribe (`simular` = `true` si falta). Ojo con
  `archivarFotosDePlanesEliminados(soloContar)`: al revés, **escribe si no
  se le pasa nada**; para leer, `[true]` explícito.
- **Idempotente**: correrla dos veces da el mismo resultado; una corrida
  que muere a mitad se puede repetir.
- **Resumen** que devuelve: leídos, cambia, saltea, sin resolver (lo que
  pide `hgary-cambio-datos`), sin datos personales. Va a la bitácora.
- **Tope de 6 minutos** por ejecución: escribir con `setValues` por rango,
  no `setValue` celda por celda, y si son muchas filas, por tandas que se
  puedan repetir. Si la app puede escribir las mismas filas mientras
  corre, tomar el mismo `LockService` que los handlers.
- Primero en test (contra una planilla con la forma real o en un
  `probarXXX()`), después en prod con el OK de Franco para ese paso y la
  copia del §6.

**Por qué:** `migrarAvataresAArchivos` (REQ-DATA-001, bitácora 2026-09):
no era idempotente si una corrida moría entre insertar en `Archivos` y
escribir `avatar_archivo_id`; Duck lo frenó antes del deploy. En
`revocarSharingPublicoArchivos` eran 4 filas en prod, no 2 como decía la
nota del REQ: se cuenta antes de escribir.

**Estado de las funciones que ya existen:**

| Función | Estado | ¿Se puede reusar? |
|---|---|---|
| `migrarAvataresAArchivos` | Corrida (REQ-DATA-001) | Sí, idempotente (contador `reparados`) |
| `backfillAuditoriaCategoriasPlanes` | Corrida (REQ-DATA-002) | Sí, idempotente |
| `backfillMetadataArchivos`, `revocarSharingPublicoArchivos` | Corridas (REQ-MEDIA-001) | Sí |
| `corregirFechaContenidoArchivos` | Corrida una vez (BUG-FECHA-001, 16 filas; segunda corrida 0) | **No**: no lee `fecha_origen` (REQ-MEDIA-005, posterior) y pisaría una fecha cargada a mano |
| `archivarFotosDePlanesEliminados` | Contada en prod en 1.8.1 con `[true]`: `{tareas:0, fotos:0}`, no hizo falta escribir | Sí, pero escribe por defecto (ver arriba) |

## 4. Chequeos de solo lectura

**Qué cuidar:** una pregunta sobre datos de prod se responde con una
función de solo lectura en `Code.gs` (no expuesta en `doPost`) que
devuelve lo mínimo: cantidades y, si hace falta, títulos; nunca emails,
tokens ni IDs de Drive. Se prueba en un `probarXXX()` y se corre suelta
con `clasp run -u duck` (`verificacion-navegador.md` §6), con el OK de
Franco por ser prod. El detalle con datos personales no va al chat ni al
repo (Ley 25.326).

**Por qué:** BL-038: `conteoPlanesSinCategoria()` respondió `{ cantidad:
0 }` en prod y evitó construir una pantalla que no hacía falta.

## 5. Ediciones a mano en la planilla

**Qué cuidar:** Franco no edita la planilla a mano: cada flujo manual se
propone como acción en la app. Si igual pasa (alta o baja de un usuario
en `Usuarios`, que hoy es manual), el código tiene que tolerar lo que una
persona escribe: celdas vacías, fechas que Sheets convierte a `Date`,
espacios. Una columna agregada o movida a mano rompe las altas
(`contratos.md` §5). Un dato mal cargado se corrige con una función del
§3, no editando otra celda a mano.

**Por qué:** pedido de Franco (backlog, BL-038: "Franco quiere todo desde
la app"). REQ-SYNC-001 cuenta las ediciones a mano como un caso a
soportar.

## 6. Respaldo antes de escribir

**Qué cuidar:** hoy no hay copia propia de la planilla ni de las fotos:
solo el historial de versiones de Sheets y la papelera de Drive (30 días),
dentro de la misma cuenta (`docs/infra/inventario.md` §4, BL-040). Antes
de una escritura masiva en prod:
1. copia de la planilla (Archivo → Hacer una copia, o
   `DriveApp.getFileById(id).makeCopy(nombre)`) con fecha y motivo en el
   nombre, en la Drive de Franco, fuera de la carpeta de fotos;
2. verificarla: misma cantidad de filas por hoja que el original (una
   función de solo lectura que devuelva los conteos de las dos);
3. anotar el nombre en la bitácora. Es la vuelta atrás y tiene datos
   personales: se manda a la papelera cuando el cambio se confirma en uso,
   y se anota.

**Por qué:** primera revisión de infraestructura (2026-10-06): el
historial de versiones no es un respaldo independiente y nunca se probó
una restauración. La corrección de BUG-FECHA-001 se hizo sin copia.
