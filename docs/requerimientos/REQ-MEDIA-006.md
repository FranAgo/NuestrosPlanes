# REQ-MEDIA-006 — Visor de fotos a pantalla completa, con tira de miniaturas

> **Estado:** SERVIDOR EN PRODUCCIÓN (2026-10-02 17:09, Web App @32 "v1.5.0"; rollback `-V 31`). Front verificado en 127.0.0.1 con `fetch` simulado, falta el push a `main`. Franco eligió la variante B del mockup con tres ajustes que salieron de la investigación (DEC-015). Incluye BL-027 y BL-028.
> **Nivel:** cambio de fondo (pantalla que se rehace, cambia cómo se navegan las fotos y toca `index.html` y `Code.gs`).
> **Dueño técnico:** Jay (front) + Bob (`getRecuerdos`) · **Infra:** Roy · **AppSec:** Julia · **Datos:** Gary · **QA:** Duck · **PM:** Paul
> **Versión:** sale como `1.5.0` (DEC-009: REQ nuevo = MENOR).

## Problema

Tocar una foto (en "Ya subidas" de una tarea o en los recuerdos) la abre en
el visor del carrusel, que es un modal con borde, título y flechas a los
costados. En un teléfono de 375 px la foto queda en unos 212 px de ancho.
Franco pidió (2026-09-28) que la foto "se agrande y la veamos en el centro
de la pantalla" (BL-027). Además, "Cambiar fecha" solo existe cuando el
visor se abre desde una tarea; desde los recuerdos no se puede corregir
(BL-028).

## Qué se pide (Franco, 2026-10-02, variante B del mockup + ajustes)

1. **Pantalla completa, fondo negro.** La foto ocupa todo el ancho o todo
   el alto disponible, con su proporción, sin recortarse. Igual en el
   teléfono y en la computadora.
2. **Controles que se esconden.** Arriba: cerrar (X), el título y "3 de 12",
   y un botón (i) de detalles. Abajo: la leyenda (tarea · fecha · "hace…")
   y la **tira de miniaturas**. Tocar la foto esconde o muestra todos los
   controles; la foto queda sola.
3. **Tira de miniaturas** de 44 px como mínimo, con la foto actual marcada en
   cobre. Tocar una salta a esa foto. Si hay más de las que entran, la tira
   se desplaza de costado y la actual queda siempre a la vista. Con una sola
   foto, la tira no aparece.
4. **Gestos.** Deslizar a los costados pasa de foto; hacia abajo cierra el
   visor; hacia arriba abre los detalles.
5. **Detalles y fecha.** El (i), o deslizar hacia arriba, abre un panel
   abajo con la fecha, de dónde salió ("Fecha de la cámara", "Corregida a
   mano"…) y "Cambiar fecha". La foto se corre hacia arriba y se achica; la
   leyenda y la tira se esconden mientras el panel está abierto, así nada se
   encima. El editor de fecha es el de hoy (campo de fecha, Guardar y
   Cancelar). Mientras se edita no se puede pasar de foto.
6. **Cambiar fecha también desde los recuerdos** (BL-028), no solo desde
   una tarea.
7. **Recuerdos:** los chips de grupo ("En este día · 3", "Nuevas · 5"…)
   siguen, debajo de la barra de arriba, y se esconden con los demás
   controles.
8. **Computadora y teclado:** flechas a los costados (solo con mouse; en
   pantallas táctiles no se muestran), ← y → pasan de foto, Escape cierra el
   editor o el panel si están abiertos y, si no, el visor. Al cerrar, el foco
   vuelve a la foto o la tarjeta desde la que se abrió.

## Investigación

`docs/investigacion/2026-10-02-visor-de-fotos.md` (Fotos de Apple, Google
Fotos, Baymard). En resumen: la B es el patrón de Fotos del iPhone; la fecha
se edita en un panel de detalles abajo, como en Apple y Google; las
miniaturas ayudan a saber cuántas fotos hay y a saltar entre ellas.

## Diseño técnico

**Servidor (Bob).** `handleGetRecuerdos` suma `fechaOrigen` a cada foto
(`captura` | `subida` | `manual` | `null`), leído de `fecha_origen` igual que
`handleGetFotosPlan`. Es un campo nuevo en la respuesta: un front viejo lo
ignora. No cambia ninguna hoja. `setFechaFoto` ya acepta cualquier foto de
tarea activa de una tarea no eliminada, que es exactamente lo que devuelve
`getRecuerdos`. `APP_VERSION` pasa a `1.5.0`.

**Front (Jay).**
- Se reusa `#modal-carrusel` y su lógica (`renderCarruselFoto`, token de
  orden, debounce, precarga de las vecinas, `abortFetchesExcepto`). Cambia
  el marcado y el CSS: el overlay pasa a ocupar la pantalla entera y el
  `.modal` con borde se reemplaza por el visor.
- La tira usa las miniaturas de `getMiniaturas` (REQ-PERF-004). Si una no
  está, se muestra un cuadro vacío; no se baja la foto entera para la tira.
- Al guardar una fecha desde los recuerdos se actualiza la foto en memoria
  (fecha, origen, leyenda) y la lista guardada de esa tarea si está en
  `fotosPlanCache`. Los grupos de recuerdos **no** se rearman con el visor
  abierto (la foto podría cambiar de grupo y desaparecer de lo que se está
  mirando): se vuelven a pedir al cerrar si hubo algún cambio.
- Con el visor abierto, la página de atrás no se desplaza.
- `role="dialog"`, `aria-modal="true"`, botones de solo ícono con
  `aria-label`, foco visible sobre fondo negro, sin `transition: all`, y
  movimiento apagado con `prefers-reduced-motion`.

**Seguridad (Julia).** Sin superficie nueva: `fechaOrigen` es un valor de
una lista cerrada, sin datos personales; la leyenda y los títulos se siguen
pintando con `textContent` o `escapeHtml`. `setFechaFoto` no cambia.

**Hojas (Gary).** Sin cambios: `fecha_origen` ya existe en `Archivos`
(REQ-MEDIA-005).

**Deploy (Roy).** Primero el servidor (test, después prod con OK), después
el front. Las dos combinaciones intermedias funcionan: front nuevo con
servidor viejo muestra los recuerdos sin el origen de la fecha, y "Cambiar
fecha" anda igual.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | A 375 px, una foto horizontal ocupa los 375 px de ancho; una vertical, el alto disponible. Sin scroll horizontal ni de la página de atrás |
| 2 | Tocar la foto esconde barra de arriba, chips, leyenda y tira; otro toque los muestra |
| 3 | Deslizar a izquierda/derecha pasa de foto; en la primera y la última no hace nada |
| 4 | Deslizar hacia abajo cierra el visor; hacia arriba abre los detalles |
| 5 | Tira: miniaturas de 44 px o más, la actual marcada; tocar una salta a esa foto y la tira la deja a la vista. Con una sola foto no hay tira |
| 6 | (i) abre los detalles: la leyenda y la tira se esconden, la foto sigue a la vista y nada se encima, a 375 × 667 y a 1366 × 768 |
| 7 | Cambiar fecha desde una tarea funciona como en 1.4.0 (REQ-MEDIA-005), y "Ya subidas" muestra la fecha nueva |
| 8 | Cambiar fecha desde los recuerdos: manda `setFechaFoto`, la leyenda cambia al toque y, al cerrar, los recuerdos se vuelven a pedir |
| 9 | Teclado: ←/→ pasan de foto, Escape cierra editor → panel → visor en ese orden, Tab no sale del visor, y al cerrar el foco vuelve a donde estaba |
| 10 | En pantalla táctil no se ven las flechas de los costados; con mouse sí |
| 11 | Navegar rápido (ráfaga de ←/→ o de toques en la tira) termina en la foto correcta y dispara un solo pedido (lo de REQ-PERF-005 sigue) |
| 12 | Servidor: `getRecuerdos` devuelve `fechaOrigen` en cada foto; `probarMEDIA003` sigue en verde y suma ese chequeo; `probarMEDIA005` en verde |
| 13 | `node check-sintaxis.js` en verde y consola sin errores |

## Verificación (2026-10-02)

Servidor, contra el proyecto de **test**: `probarMEDIA003` 36/36 APTO (suma
3 chequeos: `fechaOrigen` en cada foto, `setFechaFoto` sobre una foto de
recuerdos y la relectura con fecha y origen nuevos) y `probarMEDIA005`
59/59 APTO.

Front, en 127.0.0.1 con `fetch` simulado (fotos generadas en el navegador,
ningún pedido a prod), con gestos por `PointerEvent` y teclas por
`KeyboardEvent`:

| # | Resultado |
|---|---|
| 1 | OK: escena 375 × 812; la horizontal ocupa los 375 px y la vertical el alto. Sin scroll horizontal; el body queda con `overflow: hidden` |
| 2 | OK |
| 3 | OK: en la última foto deslizar no hace nada |
| 4 | OK: con los detalles abiertos, deslizar hacia abajo cierra los detalles y no el visor |
| 5 | OK: 44 px, la actual con `aria-current`; con 20 fotos, saltar a la 16 la deja centrada. Una tarea de una sola foto no tiene tira ni contador |
| 6 | OK: a 375 × 667 la escena termina en 532 y el panel va de 532 a 667, con Guardar dentro de la pantalla; a 1366 × 768, 610 y 610. Contenido del panel centrado a 560 px en la computadora |
| 7 | OK: `setFechaFoto`, "Ya subidas" y la lista guardada (BL-032) con la fecha nueva |
| 8 | OK: la leyenda cambia al toque y al cerrar sale un `getRecuerdos` |
| 9 | OK: ←/→, Escape editor → detalles → visor, Tab vuelve al primer botón. Al cerrar, el foco vuelve a la card de recuerdos o a la foto de "Ya subidas" (hallazgo de Duck: si la grilla se repintó al cambiar una fecha, el botón original ya no existía y el foco quedaba en el visor escondido; corregido buscando la foto por id) |
| 10 | OK: táctil `display: none`, mouse `flex` |
| 11 | OK: cinco → seguidas terminan en la última foto con un solo `getArchivo` de esa foto, más la precarga de las vecinas |
| 12 | OK (ver servidor) |
| 13 | OK: `node check-sintaxis.js` en verde, consola sin errores |

Falta: verlo en el iPhone de Franco y de Noelia (gestos reales con el dedo).

## Fuera de alcance

- Zoom con dos dedos sobre la foto. El navegador ya permite el zoom de la
  página entera; un zoom propio es otro trabajo.
- Que el botón "atrás" de Android cierre el visor (los dos usan iPhone).
- Borrar o reordenar fotos desde el visor (BL-009, BL-010).
- Videos (BL-023).
