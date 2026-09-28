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

**Dónde ya está bien:** todavía en ningún lado. Al arreglar BUG-FECHA-001,
anotar acá la función que quede como la forma única de obtener "hoy".

## Leer una fecha "solo día" sin que se corra

**Qué cuidar:** `new Date('2026-10-01')` se interpreta como medianoche UTC,
que en Argentina es el día anterior a las 21 h. Una fecha `AAAA-MM-DD` se
compara y se muestra como texto, o se arma con `new Date(a, m-1, d)`
local. `formatDate()` de `Code.gs` convierte las fechas nativas de Sheets
con `toISOString()`: revisar esa variante en BUG-FECHA-001.
