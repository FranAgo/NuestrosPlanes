# Google Sheets desde Apps Script: escrituras, locks y caché

Cada llamada del front es una ejecución separada del Web App. Lo que una
escribe, la siguiente no siempre lo ve enseguida.

## Una escritura que el request siguiente necesita: `SpreadsheetApp.flush()`

**Qué cuidar:** si después de un `appendRow`/`setValues` el front va a
hacer otra llamada que depende de esa fila, hacer `SpreadsheetApp.flush()`
antes de responder (dentro del lock, si lo hay). Aun así, en frío puede no
alcanzar: si el caso es crítico, hace falta un puente (ver abajo).

**Por qué:** después del deploy de REQ-SEC-001, `crearSesion` escribía la
fila en `Sesiones`, el front pedía categorías y planes de inmediato, y
esas llamadas no veían la fila → 401 → pantalla negra (bitácora 2026-09,
hotfix post-deploy de REQ-SEC-001). El `flush()` no cerró del todo la
carrera: BUG-LOGIN-001 Bug B.

**Dónde ya está bien:** `crearSesion` y `revocarSesion` hacen `flush()`.
`validarSesion` cae a `validarDesdePuente()` (entrada en `CacheService`
con el hash, nunca el secreto, 120 s) solo si la hoja respondió "no está",
nunca si la lectura de la hoja tiró error.

## Lo que decide dentro del lock se lee dentro del lock

**Qué cuidar:** una lectura que decide qué hacer (¿esta tarea ya tiene
carpeta?) va después de tomar el `LockService`, no antes. Leer afuera y
escribir adentro deja la carrera intacta.

**Por qué:** `handleUploadPlanPhotos` leía la fila del plan antes del
lock y anulaba la protección en el único caso que tenía que cubrir (dos
primeras fotos simultáneas a la misma tarea). Encontrado y corregido antes
del push (bitácora 2026-09, REQ-MEDIA-002 fase 1).

## `CacheService` es del script, no de la planilla

**Qué cuidar:** toda clave de caché que dependa de datos de una planilla
incluye el ID de la planilla. Varias planillas (prod, test, las scratch de
`probarXXX()`) tienen hojas con el mismo nombre.

**Por qué:** `getDatosHoja()` cacheaba por nombre de hoja: una entrada de
una planilla de test se podía filtrar a otra corrida o a prod. Corregido
antes de correr un solo test (bitácora 2026-09, REQ-PERF-002).

**Dónde ya está bien:** `claveCacheHoja()` en `Code.gs`.

## El `ScriptLock` es uno solo: nada lento adentro

**Qué cuidar:** `LockService.getScriptLock()` es el mismo lock para todo el
script: login (`crearSesion`), completar, reabrir, acuerdos, fecha de una
foto, subidas. Todos esperan con `waitLock(10000)`. Adentro va solo lo que
evita el choque (leer lo que decide, reservar un número, escribir la fila);
Drive, `UrlFetchApp` y cualquier cosa de segundos van afuera. Si un número
tiene que ser único y lo que lo crea queda afuera, se reserva bajo el lock
con un contador (no contando lo que ya existe, que todavía no se ve). Lo
que se hizo afuera se revalida en el tramo de escritura (¿la tarea sigue
activa?).

**Por qué:** REQ-MEDIA-008 (2026-10-06): `handleUploadPlanPhotos` tenía el
lock ~4,3 s por foto (`createFile` + `setDescription`). Con 3 subidas a la
vez se serializaban igual y una dio 500 por espera; cualquier otra escritura
del otro usuario podía fallar igual. Con el lock corto, 16 fotos bajaron de
113 s a ~40 s y las escrituras concurrentes quedaron en el piso (2-3,6 s).

## Una hora (`HH:MM:SS`) en una celda va como texto

**Qué cuidar:** `appendRow`/`setValue` con `'14:05:33'` hace que Sheets la
convierta en una hora del 30/12/1899, y al leerla vuelve un `Date` con
corrimientos de zona. Se escribe con apóstrofo (`"'" + hora`) y al leer se
valida el formato (`esHoraValida`); una celda que no es texto válido se
trata como vacía.

**Por qué:** `Archivos.hora_contenido` (REQ-MEDIA-008); `probarMEDIA008` H1
verifica que la celda vuelva como `'14:05:33'` y `'09:00:01'`.
