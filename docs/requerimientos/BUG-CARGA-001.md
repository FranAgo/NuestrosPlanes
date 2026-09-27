# BUG-CARGA-001 — La app muestra "No hay planes" cuando la carga falla

> **Estado:** CERRADO (2026-09-27). Fase 1 en producción desde el 25/09 (servidor v22, front `a8faf0c`). Fase 2: causa raíz encontrada en `clasp logs` (autorización OAuth vencida, ver "Revisión de logs del 2026-09-27") y ya resuelta el 25/09; sin errores de carga desde entonces. Cerrado con el OK de Franco.
>
> | Condición de cierre | Estado |
> |---|---|
> | Código entregado (Bob + Jay) | ✅ 2026-09-25 |
> | Aprobación explícita de Duck | ✅ 2026-09-25 — APTO, ver "Resultados de Duck" |
> | Paul verificó criterios originales | ✅ 1–6 cumplidos en test; en prod, sin errores de carga desde el deploy (logs del 27/09) |
> | OK de Franco | ✅ 2026-09-27 |
> **Dueño técnico:** Bob (servidor) + Jay (front) · **Seguridad:** Julia · **QA:** Duck · **PM:** Paul
> **Datos sensibles:** sí, tangencialmente — los mensajes de error y el log no pueden exponer tokens de sesión, emails ni IDs de planilla/Drive.

## Reporte

Franco (2026-09-25) abrió la app de producción y vio "No hay planes aquí
todavía", sin tarjeta de fotos. La hoja `Planes` de producción tenía 4 planes
activos en ese momento (verificado a mano). Con F5 la app cargó bien.

## Diagnóstico

- **Front:** `loadPlanes`, `loadCategorias` y `loadFotosRecientes`
  (`index.html`) solo actúan si `data.status === 200`. Cualquier otra
  respuesta (500, 4xx distinto de 401) se ignora en silencio: `state.planes`
  queda `[]` y la lista se pinta vacía. `showAppLoadError()` (con Reintentar)
  solo se dispara si el `fetch` tira (error de red / respuesta no-JSON).
- **Servidor:** `doPost` atrapa toda excepción, hace `Logger.log` y responde
  `500 "Error interno del servidor."`. En el panel de Ejecuciones esas
  ejecuciones figuran como "Completada" y sin logs visibles: no hay forma de
  saber qué falló.
- **Evidencia en Ejecuciones (versión 21):** la carga de las 15:21:26 fueron 3
  `doPost` de ~1 s y ninguna llamada `getUser` posterior. Una carga sana hace
  5 llamadas (categorías, planes, fotos + `getUser` de la otra persona +
  `getArchivos`). Cargas de días anteriores (19–24/09) muestran el mismo
  patrón de 3 → probablemente viene pasando hace días.
- `purgarSesiones` (trigger semanal) terminó en **Error** el 20/09 00:03.
  Sin relación confirmada; se revisa en la fase 1.

**Causa raíz: desconocida.** Arreglarla sin verla sería adivinar → fase 1
existe para hacerla visible.

## Fase 1 — Hacer visible el error (alcance de este documento)

### Entra
- **Bob:** toda excepción atrapada en `doPost` se registra con
  `console.error` (visible en Ejecuciones) incluyendo: acción pedida, mensaje
  de error, stack y un código corto de error. La respuesta 500 incluye ese
  código (`codigo`) — sin detalles internos.
- **Jay:** planes y categorías con respuesta no-200 → cartel "No se pudieron
  cargar los datos" con el motivo (mensaje + código si viene) y botón
  Reintentar; nunca la lista vacía. Falla pasajera (5xx o error de red) →
  un reintento automático antes de mostrar el cartel. Fotos recientes con
  error → no tapa la app (la card se oculta como hoy), pero queda en consola.

### No entra
- Arreglar la causa raíz (fase 2, cuando haya logs).
- Reintentos en acciones de escritura (crear/editar/borrar/completar): un
  reintento automático ahí podría duplicar datos.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Si `getPlanes` responde no-200 (≠401), la app **nunca** muestra "No hay planes aquí todavía": muestra el cartel de error con el motivo y Reintentar. |
| 2 | Idem `getCategorias`. Si falla `getRecentPlanPhotos`, la app no se tapa. |
| 3 | Una falla pasajera (5xx o de red) en la carga inicial se reintenta sola **una** vez; si el reintento funciona, el usuario ve la app normal. |
| 4 | Toda excepción del servidor queda en Ejecuciones con: acción, mensaje, stack y código. El mismo código llega al cliente. |
| 5 | El cartel (y la respuesta al cliente) no muestran token de sesión, email, IDs de planilla/Drive, mensaje interno ni stack. El log del servidor no incluye el body del pedido (trae el token). *(Ajustado por Julia 2026-09-25: el mensaje de excepción de Google en el log puede traer un ID de archivo — aceptado, el panel de Ejecuciones solo lo ve el dueño del proyecto.)* |
| 6 | Sin regresión: suites de test (DATA002, BUGLOGIN001B, MEDIA001, MEDIA002) siguen en verde; login, planes, categorías, fotos y carrusel funcionan igual. |

## Resultados de Duck (test, 2026-09-25)

**Servidor** (`clasp push` a test + `clasp run -u duck`):
- `probarBUGCARGA001` 9/9 APTO (body no-JSON y evento sin postData → 500 +
  `codigo` E-XXXXXX, solo claves status/error/codigo, códigos distintos).
- Regresión: `probarDATA002` 70/70, `probarBUGLOGIN001B` 38/38,
  `probarMEDIA001` APTO 0 fallos, `probarMEDIA002` 43/43 (43 es la base: el
  48/48 de REQ-PERF-003 incluía 5 checks temporales, ver bitácora).
- Criterio 4 verificado a ojo en Ejecuciones del proyecto de test: las dos
  líneas `doPost [E-21179A]` / `[E-F87F07]` con acción, mensaje y stack.

**Front** (index.html local, `fetch` simulado, sesión inyectada):
| Caso | Resultado |
|---|---|
| getPlanes 500 ×2 | cartel "No se pudieron cargar los planes: Error interno del servidor. · código E-ABC123" + Reintentar; 1 solo reintento |
| getPlanes 500 → 200 | se recupera solo, lista normal |
| red ×2 / red → OK | cartel "(conexión)" / se recupera solo |
| getCategorias 500 ×2 | cartel "las categorías" |
| getRecentPlanPhotos 500 ×2 | app visible, card oculta, error en consola |
| getPlanes 400 | cartel, **sin** reintento |
| getPlanes 401 | sin reintento, vuelve al login |
| completePlan 500 | 1 solo pedido (las escrituras no se reintentan) |
| Botón Reintentar | recarga y muestra la lista |
| 200 con 0 planes | "No hay planes aquí todavía" (el único caso legítimo) |
Cartel verificado visualmente en escritorio y 375 px.

**Carrusel (REQ-PERF-005, cambio pendiente del 16/09):** abrir → pide f1 y
prefetchea f2; ráfaga de 4 "siguiente" → al servidor solo van f5 + vecinas
(f4, f6) más la precarga del primer paso (f3), no una por click; volver
atrás a f4 → instantáneo (ya precargada).

## Hallazgos durante la fase 1

1. **`Logger.log` no aparece en el panel de Ejecuciones; `console.error` sí.**
   Verificado en test: las suites que loguean con `Logger.log` no muestran
   nada, el `console.error` nuevo sí. Consecuencia: que las cargas de
   producción "sin logs" figuraran como Completada **no prueba** que hayan
   salido bien — pudieron ser 500 invisibles. Refuerza la hipótesis de que
   la carga de las 15:21:26 devolvió error en planes y fotos.
2. **`purgarSesiones` falla desde que se agregó el scope
   `script.scriptapp`** (commit del 11/09): "You do not have permission to
   call SpreadsheetApp.openById". El trigger quedó con la autorización vieja;
   las sesiones vencidas/revocadas no se están purgando. No causa la pantalla
   vacía. **Arreglo:** Franco abre el editor del proyecto de prod, corre
   `listarTriggers` una vez y acepta los permisos (re-autoriza el trigger).
   *2026-09-25 21:39:* Franco corrió `listarTriggers` desde el editor →
   Completada sin pedir autorización (los scopes ya estaban consentidos). El
   trigger sigue programado. **Pendiente:** confirmar que la próxima
   ejecución semanal de `purgarSesiones` termine sin error.
3. **Permisos que vencían cada 7 días:** la app OAuth del proyecto de Cloud
   (`nuestrosplanes-507721`) estaba en estado "Prueba", y en ese modo Google
   vence los refresh tokens a los 7 días (así se cayó el perfil `duck` de
   clasp). Se pasó a **"En producción"** (2026-09-25, con OK de Franco):
   página principal + `privacidad.html` (commit `c58591f`) cargadas en la
   marca. Sin verificación de Google (límite 100 usuarios, aviso "app no
   verificada"; sin costo). Perfil `duck` re-logueado después del cambio y
   probado (`probarBUGCARGA001` 9/9).

## Fase 2 — Causa raíz

Con la fase 1 en producción, la próxima falla deja el motivo en Ejecuciones.
Bob la diagnostica y se agrega acá.

### Revisión de logs del 2026-09-27

Fuente: `clasp logs --json` con el perfil por defecto de clasp (el perfil
`duck` da "Insufficient Permission" para logs). Devuelve las 100 entradas
más recientes del proyecto de Cloud `nuestrosplanes-507721`, que comparten
prod y test; cubren del 16/09 al 27/09. Los mensajes de `Logger.log`
**sí** aparecen ahí, aunque no se vean en el panel de Ejecuciones.

**Qué muestran (hora UTC):**

| Fecha | Origen | Mensaje | Veces |
|---|---|---|---|
| 20/09 02h → 25/09 18h | Web App de prod | `Error en doPost: Exception: No tienes permiso para llamar a SpreadsheetApp.openById` | 30, en ráfagas de 3 o 6 (una carga = 3 pedidos) |
| 20/09 03h | trigger `purgarSesiones` | el mismo error de permisos | 1 |
| 25/09 19h en adelante (v22) | Web App de prod | ningún `doPost [E-…]` de carga | 0 |
| 27/09 00:28 | Web App de prod | `validarSesion: sesión vencida` ×3 (sesión de 15 días que venció; el front vuelve al login) | 3 |
| 27/09 03:03 | trigger `purgarSesiones` | `0 fila(s) borrada(s)`, sin error | 1 |

Los `doPost [E-…]` de los días 25 que no son de la Web App vienen de
`probarBUGCARGA001` en test (stack en `Tests:1471`), no de usuarios.

**Causa raíz (con alta probabilidad):** la autorización del dueño del
script se había perdido para el scope de Sheets. La Web App corre como el
dueño (`executeAs: USER_DEPLOYING`), así que cada `SpreadsheetApp.openById`
fallaba con 500. Las cargas de "No hay planes" del 19–24/09 son esas
ráfagas de 3 errores. El trigger semanal falló por el mismo motivo.
Coincide con el hallazgo 3: la app OAuth estaba en modo "Prueba", donde
Google vence la autorización a los 7 días. El proyecto de Cloud se vinculó
alrededor del 11–13/09 y los errores empiezan el 20/09. Desde que se pasó
la app a "En producción" y se re-autorizó (25/09) no hubo ni un error de
permisos, y `purgarSesiones` volvió a correr bien el 27/09.

**Qué no se pudo confirmar:** que la vinculación haya sido exactamente 7
días antes (no está en la bitácora con hora), y por qué algunas cargas del
mismo período andaban (F5 funcionaba). Lo más probable es que la
autorización se renovara de a ratos al abrir el editor, pero no está
medido.

**Hallazgo 2 cerrado:** `purgarSesiones` terminó sin error el 27/09 00:03
(hora Argentina).

**Qué sigue:** no hay arreglo de código pendiente. Si vuelve a aparecer el
cartel de error, se lee su código con `clasp logs` (perfil por defecto).
Cerrado con el OK de Franco el 2026-09-27.

## Nota de alcance del deploy

Va junto con el cambio pendiente del carrusel (REQ-PERF-005: debounce +
prefetch simétrico, sin pushear desde el 16/09) — mismo archivo. Duck prueba
también el carrusel (decisión de Paul, aceptada por Franco el 2026-09-25).
