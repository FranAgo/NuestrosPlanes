# Fechas y zonas horarias

## "Hoy" nunca sale de `toISOString()`

**Qué cuidar:** `new Date().toISOString().split('T')[0]` devuelve el día
en **UTC**. En Argentina (UTC-3), desde las 21:00 da el día siguiente, y el
último día del mes da el mes siguiente. Un día de calendario ("la fecha de
la foto", "hoy") se calcula en hora Argentina:
`Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd')`
en Apps Script, o con los getters locales en el navegador. `toISOString()`
solo sirve para timestamps de sistema (`fecha_subida`, `Auditoria`), que
son UTC a propósito (`docs/modelo-datos.md`). Que `appsscript.json` tenga
`timeZone` no cambia a `toISOString()`: siempre es UTC.

**Por qué:** BUG-FECHA-001 (2026-09-27). Las fotos que Noelia subió a las
22 h quedaron con fecha del día siguiente (`Code.gs`, `insertArchivo` y la
carpeta y el nombre de archivo en `handleUploadPlanPhotos`).

**Dónde ya está bien:** `fechaDiaArgentina(instante?)` en `Code.gs` es la
forma única de obtener "hoy" (o el día de un instante) en el servidor. Usa
`ahoraApp()`, que los tests fijan con `RELOJ_OVERRIDE` para simular una
hora puntual (ej. 22:30) sin esperar a que sea esa hora.

## Leer una fecha "solo día" sin que se corra

**Qué cuidar:** `new Date('2026-10-01')` se interpreta como medianoche UTC,
que en Argentina es el día anterior a las 21 h. Una fecha `AAAA-MM-DD` se
compara y se muestra como texto, o se arma con `new Date(a, m-1, d)`
local.

## Leer fechas de la hoja: `formatDate()` usa `toISOString()` a propósito

**Qué cuidar:** en la hoja conviven dos formas de fecha "solo día": Planes
guarda `new Date('AAAA-MM-DD')` (medianoche **UTC**) y un texto
`AAAA-MM-DD` o una edición a mano queda a medianoche **de la planilla**
(hora Argentina). `toISOString()` da el día correcto para las dos; leerlas
en hora Argentina corre las de Planes al día anterior. No "arreglar"
`formatDate()` sin cambiar antes cómo se escriben.

**Por qué:** BUG-FECHA-001 (2026-09-27): el primer intento de fix cambió
`formatDate()` a la zona de la planilla y Duck lo frenó antes de probar. El
test con la planilla en otra zona (Tokio) no lo detectaba; el que vale es
con la planilla en hora Argentina, como prod.
