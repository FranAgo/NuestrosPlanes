# REQ-MEDIA-007 — El visor muestra la foto siguiente al instante y precarga según la conexión

> **Estado:** CERRADO (2026-10-06)
> **Historia:** EN DESARROLLO (2026-10-05). Franco eligió la variante B del mockup de Mi perfil y la opción A del visor (investigación del 2026-10-05). Incluye BL-036. HECHO el 2026-10-05: implementado y verificado en 127.0.0.1 con `fetch` simulado (4 s por foto), sin pedidos a prod. En producción con 1.6.0 el 2026-10-05 (commit `44ece6b`, tag `v1.6.0`). 2026-10-05: Franco vio que en la computadora Mi perfil quedaba en una columna de 420 px pegada a la izquierda de los 900 del contenido; eligió la variante B de un mockup nuevo (dos columnas desde 720 px). Sale como ajuste en 1.6.1. CERRADO el 2026-10-06: Franco confirmó en uso que la foto siguiente aparece al instante en el visor y que Mi perfil se ve bien en dos columnas en la computadora.
> **Versión:** 1.6.0
> **Nivel:** cambio de fondo (cambia cómo se cargan las fotos del visor y se rehace Mi perfil). Solo front: `Code.gs` no cambia.
> **Dueño técnico:** Jay · **PM:** Paul · **QA:** Duck · **AppSec:** Julia · **Infra:** Roy

## Problema

Franco (2026-10-05): en el visor, "tarda como 4 segundos con cada desliz en
cargar la siguiente foto". Cada foto completa es un `getArchivo` (unos 2 s
de piso de Apps Script, más hasta 1 MB en base64). La precarga va de a una
foto y recién arranca cuando llegó la actual, y mientras tanto no se
muestra nada de la foto nueva, aunque su miniatura ya está en memoria.
Detalle e investigación: `docs/investigacion/2026-10-05-visor-foto-siguiente.md`.

Además, Franco quiere ahorrar datos con el celular y precargar con wifi, y
darle más protagonismo a Mi perfil a futuro.

## Qué se pide (Franco, 2026-10-05)

1. **Miniatura al instante.** Al pasar a una foto que todavía no llegó, se
   ve su miniatura agrandada y desenfocada, con el indicador de carga, y
   se cambia por la foto completa cuando llega. Si no hay miniatura, como
   hoy (queda la anterior con el indicador).
2. **Precarga en dos modos:**
   - **Amplio:** 3 fotos hacia donde se viene deslizando y 1 hacia atrás.
   - **Lo justo:** solo la siguiente hacia donde se viene deslizando.
   Arranca apenas el usuario se queda en una foto (los mismos 200 ms de
   hoy), no cuando termina de llegar la actual. Como mucho 2 precargas a
   la vez, además de la foto actual (3 pedidos en total, como las
   miniaturas de "Ya subidas").
3. **Mi perfil por secciones (variante B):** arriba la foto y el nombre,
   con "Cambiar foto"; la sección "Fotos y datos" con tres opciones
   (Automático, Precargar siempre, Solo lo necesario); y "Acerca de" con
   la versión.
4. **Automático** decide así:
   - Si el navegador avisa "ahorro de datos" o datos móviles → lo justo.
   - Si avisa wifi o cable → amplio.
   - Si no avisa (iPhone, computadora): con pantalla táctil, lo justo; con
     mouse, amplio.
   Debajo de "Automático" se lee qué está haciendo en ese dispositivo.
5. La elección se guarda en cada dispositivo (`localStorage`) y no se
   borra al cerrar sesión: es una preferencia, no un dato personal.

## Aportes

- **Bob:** no cambia ningún contrato. Usa `getArchivo` y la caché de
  miniaturas de REQ-PERF-004 tal como están.
- **Roy:** solo `index.html`; sale por GitHub Pages. Versión 1.6.0 (DEC-009:
  REQ nuevo = MENOR). `Code.gs` queda en 1.5.0.
- **Julia:** sin superficie nueva. La preferencia (`cp_precarga`) es un
  valor de una lista cerrada y se valida al leerla. Las fotos precargadas
  van a la misma caché en memoria de siempre, que se borra al cerrar
  sesión (BL-016).
- **Gary:** sin impacto en las hojas.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Con `getArchivo` de 4 s y la miniatura en caché, al deslizar se ve la miniatura desenfocada al instante y después la foto nítida |
| 2 | Modo amplio, abriendo en la foto 1 y quedándose ahí: se piden la 1, 2 y 3 enseguida y la 4 y la 0 cuando se libera lugar, con 3 pedidos a la vez como máximo |
| 3 | Modo amplio, después de 4 s en una foto, deslizar a la siguiente la muestra nítida sin pasar por la miniatura |
| 4 | Modo lo justo: solo se pide la actual y la siguiente en la dirección del gesto |
| 5 | Deslizar hacia atrás da vuelta la dirección de la precarga |
| 6 | Una ráfaga de 5 deslizamientos rápidos no dispara pedidos de las fotos intermedias |
| 7 | Al cerrar el visor no arrancan precargas nuevas |
| 8 | Mi perfil: las tres opciones se eligen con mouse, con Tab y flechas, y con el dedo (área de 44 px); la elección queda después de recargar |
| 9 | Debajo de "Automático" se lee lo que hace en ese dispositivo y cambia si cambia la conexión |
| 10 | "Cambiar foto" (botón) y tocar la foto abren el editor de foto como antes |
| 11 | 375 px y 1366 px sin scroll horizontal; consola sin errores |

## Diseño

- `idsPrecarga(indice)` arma la ventana según `modoPrecarga()` y
  `carruselDireccion` (la fija `irAFotoVisor`; al abrir, 1).
- `renderCarruselFoto` cancela lo que quedó fuera de la ventana
  (`abortFetchesExcepto([actual, ...vecinas])`) y programa la precarga con
  el mismo retardo de 200 ms que el pedido de la foto. La cola
  (`colaPrecarga`, `arrancarPrecargas`) deja 2 en vuelo. Cerrar el visor
  vacía la cola (`cancelarPrecarga`).
- `ponerVistaPreviaVisor(foto)` pone la miniatura de `miniCache` en el
  mismo `<img>` con `.es-vista-previa` (`filter: blur(12px)`, entra sin
  transición y sale en 200 ms) y marca `data-previa`. Al llegar la nítida
  sobre su propia vista previa no se apaga la imagen. También se llama
  cuando llegan las miniaturas de la tira, por si el visor abrió antes.
- `.carrusel-loader` lleva `z-index: 1`: con `filter`, la imagen se pinta
  encima del loader.
- Mi perfil: tarjeta con foto y nombre en fila y un botón "Cambiar foto"
  (además de tocar la foto); "Fotos y datos" con un `<fieldset>` de radios
  nativos con `appearance: none`; "Acerca de" con la versión. Preferencia en
  `cp_precarga`, validada contra una lista; si `localStorage` falla, vale en
  memoria hasta recargar.

## Verificación (2026-10-05, 127.0.0.1, `fetch` simulado con `getArchivo` de 4 s, sin pedidos a prod)

| # | Resultado |
|---|---|
| 1 | OK: a los 60-150 ms, vista previa con `blur(12px)` y el indicador de carga encima; a los 4,2 s, nítida (captura a 375 px) |
| 2 | OK: abriendo en la 1 salieron 1, 2 y 3 a los 209 ms, y 4 y 0 a los 4,2 s; máximo 3 en vuelo |
| 3 | OK: con 1-3 ya precargadas, pasar a la 1 la muestra nítida sin vista previa |
| 4 | OK: "Solo lo necesario" elegido con un click; al abrir en la 0 se piden 0 y 1, y al pasar a la 1 solo la 2 |
| 5 | OK: de la 7 a la 6, dirección -1, se piden 5 y 4 |
| 6 | OK: ráfaga de la 2 a la 7 cada 60 ms → solo la 7 (actual) y la 6 (vecina) |
| 7 | OK: navegar y cerrar a los 50 ms → ningún pedido |
| 8 | OK: click real, flecha arriba con el teclado (cambia y guarda, foco cobre visible), recarga mantiene la elección; opciones de 69-87 px de alto a 375 |
| 9 | Por código: `pintarPreferenciaPrecarga` escucha `navigator.connection` `change`. Texto verificado: "En esta computadora" (mouse) y "En este celular" (375, táctil). El caso wifi/datos de Android no se puede simular en este navegador |
| 10 | OK: "Cambiar foto" abre el editor; 44 px de alto con el dedo (antes 30, corregido) |
| 11 | OK: 375 px sin scroll horizontal con un nombre largo; captura a 800 px; consola sin errores |

Hallazgos de Duck corregidos en el momento: la vista previa no aparecía si
el visor abría antes que las miniaturas; el loader quedaba tapado por la
imagen desenfocada; el desenfoque entraba animado; "Cambiar foto" medía
30 px con el dedo.

## Fuera de alcance

- Caché de fotos completas en el disco (IndexedDB, opción B de la
  investigación): si después de esto se sigue notando al volver a abrir
  la app.
- Versión "pantalla" más liviana desde el servidor (opción C).
