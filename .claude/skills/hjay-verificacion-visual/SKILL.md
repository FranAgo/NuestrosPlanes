---
name: hjay-verificacion-visual
description: >
  Procedimiento para verificar en el navegador un cambio que el usuario va
  a ver (layout, estilos, pantalla o modal nuevo, responsive, un input
  nuevo) antes de darlo por hecho: criterios escritos antes de mirar,
  anchos y alturas reales y un píxel a cada lado de cada corte, medidas en vez de
  capturas para desbordes, interacción con teclado real, consola y caché.
  Usar después de implementar cualquier cambio visual o interactivo, antes
  de decir "listo", "verificado" o "anda", y cuando el usuario reporta que
  algo "se ve cortado", "se desborda", "no entra", "se ve mal en mi
  pantalla" o manda una captura. No cubre qué es un buen diseño (eso es
  hjay-identidad-visual) ni cómo escribir el código (Jay).
---

# Verificación visual en el navegador

Lo mantiene Jay; lo usa cualquiera que toque algo que se ve. Es de uso
general: lo propio de cada proyecto (cómo levantarlo, cómo entrar sin
login, sus cortes de pantalla) vive en el proyecto. Buscalo antes de
empezar en el catálogo de convenciones del proyecto, si tiene uno.

Por qué existe: una captura mirada sin criterio "se ve bien" casi siempre,
el navegador de prueba no tiene el ancho de la pantalla del usuario, y una
explicación plausible por código no reemplaza medir. Esos tres errores
costaron rondas enteras de ida y vuelta con el usuario.

Contenido: Proporción · 1. Criterios antes de mirar · 2. Llegar a la
pantalla con el código nuevo · 3. Anchos · 4. Qué herramienta para cada
cosa · 5. Interacción y consola · 6. Cuando el reclamo es del usuario ·
7. Qué decir al terminar.

## Proporción

El esfuerzo sigue al tamaño del cambio y al nivel de verificación que fije
el proyecto. Un cambio de texto o de color en un elemento: 1 o 2
criterios, el ancho del usuario más los lados del corte que afecte a ese
elemento, `getComputedStyle` y consola. Si ese cambio chico además dispara
algo (un botón que reintenta, un filtro en vivo), sumá el click real, el
caso de error y cuántos pedidos salen. Si cambiaste una regla de CSS,
mirá qué otros selectores comparte (`:hover` y `.active` en la misma
regla cambian juntos). El recorrido completo (todos los
anchos, casos borde, teclado) es para layout, responsive, pantallas o
modales nuevos e inputs.

## 1. Antes de mirar: qué tiene que cumplirse

Escribí (en el chat o en tu razonamiento) 3 a 6 criterios de pasa/no pasa,
concretos y medibles, antes de abrir el navegador. Por ejemplo: "sin
scroll horizontal del documento entre 375 y 1920px", "ningún encabezado
con `scrollWidth > clientWidth`", "el foco sigue en el input después de
tipear 10 caracteres", "colores y radios iguales a los del `DESIGN.md`".

Si el proyecto tiene `DESIGN.md` (en la raíz o en `docs/`), sumá un criterio contra él (colores,
tamaños, componente usado); si el cambio modifica el sistema a propósito,
el `DESIGN.md` se actualiza en el mismo cambio. Si el pedido vino de un
reclamo del usuario, el primer criterio es el síntoma exacto que reportó,
con sus palabras, y al lado su traducción a una medida ("se corta" →
`scrollWidth > clientWidth` del título).

Los casos borde de la sección 5 (vacío, texto largo, error) no son
criterios aparte: son situaciones en las que se vuelven a chequear los
mismos criterios.

## 2. Llegar a la pantalla con el código nuevo

- Levantá el servidor del proyecto con las herramientas de preview, no a
  mano. Preferí uno sin caché.
- Confirmá que el navegador tiene el código nuevo antes de juzgar nada:
  buscá en el DOM o en la fuente algo que solo existe con tu cambio. Si no
  está, recargá sin caché. Una versión vieja en caché hace pasar por buena
  una pantalla que nunca viste.
- Si la pantalla está detrás de un login que no podés hacer, armá el
  estado desde la consola siguiendo las notas del proyecto: el usuario, los
  datos mínimos y la navegación hasta la pantalla.
- Antes de cualquier acción que guarde, averiguá a qué base está conectado
  el entorno local y si hay una sesión real guardada. Si puede escribir en
  una base o un servidor compartido, anulá las escrituras en la capa más
  baja por la que salen todas (el cliente de la base, o `fetch` si la app
  habla con un servidor), no en una función del proyecto: casi nunca es
  el único camino. Si no, usá los datos de prueba que el proyecto tenga
  para eso.

## 3. Anchos

- El ancho real del usuario, si se sabe; si el cambio es por un reclamo
  suyo y no se sabe, preguntalo o pedile que mida (ver sección 6).
- Además: 1920, 1536 (el mismo monitor con la escala de Windows en 125%),
  1366 y 375 (móvil, si la app se usa en el teléfono). Si el cambio o el
  reclamo es solo del teléfono, alcanzan los anchos de teléfono y los
  cortes que lo tocan. Si el contenido tiene un ancho máximo, los anchos
  por encima dan lo mismo para ese contenido, salvo que haya un corte más
  arriba o elementos de ancho completo (encabezado, `position:fixed`). El ancho que importa es
  `innerWidth` en CSS, no la resolución del monitor.
- Por cada corte de CSS que toque la pantalla, un píxel a cada lado. Son
  los `@media` y también los implícitos: una grilla con `auto-fill` y
  `minmax`, o un `flex-wrap`, cambia de columnas en anchos que no figuran
  en ningún `@media` (calculalos o buscalos achicando). `max-width:860px` aplica en 860 y deja de aplicar en 861: se
  prueban 860 y 861, no "algo cerca".
- Fijá el ancho con la herramienta de tamaño de ventana y confirmalo con
  `window.innerWidth`. El panel del navegador integrado suele ser más
  angosto que la pantalla del usuario: no lo tomes como su ancho.
- Cambiá de ancho sin recargar si armaste estado desde la consola: una
  recarga lo borra. Ojo con lo que la página calcula una sola vez al
  cargar (un `matchMedia(...).matches` guardado en una variable): pasar
  de la emulación móvil a escritorio sin recargar no lo actualiza. Para
  hover y mouse, cargá la página en escritorio, o recargá y rearmá el
  estado.
- Si el síntoma es vertical (algo se corta abajo, un modal no entra, un
  botón queda tapado), el alto importa tanto como el ancho: probá alturas
  bajas (568 y 667 en el teléfono, 720 en una notebook) y medí contra
  `innerHeight`. En el teléfono, el teclado virtual achica el alto útil
  mientras se escribe en un input; no se puede emular: simulalo con una
  ventana baja (por ejemplo 375×400), mirá `visualViewport.height` y decí
  que el teclado real quedó sin probar. La emulación tampoco reproduce las
  barras del navegador del teléfono ni la diferencia entre `100vh` y
  `dvh`: si el síntoma puede venir de ahí, también se dice.
- Al terminar, `resize_window` con el preset `desktop`.

## 4. Con qué herramienta se verifica cada cosa

| Qué | Cómo |
|---|---|
| Que algo esté, con el texto correcto | árbol de la página o texto (read_page, get_page_text) |
| Desborde, recorte, scroll horizontal | medida por JS: `scrollWidth > clientWidth` del documento y de los contenedores, `getBoundingClientRect` contra el del padre |
| Tamaños y colores exactos | `getComputedStyle` |
| Alineación, superposición, que "se vea bien" | captura, recién después de las medidas |
| Foco, cursor y scroll al escribir | teclado real (ver 5) y después `document.activeElement`, `selectionStart`, `scrollTop` |
| Errores | consola (ver 5) |

Una captura no decide un desborde ni un recorte: está escalada y
recomprimida, y no dice si hay más contenido con scroll. Un número sí.
Si un contenedor tiene `overflow:hidden`, lo que se pasa queda recortado
sin scroll: el documento y los ancestros no lo muestran. Medí el
`scrollWidth` del propio contenedor (ese sí cuenta lo recortado) o el
`getBoundingClientRect().right` de los hijos contra su borde.

## 5. Interacción y consola

- Escribí con el teclado de verdad (acción de tipear), no asignando
  `.value` por JS: asignar por JS no dispara los mismos eventos ni
  re-renders, y es justo ahí donde se pierde el foco.
- Recorré lo nuevo con Tab: cada control se alcanza, muestra el foco y se
  activa con Enter o Espacio.
- Clicks reales en los botones nuevos. Probá también el estado vacío, un
  texto muy largo, muchos elementos, el error de validación y, si la
  pantalla depende del servidor, el error de red o del servidor.
- En el teléfono, un control nuevo tiene que verse sin hover (no hay
  hover) y tener un área táctil de al menos 44×44px; medila con
  `getBoundingClientRect`.
- Si la acción pide al servidor, contá los pedidos que salen (uno por
  tecla en un filtro en vivo es un bug) y probá el doble click.
- Si la herramienta del navegador no puede elegir archivos
  (`input type=file`), armá el estado desde la consola con lo que la
  pantalla guarda de los archivos elegidos, y decí que el selector real
  quedó sin probar.
- Leé la consola al principio (para saber qué errores ya había) y al
  final. Criterio: ningún error nuevo. Si hay ruido que ya estaba, decilo.

## 6. Cuando el reclamo es del usuario y en tu navegador se ve bien

- Que en tu navegador se vea bien no cierra el reclamo: su pantalla,
  su navegador, su zoom y su archivo pueden ser distintos.
- Desde una computadora, pedí el dato real, no una foto: el archivo que
  abrió, o que corra en la consola de su navegador un script corto que devuelva las medidas
  (`innerWidth`, `devicePixelRatio`, `clientWidth` y `scrollWidth` del
  contenedor).
  - El script es solo de lectura y devuelve un `JSON.stringify`: pedirle
    a alguien que pegue código en la consola es la mecánica de un ataque,
    así que no hace nada más que medir.
  - Instrucciones listas: F12, pestaña Consola; si Chrome lo pide,
    escribir `allow pasting`; pegar; copiar el resultado.
  - Si el fix todavía no está en un ambiente que el usuario pueda abrir,
    primero va el deploy, con la aprobación que pida el proyecto.
- Si el reclamo viene desde un teléfono, no hay consola ni F12. Pedí el
  modelo, el navegador, la orientación y si tiene agrandado el texto o
  el zoom del sistema. Con el modelo sacás el ancho en CSS y reproducís
  ese ancho y ese alto. Acá la captura sí es el dato: pedila completa,
  sin recortar, para ver también las barras del navegador.
- Si después de dos rondas de fix el reclamo sigue, pará de ajustar a
  ciegas: medí el contenido en su origen (la posición real del texto en el
  archivo, por ejemplo) y preguntá la preferencia concreta ("¿que entre
  todo sin scroll, o que el texto se vea grande?", "¿qué proporción
  exacta?") antes de probar otra variante.

## 7. Qué decir al terminar

- Los criterios de la sección 1, cada uno con pasa o no pasa y la
  evidencia (número medido, ancho, captura).
- Si simulaste respuestas del servidor, lo verificado es la pantalla con
  esas respuestas. Que el servidor las devuelva así lo prueban sus tests:
  nombrá cuáles corriste, o decí que faltan.
- Qué no se pudo verificar y por qué (login real, pantalla real del
  usuario, datos reales), y qué prueba concreta le toca hacer al usuario:
  solo la que no podés hacer vos (su dispositivo, su sesión).
  No digas "verificado" a secas si una parte quedó sin ver.
- Si dejaste datos de prueba o cambiaste algo en el entorno, que quedó
  limpio.
