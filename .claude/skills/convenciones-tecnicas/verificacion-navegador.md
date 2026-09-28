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

