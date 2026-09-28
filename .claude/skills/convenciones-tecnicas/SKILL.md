---
name: convenciones-tecnicas
description: >
  Catálogo de cuidados técnicos de Nuestros Planes (repo Peroncitos) ya
  aprendidos a los golpes (bugs reales, no solo estilo), uno por tema.
  Temas cubiertos hoy -- activar si la tarea toca alguno de estos, aunque
  no se lo mencione explícitamente: clasp, deploy de Apps Script a prod o
  test, `clasp run`/`-u duck`, `.claspignore`, `redeploy`, Ejecuciones,
  `Logger.log` vs `console.*`, `doPost [E-XXXXXX]`; Google Sheets desde
  Apps Script: `appendRow` + `SpreadsheetApp.flush()`, `LockService`,
  `CacheService` y sus claves, sesiones recién creadas que dan 401;
  mostrar/ocultar pantallas, overlays y modales: atributo `hidden` contra
  `display`, estilo inline contra clase, pantalla negra, modal más alto que
  la pantalla; fotos y archivos de Drive en el cliente: pedidos en vuelo,
  `AbortController`, cachear fallos, respuestas viejas, `<img>` sin `src`,
  cuota de `localStorage`, lotes lentos, miniaturas, EXIF que borra
  `canvas`; errores de carga que
  se pintan como lista vacía, reintentos; verificar en el navegador o
  preview local, a qué backend pega `localhost`, login de Google local;
  seguridad: lista blanca de `Usuarios`, sesión opaca con HMAC,
  `validarSesion`, `escapeHtml`, URLs de Drive nunca al cliente,
  `Auditoria`, Script Properties, tests `probarXXX()` en `Tests.gs`;
  fechas y zonas horarias: `toISOString()` en UTC, "hoy" en hora
  Argentina, día corrido después de las 21 h, `Utilities.formatDate`.
---

# Convenciones técnicas — cuidados que ya aprendimos

Catálogo por tema, no por sesión ni por fecha. Cada tema tiene su propio
archivo en este mismo directorio: leé SOLO el que aplica a la tarea
actual.

## Temas disponibles

- [apps-script-clasp.md](apps-script-clasp.md) — deploy con clasp a prod y test, `clasp run -u duck`, qué sube un `push`, Ejecuciones y logs invisibles, editor de Apps Script por control remoto.
- [sheets-concurrencia.md](sheets-concurrencia.md) — escrituras que el request siguiente no ve (`flush()`), lecturas fuera del lock, claves de `CacheService` compartidas entre planillas.
- [pantallas-y-visibilidad.md](pantallas-y-visibilidad.md) — `hidden` contra `display:flex`, estilo inline que le gana a la clase, modales sin scroll interno.
- [red-y-archivos-cliente.md](red-y-archivos-cliente.md) — fotos de Drive en el front: deduplicar y cancelar pedidos, no cachear fallos, descartar respuestas viejas, `<img>` sin fuente, cuota de `localStorage`, errores de carga que parecen lista vacía, EXIF que borra `canvas`.
- [seguridad.md](seguridad.md) — lo propio de Nuestros Planes para `hjulia-revision-cambio`: lista blanca, sesión opaca, validación en el servidor, `escapeHtml`, proxy de Drive, Auditoría, tests server-side.
- [fechas.md](fechas.md) — "hoy" en hora Argentina y no con `toISOString()` (UTC), fechas solo-día que se corren.
- [verificacion-navegador.md](verificacion-navegador.md) — lo propio de Nuestros Planes para `hjay-verificacion-visual`: preview local, que `localhost` pega al Apps Script de PRODUCCIÓN, login, fetch simulado, cortes `@media`, probar contra el Web App de test con dos sesiones (`simPLAN001_preparar`), `clasp run` de solo lectura a prod.

## Cómo mantenerlo

Si en una sesión se corrige un bug o se establece un cuidado que
aplicaría a futuros cambios similares (no específico de esa tarea):

1. Si el tema ya existe, agregar una sección al archivo del tema con tres
   partes: qué cuidar, por qué (con referencia a dónde se aprendió:
   bitácora, REQ o commit) y dónde ya está bien hecho en el código.
2. Si es un tema nuevo, crear su archivo acá, sumarlo a "Temas
   disponibles" **y sumar sus palabras clave a la `description` del
   frontmatter**: la descripción es lo único que se carga siempre; un tema
   que no está ahí no se va a activar.
   - La `description` es una lista de palabras clave, no una explicación
     por tema (el detalle va en el archivo).
   - Si la lista pasa de 8-10 temas y cuesta leerla de un vistazo,
     reconsiderar la estructura (partir el catálogo) en vez de seguir
     sumando.

Todo esto antes de cerrar la sesión (ver el checklist de cierre de
`CLAUDE.md`). Un cuidado que queda solo en el chat o enterrado en la
bitácora se pierde para la próxima vez.

No es uno de los 7 ingenieros ni un manual de estilo general: solo entra
un cuidado que salió de un bug o un error real de este proyecto.
