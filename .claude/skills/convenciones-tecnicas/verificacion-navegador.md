# Verificación en el navegador: lo propio de Nuestros Planes

El procedimiento general está en `hjay-verificacion-visual`. Acá, solo lo
que ese procedimiento necesita saber de este proyecto.

## 1. Levantar la app local

`preview_start` con `static` (`.claude/launch.json`: `http-server -p 5173
-c-1`, sin caché). La app es `index.html` en la raíz.

Si el Browser pane muestra `chrome-error://` con el server arriba (curl a
`localhost:5173` da 200), es que el navegador fue por `::1` y
`http-server` escucha solo IPv4: navegar a `http://127.0.0.1:5173/`. Es
otro origen, con su propio `localStorage` (sin la sesión real de
`localhost`) y sin login de Google (no está en los orígenes OAuth): sirve
para pruebas con `fetch` simulado, no para login real. Pasó el
2026-09-27 (BL-016).

## 2. `localhost` pega al Apps Script de PRODUCCIÓN

**Qué cuidar:** `SCRIPT_URL` en `index.html` es el Web App de prod, sin
distinción por host. Todo lo que haga el preview local con una sesión
real (crear, editar, completar, borrar, subir fotos) escribe en la
planilla y el Drive reales de Franco y Noelia.

- Para cambios de UI que no necesitan datos reales: reemplazar
  `window.fetch` desde la consola. Es el único punto por el que sale todo
  (`api()` y `apiLectura()` terminan ahí). Responder solo las acciones de
  una lista armada a mano y registrar el resto sin mandarlo, así un click
  en "Guardar" o "Marcar completado" queda anotado y no llega a prod. Así
  se verificaron BUG-CARGA-001 (12 casos) y el carrusel de REQ-PERF-005.
- Para probar contra el backend de test: `SCRIPT_URL` es `const` y no se
  puede reasignar. El wrapper de `fetch` cambia la URL por la del Web App
  de test (sale de `clasp deployments -P .clasp-test.json`), solo en
  memoria y nunca en el archivo.
- Una escritura contra prod desde local se confirma antes con Franco.

**Por qué:** en BUG-LOGIN-001 Duck probó "contra Apps Script REAL (prod
@12)" desde localhost con una cuenta de prueba (bitácora 2026-09).

## 3. Login de Google en local

`http://localhost:5173` está en los orígenes autorizados del cliente
OAuth, así que el login real funciona en el preview. Pero el login lo hace
una persona: no ingresar credenciales.

**Ojo: en el navegador integrado de Claude (Browser pane) Google no deja
entrar** ("No se ha podido iniciar sesión… no admite JavaScript", 2026-09-28,
BL-030). Para reproducir algo con datos y sesión reales, usar el Chrome de
Franco (Claude in Chrome) sobre la app publicada, donde ya tiene sesión, y
solo leyendo; o armar un diagnóstico del lado del servidor.

Sin login, en la misma pestaña y **sin recargar**: primero el `fetch`
simulado, después `state.session = {userId, sessionToken, nombreDisplay}`
y después `initApp()`. No sembrar `localStorage['cp_session']`: si la
página se recarga, el arranque manda ese token falso a prod antes de que
exista el stub, vuelve 401 y `forceLogout` borra todo. Si antes hubo un
login real, `cp_session` ya tiene una sesión verdadera: una recarga sin
stub habla con prod como esa persona.

Desde BL-021, cualquier 401 (o el botón de cerrar sesión) con una
sesión armada recarga la página: se pierden el stub y el estado. Para
seguir probando después, volver a armar todo. Para ver qué quedó, marcar
la página vieja (`window.__marca = 1`) y chequear que la nueva no la
tiene.

`cp_image_cache` (fotos en `localStorage`) puede tapar lo que devuelve el
stub para un `archivoId` que ya estaba cacheado: usar ids que no existan.

## 4. Cortes de pantalla

Hoy hay un solo corte de ancho: `@media (max-width: 600px)` (probar 600 y
601). Confirmarlo con grep de `@media` antes de confiar en esto. La app se
usa en el teléfono: 375 siempre entra en la lista de anchos.

Si el síntoma es un modal que no entra o un botón tapado abajo, el caso
ya pasó: ver `pantallas-y-visibilidad.md` ("Un modal no puede ser más
alto que la pantalla").

`tieneMouseReal` (`index.html`, el cursor propio) se calcula una sola
vez al cargar: si la página se cargó con emulación móvil, pasar a 1366
sin recargar no prende el cursor. Para verificar el hover, cargar en
escritorio y recién ahí armar el estado simulado.

Con la emulación de móvil, `(hover: hover) and (pointer: fine)` da falso:
desaparecen el cursor propio y los efectos de hover. El hover se verifica
a 1366 o más.

## 5. Probar el front contra el servidor de test, con dos personas

**Qué cuidar:** para ver el front con el servidor de verdad (no con
`fetch` simulado) y sin tocar prod:
- La implementación Web App de test que se usa para esto es
  `AKfycbw5O9…8o7gZ` (`clasp deployments -P .clasp-test.json`). Después de
  `clasp push` a test, `clasp version` + `clasp redeploy` de esa
  implementación: si no, sigue sirviendo el código viejo.
- `clasp run simPLAN001_preparar -P .clasp-test.json -u duck` suma una
  segunda usuaria de prueba, una tarea "SIM PLAN-001 (borrar)" con una foto
  falsa y una sesión para cada una. `simPLAN001_limpiar` deja la planilla
  como estaba (los archivos de Drive que se hayan subido quedan).
- En el navegador, el wrapper de `fetch` manda a esa URL de test lo que iba
  a `SCRIPT_URL` y rechaza cualquier otra URL de Apps Script. Una pestaña por
  persona. Un corte de red se simula rechazando el pedido en el wrapper
  antes de que salga.
- Ver los tokens de sesión, aunque sean de test, lo frena el modo
  automático: hace falta el OK explícito de Franco. Al terminar, cerrar las
  pestañas y borrar del scratch lo que tenga tokens.

**Por qué:** REQ-PLAN-001 y REQ-MEDIA-004 (2026-09-28): así se probó el
acuerdo de los dos y la subida de fotos de punta a punta sin escribir en
prod.

## 6. Un `clasp run` a prod, suelto y de solo lectura

**Qué cuidar:** `clasp run <funcion> -u duck` contra prod (sin `-P`) está
permitido si va solo en el comando (sin `cd`, `;` ni `>`), igual que los de
deploy (`apps-script-clasp.md`). Aun así, el modo automático frena leer
hojas con datos personales (`Auditoria`) o guardarlas en un archivo.
Preferir funciones que devuelven lo justo (`participantesCierre`,
`conteoFotosPorPlan`) antes que volcar una hoja entera.

## 7. Medir tiempos en el Chrome de Franco

**Qué cuidar:**
- La herramienta de JavaScript corta a los 45 s. Si la medición puede
  tardar más, hay que lanzarla sin esperarla: se guarda el resultado en
  `window.__res` y se lee después con otra llamada.
- Antes de repetir una medición, recargar la pestaña. Si no, la corrida
  anterior puede seguir andando con su propio wrapper de `fetch` y se
  mezclan los registros (salen pedidos duplicados).
- La pestaña tiene que estar al frente: en segundo plano, Chrome frena los
  timers y los tiempos no sirven.
- Los tiempos dependen de la red de Franco. Si está fuera de casa, medir
  solo el peso (bytes) y dejar los tiempos para otro momento. Si un pedido
  mínimo no vuelve, la medición no sirve: se cancela y no se insiste.
- El wrapper es de solo lectura: tira un error para toda acción que no
  esté en la lista de lecturas. Al terminar se restaura `fetch` y se recarga
  la pestaña.

**Por qué:** medición de REQ-PERF-004 (2026-09-28): una corrida salió
mezclada con la anterior, y con la red de un lugar prestado `getFotosPlan`
tardó de 15 a 42 s o no volvió.


## 8. Estados intermedios y carreras con `fetch` simulado

**Qué cuidar:**
- Las capturas del Browser pane pueden tardar varios segundos: una espera
  simulada de 3 a 8 s ya terminó cuando llega la captura. Para ver un
  estado intermedio ("Guardando…", "Reabriendo…"), dejar el pedido
  colgado con un resolver manual (`await new Promise(r => __soltar.push(r))`),
  sacar la captura y recién después soltarlo. Leer el DOM con JavaScript
  sirve como evidencia, pero no reemplaza verlo.
- Cada wrapper nuevo de `fetch` encima de otro suma sus demoras: recargar y
  volver a armar el stub entre escenarios.
- Una prueba de carrera tiene que demostrar que falla sin el arreglo:
  anular la función nueva (`window.nombre = () => {}`; en el `<script>`
  clásico las funciones son propiedades de `window`) y correr los mismos
  casos. En BL-033 la primera versión daba bien igual porque una falla
  simulada del caso anterior (`__gpFalla`) seguía activa y la lectura vieja
  nunca llegaba. Reiniciar todos los flags al empezar cada caso.

**Por qué:** 1.2.3 y 1.2.4 (2026-09-28).

## 9. Confirmar qué versión sirve GitHub Pages

**Qué cuidar:** después de un push a `main`, confirmar con
`curl -s "https://franago.github.io/NuestrosPlanes/?nc=$RANDOM" | grep "APP_VERSION ="`
(con un Monitor que espere la versión nueva). Si a los ~10 min sigue la
vieja y el header `Last-Modified` es anterior al push, el build de Pages no
se disparó: un commit vacío (`git commit --allow-empty`) y otro push lo
destraban (pedir el OK, es producción). `gh` no está instalado en esta PC.

**Por qué:** el push de 1.2.2 (32d55e6) nunca publicó; lo destrabó el
commit vacío c63f2a1 el 2026-09-28.

## 10. Browser pane oculto: transiciones quietas y capturas que engañan

**Qué cuidar:**
- Con el pane oculto o detrás de otra ventana, la página no se dibuja: las
  transiciones CSS quedan en `currentTime 0` y `getComputedStyle` devuelve
  el valor de antes (parece que el `:focus` no aplica). Antes de medir un
  estado con transición, sacar una captura (fuerza el dibujo) o mirar
  `el.getAnimations()`.
- Las capturas pueden salir con un cuadro viejo (header corrido, pantalla
  negra, un modal que ya se cerró) o, después de varios `resize_window`
  seguidos, achicadas al ~85 % con una franja oscura a la derecha. El
  layout se confirma midiendo con JS (`getBoundingClientRect`,
  `scrollWidth` contra `innerWidth`), no con la imagen.
- El `fetch` simulado se pierde en cada recarga. Tenerlo en un archivo
  temporal en la raíz (servido por `http-server`) y cargarlo con
  `eval(await (await fetch('/zz-stub-temp.js')).text())`. Borrar el archivo
  antes de cerrar, así no llega a un commit.

**Por qué:** REQ-UX-002, fases 2 y 3 (2026-09-28): un foco que "no
cambiaba" era una transición quieta, y una lista "corrida" a 375 era un
cuadro viejo. Las mediciones daban bien.

## 11. Safari de iPhone: lo que el Browser pane no muestra

**Qué cuidar:**
- El Browser pane y el Chrome de la PC usan Chromium. Los controles
  nativos de iOS (campos de fecha, selects) se dibujan distinto y no se
  pueden reproducir acá. Un cambio en esos campos, o uno que los haga más
  visibles (un borde, un fondo), se confirma en el iPhone de Franco con una
  captura, y se avisa antes de que es lo único que no se probó.
- `input type="date"` en Safari de iOS tiene un ancho mínimo propio: no
  respeta `width:100%`, se encima con el campo de al lado en una grilla y
  se sale del modal, y centra la fecha. Arreglo, ya aplicado a
  `.form-group input[type="date"]`: `appearance:none` (con `-webkit-`),
  `display:block`, `min-width:0`, `max-width:100%`, un `min-height` igual
  al de los otros campos (vacío, si no, queda más bajo) y
  `::-webkit-date-and-time-value { text-align:left }`. Un campo de fecha
  nuevo fuera de `.form-group` necesita lo mismo.

**Por qué:** 1.3.0 (REQ-UX-002, 2026-09-28). El problema venía desde
REQ-MEDIA-005, pero con el fondo igual al del modal y el borde de 0,5 px
no se notaba. El rediseño lo dejó a la vista y Franco lo vio en el
iPhone. En Chromium las medidas daban bien. Arreglado en 1.3.1 y
confirmado por Franco.
