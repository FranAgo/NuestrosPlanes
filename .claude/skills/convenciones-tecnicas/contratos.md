# Contratos: lo propio de Nuestros Planes

Qué más depende de lo que se toca entre `index.html` y `Code.gs`. El
procedimiento vive en `hbob-impacto-cambio` y `hbob-salud-codigo`; acá,
lo de este proyecto. El nivel de control lo define `CLAUDE.md`: una
columna nueva o un cambio que toca `index.html` y `Code.gs` a la vez es
cambio de fondo aunque el parámetro sea opcional (más estricto que el
"parámetro opcional no cambia el contrato" de `hbob-impacto-cambio`). Una
reorganización que cruza los dos archivos, también.

Contenido: 1. El contrato front–servidor · 2. Acción nueva · 3. Orden de
publicación · 4. Respuestas y errores · 5. Orden de columnas · 6. Fotos
de una tarea: dónde se filtra · 7. Datos derivados y conteos · 8. Código
muerto conocido.

## 1. El contrato front–servidor

**Qué cuidar:** la app usa un único `POST` a `SCRIPT_URL` con
`{ action, sessionToken, userId, ...params }` (el `doGet` es solo el
runner de tests del proyecto de test):
- `api()` / `apiLectura()` en `index.html` arman el cuerpo; el servidor
  rutea en `doPost` contra `accionesDelServidor()`.
- La identidad sale de la sesión, nunca del cuerpo: `doPost` pisa
  `body.userId` con el de la sesión, salvo en `getUser`, donde `userId`
  es la persona consultada.
- Un parámetro nuevo que el servidor exige rompe a las pestañas abiertas
  con el front viejo. En una edición, el servidor distingue `undefined`
  (front viejo: no tocar el campo) de `''` (borrarlo).

**Dónde ya está bien:** `doPost` y `accionesDelServidor()` en `Code.gs`;
`api()` en `index.html`.

## 2. Acción nueva

**Qué cuidar:** una acción nueva se suma en `accionesDelServidor()` y en
ningún otro mapa. Pasa por el chequeo de sesión salvo que esté en
`ACCIONES_SIN_SESION` (hoy `loginGoogle`; `logout` también figura, pero
`doPost` lo atiende antes del chequeo). Sumar una ahí es un cambio de
seguridad (`hjulia-revision-cambio`). Si el 401 de esa acción no tiene
que cerrar la sesión en el front, va también en `SILENT_401`. Las
funciones de mantenimiento (`setupSheets`, backfills,
`conteoPlanesSinCategoria`, `archivarFotosDePlanesEliminados`,
`corregirFechaContenidoArchivos`, `listarTriggers`) no se exponen en
`doPost`: se corren con `clasp run` (`datos.md` §3).

**Por qué:** BL-002 (1.8.1): había que acordarse de sumar cada acción
nueva al test de "sin sesión → 401". Desde entonces `probarParche181`
recorre `accionesDelServidor()` entero.

## 3. Orden de publicación

**Qué cuidar:** el front (GitHub Pages) y el servidor (Apps Script) se
publican por separado. Lo que habilita va antes de lo que lo usa: si el
front llama a una acción o manda un campo nuevo, primero el servidor
(con `setupSheets` antes del `redeploy` si hay columna nueva, `datos.md`
§1) y recién después el push de `index.html`. Si el servidor deja de
aceptar algo que el front viejo manda, al revés, y las pestañas abiertas
siguen con el front viejo hasta recargar. El orden completo lo arma
`hroy-deploy`.

**Por qué:** REQ-MEDIA-001 (bitácora 2026-09, deploy v18): el
`index.html` que llamaba a `getArchivo` ya estaba en `main`, y por lo
tanto en Pages, antes de que el servidor de prod tuviera la acción. En
REQ-MEDIA-002 se hizo en dos pasos y no hubo ventana rota.

## 4. Respuestas y errores

**Qué cuidar:** Apps Script responde siempre HTTP 200: el estado real
viaja adentro, `{ status, ...data }` (`respond()`). El front decide por
`data.status`, nunca por `res.ok`. Un 500 lleva `codigo` (`E-XXXXXX`) y
ningún detalle interno. Un error de carga no se pinta como lista vacía
(`red-y-archivos-cliente.md`), y solo las lecturas se reintentan
(`apiLectura`): una escritura reintentada puede crear algo dos veces.

**Por qué:** BUG-CARGA-001: cargas fallidas que se veían como "no hay
planes" y que nadie podía rastrear.

## 5. Orden de columnas

**Qué cuidar:** las altas (`handleCreatePlan`, `crearSesion`,
`insertArchivo`, `registrarAuditoria`, `handleCreateCategoria`) arman la
fila recorriendo la constante de headers (`PLANES_HEADERS`,
`SESIONES_HEADERS`, `ARCHIVOS_HEADERS`, `CATEGORIAS_HEADERS`) y hacen
`appendRow` **por posición**. Por eso:
- el orden de las columnas de la hoja tiene que ser el de la constante;
  una columna agregada o movida a mano corre todas las altas;
- una columna nueva se suma al final de la constante y de la hoja
  (`ensureColumn` en `setupSheets()`), nunca en el medio;
- un campo nuevo necesita su `case` en el `switch` del alta: el `default`
  devuelve `''` y lo descarta sin avisar;
- las lecturas son mezcla: la mayoría busca el índice por nombre
  (`headers.indexOf`), pero el login lee `Usuarios` por posición
  (`row[1]`, `row[4]` en `handleLoginGoogle`). Sacar o reordenar una
  columna exige revisar las dos formas (`datos.md` §1).

**Por qué:** validación con Claude B del 2026-10-06: la primera versión de
este tema decía "por nombre, no por posición" y era falso para las altas.
REQ-DATA-002 sumó las columnas de auditoría al final por esto.

## 6. Fotos de una tarea: dónde se filtra

**Qué cuidar:** servir una foto (`getArchivo`, `getArchivos`,
`getMiniaturas`) mira solo `archivo.estado === 'activo'`, no el estado de
la tarea. Lo que impide servir la foto de una tarea borrada es que
`handleDeletePlan` archiva sus fotos (`archivarFotosDePlanes`). Las
listas sí filtran por la tarea: `getRecuerdos`, `getFotosPlan`
(`buscarPlanActivo`). El mismo criterio "adjunto activo de esta tarea"
aparece además en `conteoFotosPorPlan` (conteo de la tarjeta),
`contarFotosActivasPlan` (condición para completar), `handleSetFechaFoto`,
`getRecentPlanPhotos` y `archivarFotosDePlanesEliminados`. Un cambio de
criterio se busca en todas; un arreglo en el archivado alcanza a las tres
que sirven.

**Por qué:** parche 1.8.1 (BL-017): `getArchivo` servía la foto de una
tarea borrada (probarParche181 dio 10/17 FAIL con el código de 1.8.0); el
arreglo fue archivar al borrar. BL-039: dos casos raros en que el
archivado no pasa y la foto se sigue sirviendo por id.

## 7. Datos derivados y conteos

**Qué cuidar:** quién escribe y quién lee lo que no se carga a mano:
- `acuerdos_cierre` de `Planes`: lo escribe `setAcuerdoCierre`; lo vacían
  `completePlan` y `reopenPlan`;
- `fecha_completado` y `completado_por`: los escribe `completePlan`;
  `reopenPlan` no los limpia (quedan los del último cierre);
- `carpeta_fotos_drive_id`: la primera subida de fotos de la tarea, bajo
  lock; editar el título no la renombra;
- `plan.fotos` (conteo de la tarjeta): no se guarda, lo calcula
  `getPlanes`. El front lo relee solo después de una subida propia; si
  sube la otra persona, la tarjeta queda vieja hasta recargar, y el
  detalle (`getFotosPlan` + caché `cp_fotos_plan`) no.

Si se toca uno, se revisan los que lo leen y las cachés del front
(`state.planes`, `cp_fotos_plan`).

## 8. Código muerto conocido

- `getRecentPlanPhotos`: el front no la llama desde 1.1.0 (REQ-MEDIA-003),
  sigue en `accionesDelServidor()`. Va al backlog (BL-043) para borrarla
  con su prueba (`hbob-salud-codigo`).
