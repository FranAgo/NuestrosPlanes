# Verificación en el navegador: lo propio de Nuestros Planes

El procedimiento general está en `hjay-verificacion-visual`. Acá, solo lo
que ese procedimiento necesita saber de este proyecto.

## 1. Levantar la app local

`preview_start` con `static` (`.claude/launch.json`: `http-server -p 5173
-c-1`, sin caché). La app es `index.html` en la raíz.

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

Sin login, en la misma pestaña y **sin recargar**: primero el `fetch`
simulado, después `state.session = {userId, sessionToken, nombreDisplay}`
y después `initApp()`. No sembrar `localStorage['cp_session']`: si la
página se recarga, el arranque manda ese token falso a prod antes de que
exista el stub, vuelve 401 y `forceLogout` borra todo. Si antes hubo un
login real, `cp_session` ya tiene una sesión verdadera: una recarga sin
stub habla con prod como esa persona.

`cp_image_cache` (fotos en `localStorage`) puede tapar lo que devuelve el
stub para un `archivoId` que ya estaba cacheado: usar ids que no existan.

## 4. Cortes de pantalla

Hoy hay un solo corte de ancho: `@media (max-width: 600px)` (probar 600 y
601). Confirmarlo con grep de `@media` antes de confiar en esto. La app se
usa en el teléfono: 375 siempre entra en la lista de anchos.

Con la emulación de móvil, `(hover: hover) and (pointer: fine)` da falso:
desaparecen el cursor propio y los efectos de hover. El hover se verifica
a 1366 o más.
