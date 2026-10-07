# Tests: lo propio de Nuestros Planes

Lo que un procedimiento de prueba (`hduck-prueba-cambio`,
`hduck-test-en-rojo`) necesita saber de este proyecto. Los tests de
seguridad están en `seguridad.md` §7; la verificación en el navegador, en
`verificacion-navegador.md`.

Contenido: 1. Qué hay y qué no · 2. Correr y leer una suite · 3. Estado
previo, versión vieja y mutantes · 4. Planilla scratch y seams · 5. Cuánto
da una suite · 6. Lo que no se puede probar en test · 7. Rojos conocidos
(cuarentena).

## 1. Qué hay y qué no

**Qué cuidar:** no hay suite local de lógica del front ni `npm test`. Las
pruebas son:
- funciones `probarXXX()` en `Tests.gs`, contra Apps Script y Sheets
  reales en el proyecto de **test**, casi siempre una por REQ, BUG o
  parche (`probarBL015`, `probarParche181`);
- `node check-sintaxis.js`: sintaxis de `index.html`, `Code.gs` y
  `Tests.gs` y formato de los estados de REQ y backlog. No ejecuta nada:
  que pase no dice que la lógica esté bien;
- `node check-contraste.js`: contraste de los pares de colores declarados;
- el navegador con `fetch` simulado para el front
  (`verificacion-navegador.md` §8).

Un cambio de lógica del front se prueba en el navegador, no con un test
que no existe. Donde una herramienta dice "golden master" o "snapshot",
acá no hay; lo que lo reemplaza para reorganizar código del servidor es
un test de caracterización: un `probarXXX()` que fija lo que hoy
devuelven los handlers, en verde antes de mover nada. Para un cambio
chico no se arma uno.

**Por qué:** las sesiones de septiembre y octubre se verificaron siempre
con esa combinación (bitácora, entradas de REQ-PLAN-002 y REQ-PLAN-003).

## 2. Correr y leer una suite

**Qué cuidar:**
```bash
clasp push -f -P .clasp-test.json -I .claspignore-test
clasp run probarPLAN003 -P .clasp-test.json -u duck
```
- Cada comando suelto, uno por llamada (`apps-script-clasp.md`).
- Devuelve `{ req, total, ok, fail, veredicto, detalles, notas }`
  (`nuevoReporte()` en `Tests.gs`). Se reporta `ok/total` y los
  `detalles` con `FAIL` por su `desc`, no solo el veredicto.
- `clasp run` corre el código subido a `@HEAD` del proyecto de test: sin
  el `push` de antes, se prueba la versión anterior.
- La unidad mínima es el `probarXXX()` entero: sus grupos comparten
  planilla y se encadenan, no se corre un caso suelto. "Correrlo 3 veces"
  (`hduck-prueba-cambio`, `hduck-test-en-rojo`) es correr el `probarXXX()`
  completo 3 veces.
- Qué suites tocan un cambio: `grep -n "<acción o handler>" Tests.gs`
  (las suites llaman a los handlers o entran por `doPost` con el nombre de
  la acción). Siempre se suma `probarParche181`, que recorre todas las
  acciones, si el cambio toca `doPost` o una acción.
- Un "No response" es un handler que devuelve `TextOutput`; un
  `invalid_grant`, el token de `duck` vencido (`apps-script-clasp.md`).

**Dónde ya está bien:** las entradas de la bitácora del 2026-10-05 listan
cada suite con su `ok/total`.

## 3. Estado previo, versión vieja y mutantes

**Qué cuidar:**
- Antes de tocar `Code.gs`, correr las suites relacionadas y anotar
  `ok/total`. Sin eso, "ya fallaba" no se puede afirmar.
- "El test muerde": pushear a test el `Code.gs` anterior al cambio (con
  `Tests.gs` nuevo), correr la suite nueva y ver que falla; después el
  nuevo. Para no tocar el árbol: `git show <commit>:Code.gs` a una
  carpeta del scratchpad con copia de `.clasp-test.json`,
  `.claspignore-test`, `appsscript.json` y `Tests.gs`, y `clasp push -P`
  apuntando a esa copia. Nunca `git stash` de todo el árbol.
- Se anota cuántos fallan con la versión vieja: ese número es la
  evidencia (ej. "10/26 FAIL con el `Code.gs` anterior, 26/26 con el
  nuevo"). Si con la versión vieja la suite corta antes (una excepción a
  mitad), el total da menos: se dice así.
- Un mutante a mano (romper a propósito la línea del arreglo) usa la misma
  copia del scratchpad, nunca el `Code.gs` del repo.
- Al terminar, se vuelve a pushear a test el árbol real (`clasp push -f -P
  .clasp-test.json -I .claspignore-test`): si no, la próxima corrida prueba
  la copia vieja o el mutante.

**Por qué:** así se probó cada REQ desde REQ-PLAN-002 (10/26 FAIL con el
código viejo) y REQ-PLAN-003 (20/39), bitácora 2026-10-05. REQ-DATA-002 se autovalidó con 5 mutantes a mano, los 5
`RECHAZADO` (bitácora 2026-09).

## 4. Planilla scratch y seams

**Qué cuidar:**
- Casi todos los `probarXXX()` crean su planilla scratch (`probarBUGCARGA001`
  no toca planilla), apunta
  `TEST_SPREADSHEET_ID_OVERRIDE` a ella y la restaura en un `finally`.
  Una suite nueva copia ese molde; nunca escribe en la planilla de test
  compartida ni en la de prod.
- El reloj se simula con `RELOJ_OVERRIDE` (`ahoraApp()`), no con fechas
  fijas que dependen del día en que se corre.
- Las cachés de `CacheService` incluyen el ID de la planilla
  (`sheets-concurrencia.md`); una suite que siembra datos limpia lo que
  cacheó (`b_limpiarCache` es el molde).
- Archivos de Drive creados por la suite van a la papelera al final
  (`setTrashed`; las suites de MEDIA llevan la lista de IDs). Las carpetas
  de año y mes que crea la subida quedan en la carpeta de test.

**Por qué:** la caché por nombre de hoja podía filtrar datos de una
planilla scratch a otra corrida o a prod (REQ-PERF-002, bitácora 2026-09).
BUG-FECHA-001 sumó el seam de reloj para probar el corte de las 21 h.

## 5. Cuánto da una suite

**Qué cuidar:** el total de una suite cambia cuando se le suman casos. Se
compara contra la última corrida anotada en la bitácora, no contra el
número que figura en un REQ viejo. Una diferencia se explica antes de
seguir.

**Por qué:** BL-015 (bitácora 2026-09): MEDIA002 daba 43/43 con el código
nuevo y con el viejo; el 48 del REQ-PERF-003 era de una versión anterior
de la suite, y por un momento pareció una regresión.

## 6. Lo que no se puede probar en test

**Qué cuidar:** se dice en el reporte, con cómo quedó cubierto:
- el login real con Google (`verifyGoogleAccessToken` necesita un token
  real): harness de Node y smoke manual;
- un fallo puntual de Drive en prod: solo en test o con `fetch` simulado;
- carreras entre dos pedidos (locks, BL-039): `clasp run` corre en un solo
  hilo y no hay seam para el lock. Se cubre leyendo el código (qué se lee
  adentro y afuera del lock, `sheets-concurrencia.md`) y probando cada
  orden por separado; se dice en el reporte que la carrera en sí no se
  reprodujo;
- Safari de iPhone (`verificacion-navegador.md` §11): lo confirma Franco.

Nunca se prueba escribiendo contra prod. El preview local pega a prod
(`verificacion-navegador.md` §2).

**Por qué:** REQ-MEDIA-002 (bitácora 2026-09): el criterio de fallo
aislado por foto "no se forzó en producción, no hay forma segura".

## 7. Rojos conocidos (cuarentena)

**Qué cuidar:** el runner (`nuevoReporte`) no tiene marca de cuarentena
ni "todo". Un rojo que no se arregla en el momento:
- se anota en un ítem del backlog con la `desc` exacta del check, la
  suite, la fecha y la causa (o "sin diagnóstico");
- cada reporte que lo encuentre lo nombra por esa `desc` y el ítem, nunca
  como "los de siempre";
- plazo: se resuelve o se vuelve a mirar en la revisión trimestral
  (DEC-022). Un rojo sin ítem es nuevo hasta que se diagnostica
  (`hduck-test-en-rojo`).

Un rojo que aparece a veces en una suite que usa Drive real (las de
MEDIA) puede ser Drive y no el código: se corre 3 veces y se mira el
`info` del check antes de decirlo.

**Por qué:** al 2026-10-06 todas las suites daban todo OK (bitácora
2026-10-05), así que cualquier rojo es nuevo. La regla se escribe ahora
para que el primero no se normalice.
