---
name: convenciones-tecnicas
description: >
  Catálogo de cuidados técnicos de Nuestros Planes (repo Peroncitos) ya
  aprendidos a los golpes, uno por tema, y equivalencias para leer las
  herramientas genéricas en este stack (reglas, emulador, staging,
  colección). Activar si la tarea toca, aunque no se lo nombre: clasp,
  deploy a prod o test, `clasp run -u duck`, `redeploy`, Ejecuciones,
  `clasp logs`; GitHub Pages, versión y caché del front, inventario de
  infraestructura, revisión periódica; tests `probarXXX()`, `Tests.gs`,
  planilla scratch, "el test muerde", seams; contrato front-servidor,
  acción nueva en `doPost`, orden de publicación, `respond()`; columnas
  nuevas, `setupSheets`, borrado lógico, backfills idempotentes, respaldo
  de la planilla; `flush()`, `LockService`, `CacheService`; `hidden`,
  overlays, modales; fotos de Drive en el cliente, pedidos en vuelo,
  `localStorage`; nombres sin declarar en `index.html`; preview local
  que pega a prod; seguridad (lista blanca, sesión HMAC, `escapeHtml`,
  Auditoría); fechas en hora Argentina.
---

# Convenciones técnicas — cuidados que ya aprendimos

Catálogo por tema, no por sesión ni por fecha. Cada tema tiene su propio
archivo en este mismo directorio: leé SOLO el que aplica a la tarea
actual.

## Temas disponibles

- [apps-script-clasp.md](apps-script-clasp.md) — deploy con clasp a prod y test, `clasp run -u duck`, qué sube un `push`, Ejecuciones y logs invisibles, editor de Apps Script por control remoto.
- [infraestructura.md](infraestructura.md) — lo propio para `hroy-deploy` y `hroy-estado-infra`: ambientes (test hace de staging), qué sale en cada deploy, versión y caché del front, verificar lo publicado, registro, revisión periódica. Piezas y estado: `docs/infra/inventario.md`.
- [tests.md](tests.md) — lo propio para `hduck-prueba-cambio` y `hduck-test-en-rojo`: qué pruebas hay, correr y leer un `probarXXX()`, estado previo y "el test muerde", planilla scratch y seams, totales que cambian, lo que no se prueba en test.
- [contratos.md](contratos.md) — lo propio para `hbob-impacto-cambio` y `hbob-salud-codigo`: contrato front-servidor, acción nueva, orden de publicación, respuestas con `status` adentro, filas por nombre de columna, hermanas en el servidor.
- [datos.md](datos.md) — lo propio para `hgary-cambio-datos` y `hgary-integridad`: columna nueva, borrado lógico, funciones que escriben sobre datos reales, chequeos de solo lectura, ediciones a mano, respaldo.
- [sheets-concurrencia.md](sheets-concurrencia.md) — escrituras que el request siguiente no ve (`flush()`), lecturas fuera del lock, claves de `CacheService` compartidas entre planillas.
- [pantallas-y-visibilidad.md](pantallas-y-visibilidad.md) — `hidden` contra `display:flex`, estilo inline que le gana a la clase, modales sin scroll interno, `filter` que pinta encima de un hermano posicionado.
- [red-y-archivos-cliente.md](red-y-archivos-cliente.md) — fotos de Drive en el front: deduplicar y cancelar pedidos, no cachear fallos, descartar respuestas viejas, `<img>` sin fuente, cuota de `localStorage`, errores de carga que parecen lista vacía, EXIF que borra `canvas`, escrituras que una lectura vieja en vuelo pisa, precarga con ventana y cola, tipo de red solo en Chrome Android.
- [scope-js.md](scope-js.md) — una función que se llama y no existe: `ReferenceError` en tiempo de ejecución que `check-sintaxis.js` no ve.
- [seguridad.md](seguridad.md) — lo propio de Nuestros Planes para `hjulia-revision-cambio`: lista blanca, sesión opaca, validación en el servidor, `escapeHtml`, proxy de Drive, Auditoría, tests server-side.
- [fechas.md](fechas.md) — "hoy" en hora Argentina y no con `toISOString()` (UTC), fechas solo-día que se corren.
- [verificacion-navegador.md](verificacion-navegador.md) — lo propio de Nuestros Planes para `hjay-verificacion-visual`: preview local, que `localhost` pega al Apps Script de PRODUCCIÓN, login, fetch simulado, cortes `@media`, probar contra el Web App de test con dos sesiones (`simPLAN001_preparar`), `clasp run` de solo lectura a prod, estados intermedios y carreras con fetch simulado, confirmar qué versión sirve GitHub Pages, Browser pane oculto (transiciones quietas, capturas viejas o achicadas: medir con JS), Safari de iPhone que el Browser pane no reproduce (campo de fecha que no respeta `width:100%`).

## Cómo leer las herramientas genéricas en este proyecto

Las herramientas `h*` son de uso general y hablan en términos de otros
stacks. Acá se leen así:

| La herramienta dice | En Nuestros Planes |
|---|---|
| Reglas de la base, regla que permite o exige un campo | No hay: todo control vive en `Code.gs` (`doPost`, `validarSesion`, cada handler). Lo que oculta el front es cosmético |
| Emulador, ambiente de prueba | Proyecto de Apps Script de **test** con una planilla scratch propia (`probarXXX()`), o el front con `fetch` simulado |
| Staging | Proyecto de test. No hay staging del front: Pages es prod y `localhost` pega al servidor de prod |
| Colección, documento, campo | Hoja, fila, columna de Google Sheets (`docs/modelo-datos.md`) |
| Funciones en la nube, piezas con deploy propio | El Web App de Apps Script; las funciones de mantenimiento se corren con `clasp run` |
| Hosting | GitHub Pages (`git push origin main`) |
| Suite, CI | `probarXXX()` en test y `node check-sintaxis.js` (hook `pre-commit`); el único CI es el build de Pages |
| Mapa de datos | `docs/modelo-datos.md` |
| Inventario de infraestructura | `docs/infra/inventario.md` |
| Aprobación del ambiente | La de `CLAUDE.md`: cada paso a prod con un sí explícito justo antes. Test no la necesita |
| Proyecto obligatorio, sin valor por defecto | `-P` explícito en cada `clasp`: sin `-P` va a **prod** |
| Runtime y acciones del CI | No aplica: el build de Pages lo maneja GitHub. El runtime de Apps Script está en `appsscript.json` (V8) |
| Fecha de una implementación | `clasp deployments` no la muestra: número de versión contra la bitácora, o "Gestionar implementaciones" en el editor (la mira Franco) |
| Commit por paso o por sombrero | Pasos verificados por separado durante la sesión; los commits, al cierre o con el OK del deploy (`CLAUDE.md`) |
| Golden master, test de caracterización | Un `probarXXX()` que fija lo que hoy devuelven los handlers, en verde antes de mover código. No hay snapshots |
| Cuarentena | No hay en el runner: `tests.md` §7 |

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
