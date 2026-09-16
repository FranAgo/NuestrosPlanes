# REQ-PERF-005 — Carga on-demand de fotos en el carrusel de recuerdos

> **Estado:** CERRADO (2026-09-16) — verificado en navegador real contra producción, con Franco logueado. Sin regresión (cambio 100% de cliente, `Code.gs`/`Tests.gs` sin tocar). Ya pusheado (commits `9a47ce5`, `4e1c502`, `ccce7d6`, `4afc90e`).
> **Dueño técnico:** Jay (front) · **QA:** Duck · **PM:** Paul
> **Relacionado:** [REQ-MEDIA-002](REQ-MEDIA-002.md) (creó el carrusel), [REQ-PERF-002](REQ-PERF-002.md) (reintento de Drive por archivo, se sigue usando tal cual), [REQ-PERF-003](REQ-PERF-003.md) (card del dashboard — no tiene este problema, no se toca), [REQ-PERF-004](REQ-PERF-004.md) (miniatura server-side — sigue propuesta, sin relación directa).

## Objetivo

Franco reportó: al abrir "Nuestros recuerdos" las fotos tardan más de 40
segundos en aparecer, y a veces da directamente "no se pudo cargar la foto".

## Diagnóstico

`openModalCarrusel()` ([index.html:2557](../../index.html:2557)) pide
`getRecentPlanPhotos(limit:20)` y ENSEGUIDA llama
`fetchAvataresDataUrl(carruselFotos.map(f => f.archivoId))` con los hasta 20
`archivoId` juntos, ANTES de mostrar la primera foto.

`fetchAvataresDataUrl` invoca `getArchivos` (batch) ->
`handleGetArchivos` en [Code.gs:1441](../../Code.gs:1441): lee los hasta 20
blobs de Drive **secuencialmente** (uno por uno, con el reintento de hasta 3
intentos de `leerBlobDriveConReintento`, REQ-PERF-002) dentro de UNA sola
ejecución de Apps Script, y recién responde cuando terminó con los 20.

El frontend no pinta ninguna imagen hasta que esa única llamada completa
entera — de ahí el loader infinito de 40+ segundos. Si esa llamada falla
(timeout del browser o de Apps Script por tardar demasiado), el `catch` de
`fetchAvataresDataUrl` cachea TODOS los `archivoId` pedidos como `null` — las
20 fotos quedan en `null` y el carrusel las muestra todas como "no se pudo
cargar la foto" de una sola vez.

No es un problema de confiabilidad de Drive en sí (el reintento por archivo
de REQ-PERF-002 sigue vigente y no se toca) sino de arquitectura: se pide
el lote entero de golpe y de forma bloqueante, en vez de solo la foto que se
está mirando.

## Alcance — entra

- `openModalCarrusel()` deja de pedir las N fotos de golpe. Pide metadata
  (`getRecentPlanPhotos`, sin cambios) y trae el binario **solo de la foto
  actual** vía `getArchivo` (singular, ya existe — [Code.gs:1408](../../Code.gs:1408)).
- Al navegar (prev/next), se trae la foto de destino on-demand si no está
  en cache.
- Prefetch en segundo plano (no bloqueante) de la foto siguiente, para que
  navegar hacia adelante en el caso común se sienta instantáneo.
- Un fallo de Drive en una foto puntual solo afecta a esa foto — nunca tumba
  a las demás.
- Manejar el caso de navegación rápida: si el usuario cambia de foto antes
  de que resuelva el fetch anterior, la respuesta vieja no debe pisar la
  foto que se está mostrando en ese momento (comparar contra el índice/
  archivoId vigente antes de pintar).

## Alcance — fuera de este REQ

- `handleGetArchivos` (batch) no se toca — lo sigue usando
  `fetchAvataresDataUrl` para avatares y para la card de "fotos recientes"
  del dashboard (esa pide solo 5 con avatares, no tiene este problema de
  escala).
- No se implementa la miniatura server-side de REQ-PERF-004.
- No se cambia el criterio de reintento por archivo
  (`leerBlobDriveConReintento`), ya cerrado en REQ-PERF-002.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | Al abrir el modal, la primera foto se muestra en menos de ~3 segundos en condiciones normales de red — no espera a que resuelvan las 20. |
| 2 | Un fallo de Drive en una foto individual muestra "No se pudo cargar la foto" solo para esa foto — navegar a otra foto (ya vista o no) sigue funcionando. |
| 3 | Navegar a una foto ya prefetcheada no muestra spinner (o lo muestra de forma imperceptible). |
| 4 | Navegar rápido (varios "siguiente" seguidos antes de que resuelva el fetch) termina mostrando la foto correcta para el índice donde el usuario quedó parado, nunca una foto vieja pisando a la nueva. |
| 5 | Sin regresión: el cache compartido `avatarCache`/`avatarDataUrl` sigue funcionando igual para avatares y para la card de "fotos recientes" del dashboard (REQ-PERF-003). |
| 6 | Sin regresión en suites existentes (REQ-MEDIA-001, REQ-MEDIA-002, REQ-PERF-002) — no aplica cambio de contrato de backend. |

## Datos sensibles

Ninguno nuevo. Mismo criterio de visibilidad ya vigente (`getArchivo`, sesión
válida, sin chequeo de dueño — REQ-MEDIA-001/002).

## Dependencias

Ninguna — cambio de cliente puro (`index.html`). No toca `Code.gs` ni el
modelo de datos. Gary y Julia no necesitan intervenir.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Condición de carrera al navegar rápido (respuesta vieja pisa la foto actual) | Criterio de aceptación 4 — comparar índice/archivoId vigente antes de aplicar el resultado de un fetch. |
| Prefetch de la foto siguiente compite por ancho de banda con la carga de la foto actual si el usuario navega justo cuando arranca el prefetch | Aceptable: en el peor caso se comporta como antes (fetch bajo demanda), nunca peor. |

## Plan de pruebas (Duck) — ejecutado

1. **Backend**: no aplica — `Code.gs`/`Tests.gs` sin cambios en este REQ.
2. **Frontend**: verificado por lectura de código (trazado completo del
   flujo `openModalCarrusel` → `renderCarruselFoto` → `fetchArchivoDataUrl`,
   scope de cada variable compartida confirmado). Sintaxis del script
   inline verificada (`node -e "new Function(...)"`) sin errores, dos veces
   (antes y después del fix de la observación de abajo).
3. **Regresión**: no aplica correr suites de Apps Script — no hay cambio de
   contrato de backend. `avatarCache`/`avatarDataUrl`/`fetchAvataresDataUrl`
   quedan sin tocar, usados igual por avatares y por REQ-PERF-003.
4. **Verificado en navegador real contra producción** (2026-09-16, Franco
   logueado con su cuenta de Google en el Browser pane):
   - **Criterio 1**: primera foto visible en ~2-4s desde el click en "Ver
     recuerdos" (antes: 40+ segundos). PASA.
   - **Criterio 3**: navegar a "siguiente" mostró la foto ya prefetcheada
     sin spinner visible. PASA.
   - **Criterio 4**: ráfaga de 4 clicks rápidos en "siguiente" (índice
     6→10) terminó mostrando la foto correcta del índice final, sin
     ninguna foto vieja pisando a la actual. PASA.
   - **Criterio 5**: la card de "fotos recientes" del dashboard siguió
     mostrando sus miniaturas circulares con normalidad después de navegar
     el carrusel — sin regresión de `avatarCache`. PASA.
   - **Criterio 2** (fallo aislado por foto) no se forzó en producción
     (no hay forma segura de simular un fallo puntual de Drive contra
     datos reales) — queda cubierto solo por el harness de Node
     documentado en los "Bugs encontrados y corregidos" de abajo.
   - Sin errores nuevos en consola durante toda la navegación (los únicos
     errores presentes son de Cross-Origin-Opener-Policy del popup de
     login de Google, preexistentes y no relacionados con este REQ).

### Bugs encontrados y corregidos en esta sesión

1. Duck detectó que `fetchArchivoDataUrl` llamaba a
   `guardarImageCachePersistido()` en cada foto individual traída durante
   la navegación del carrusel (antes, el batch viejo lo hacía una sola vez
   por apertura de modal). Eso implica intentar `JSON.stringify` + guardar
   en `localStorage` hasta 150 entradas de imágenes pesadas (~200-500KB c/u
   en base64) **en cada click de "siguiente"**, muy por encima de la cuota
   típica del navegador — el intento (y su reintento con la mitad de las
   entradas) falla en cada llamada para cualquier sesión con más de ~15-25
   fotos navegadas, reintroduciendo jank sincrónico justo en el flujo que
   este REQ buscaba hacer instantáneo. Corregido: se sacó esa llamada de
   `fetchArchivoDataUrl` — la persistencia sigue existiendo para avatares y
   "fotos recientes" (conjuntos chicos), no para el browsing completo del
   carrusel, que solo necesita cache en memoria durante la sesión activa.

2. **Encontrado por Franco en producción, tras el primer deploy de este
   REQ**: navegar rápido por el carrusel podía dejar una foto puntual
   mostrando "No se pudo cargar la foto." de forma permanente (ni
   navegando de vuelta a ella se recuperaba). Causa: el prefetch de "la
   foto siguiente" se dispara sin esperar (`fetchArchivoDataUrl` en fire-
   and-forget), y si el usuario navegaba hasta esa foto antes de que el
   prefetch resolviera, `renderCarruselFoto` pedía el mismo `archivoId`
   **por segunda vez en simultáneo** — el chequeo de cache corría antes de
   que el primer pedido hubiera terminado. Dos pedidos concurrentes a la
   misma foto, sumados en ráfaga a cada click rápido, y además cualquier
   fallo (de cualquier origen) quedaba cacheado como `null` **para
   siempre**, sin forma de reintentar en lo que durara la sesión.
   Corregido: `fetchArchivoDataUrl` ahora deduplica pedidos en vuelo por
   `archivoId` (un `Map` de promesas, `archivosEnCurso`) y **no cachea los
   fallos** — solo el éxito queda en `avatarCache`, así que una foto que
   falló por un hipo transitorio se reintenta sola la próxima vez que se
   pide. Verificado con un harness de Node aislado (fuera del navegador,
   simulando latencia de red): pedidos solapados para el mismo archivo se
   deduplican a una sola llamada real, un fallo simulado se reintenta
   correctamente en el segundo pedido, y un éxito cacheado no repite
   llamadas — los 3 casos pasan.

3. **Encontrado por Franco en producción, tras el fix del punto 2**: con la
   duplicación de pedidos ya resuelta, navegar muy rápido seguía mostrando
   el ícono nativo de "imagen rota" del navegador por ~1 segundo antes de
   asentarse. Causa: `renderCarruselFoto()` borraba la foto que se estaba
   viendo (`imagen.removeAttribute('src')`) apenas arrancaba CADA
   navegación, antes de tener la foto siguiente lista — con clicks
   rápidos, el `<img>` quedaba "sin fuente" (estado que el navegador
   pinta como ícono roto) durante toda la espera de red de la foto nueva.
   Corregido: la foto actual ya NO se borra al arrancar la navegación —
   se queda visible (con el loader superpuesto) hasta que la foto
   siguiente efectivamente resuelve, y recién ahí se hace el swap en un
   solo paso (borrar + asignar la nueva fuente, sin estado intermedio
   visible). Solo se limpia el `<img>` cuando una foto realmente falla
   (rama `else` / `onerror`), no como paso previo de cada navegación.

4. **Encontrado por Franco en producción, tras el fix del punto 3**: con la
   foto anterior ya no borrándose de entrada, navegar rápido por varias
   fotos podía quedar "tildado" mostrando la foto vieja con el loader
   colgado un buen rato. Causa: cada navegación dispara su propio pedido
   de red (`fetchArchivoDataUrl`), y los pedidos de fotos que el usuario
   ya dejó atrás (superadas por clicks posteriores) **no se cancelaban** —
   seguían corriendo igual, sin que nada los usara. Como los navegadores
   limitan cuántas conexiones simultáneas abren contra el mismo origen, el
   pedido de la foto que SÍ importa podía quedar haciendo cola detrás de
   varios pedidos viejos e irrelevantes. Corregido: `fetchArchivoDataUrl`
   ahora guarda un `AbortController` por pedido en vuelo, y
   `renderCarruselFoto()` llama `abortFetchesExcepto([archivoId actual])`
   apenas arranca cada navegación — cancela todo lo que quedó pendiente de
   fotos que ya no importan, así el pedido vigente sale sin hacer cola.
   `api()` ahora acepta una `signal` opcional para poder abortar el
   `fetch()` subyacente. Verificado con un harness de Node que simula 5
   clicks rápidos con latencia de red real (300ms): sin la cancelación, el
   quinto pedido (el único que importa) tendría que esperar a los 4
   anteriores; con la cancelación, resuelve en ~310ms — solo se completa
   la llamada de la foto vigente, las demás quedan abortadas.
