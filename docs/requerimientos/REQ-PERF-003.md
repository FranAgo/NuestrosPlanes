# REQ-PERF-003 — Performance: card de "fotos recientes" sin salto de layout

> **Estado:** CERRADO. Sin regresión (suites REQ-MEDIA-001 22/22, REQ-MEDIA-002 48/48, BUG-LOGIN-001-B 38/38 — sin cambios respecto a antes de este REQ, porque `Code.gs`/`Tests.gs` no se tocan). Pusheado a producción (commit `481e97c`, 2026-09-15). Pendiente real: verificación visual en navegador con login de Google (no automatizable en este entorno). *(Estado corregido el 2026-09-16 — el doc decía "pendiente de push" pero ya estaba en `main` hacía varias sesiones.)*
> **Dueño técnico:** Jay (front) · **QA:** Duck · **PM:** Paul
> **Depende de:** [REQ-PERF-002](REQ-PERF-002.md) (arquitectura de `initApp()` en dos etapas y cache de imágenes ya en prod).
> **Reemplaza a:** una versión anterior de este mismo REQ que incluía además un mecanismo de miniaturas de Drive (`getThumbnail()`) para acelerar la carga de las fotos. Ese mecanismo se probó, no funcionó, y se descartó por completo — ver "Alcance — fuera de este REQ" y [REQ-PERF-004](REQ-PERF-004.md).

## Objetivo

Franco reportó, después de REQ-PERF-002 ya en prod: las tareas cargan bien,
pero la card de "fotos recientes" del dashboard tarda en aparecer, y cuando
por fin aparece lo hace de golpe, empujando la lista de tareas hacia abajo.
Pidió dos cosas: (a) que esas fotos carguen más rápido, y (b) que si todavía
no están, no aparezcan de la nada.

Este REQ resuelve **solo la parte (b)**. La parte (a) se investigó, el
enfoque inicial no funcionó, y quedó re-planteada en REQ-PERF-004 (sin
implementar todavía, ver abajo).

## Diagnóstico (Jay)

La card `#fotos-recientes-card` arranca con `hidden` y solo se hace visible
cuando termina TODO el fetch (metadata + imágenes,
`renderFotosRecientesCard()` en [index.html:2531](../../index.html:2531)).
Como las tareas ya se ven (REQ-PERF-002 las desacopló), el usuario está
mirando la lista cuando la card aparece de golpe arriba y la empuja — de ahí
el "aparecen de la nada" del reporte.

## Alcance — entra

### Card con skeleton en vez de "hidden → aparece de golpe" (Jay)

- Apenas se pintan las tareas en `initApp()` (mismo punto donde se hace
  `appLoading.hidden = true`, [index.html:2301](../../index.html:2301)), la
  card de fotos recientes se muestra de inmediato en estado "cargando"
  (`showFotosRecientesSkeleton()`, [index.html:2508](../../index.html:2508)):
  círculos con shimmer (mismo lenguaje visual que el skeleton de carga
  inicial, `skeletonShimmer`) en vez de fotos, sin el texto de conteo.
- Cuando `loadFotosRecientes()` resuelve: si hay fotos, se reemplaza el
  contenido del skeleton por las miniaturas reales **en el mismo espacio ya
  reservado** (sin cambio de alto/ancho de la card, sin reflow de lo que está
  debajo); si no hay fotos, la card se oculta.
- Un flag `fotosRecientesListo` evita que el skeleton se dispare después de
  que el resultado real ya se pintó (carga rápida) y evita que se vuelva a
  mostrar el skeleton en el refresco "en caliente" después de subir una foto
  nueva (`await loadFotosRecientes()` en el flujo de upload,
  [index.html:2531](../../index.html:2531)) — ahí las miniaturas ya visibles
  no tienen que parpadear.

Este cambio es **puramente de cliente** — no toca `Code.gs` ni el contrato de
ningún endpoint.

## Alcance — fuera de este REQ

- **Miniaturas de Drive (`getThumbnail()`) para acelerar la carga real**:
  se implementó, se probó contra el proyecto de test con una foto realista
  (no el fixture trivial de 1×1 píxel que usan las demás suites), y **no
  funciona para este caso de uso**. Diagnóstico completo:

  > `DriveApp.getFileById(id).getThumbnail()` devolvió `null` para una
  > imagen recién subida vía `uploadPlanPhotos` (probado también con 8s de
  > espera antes de pedirla, para descartar demora de generación) — cayó al
  > fallback de blob completo, mismo peso exacto que sin `thumb`. Para
  > descartar un problema de permisos/entorno, se probó `getThumbnail()`
  > contra la spreadsheet scratch (un Google Sheets) en la misma corrida: ahí
  > sí funcionó (devolvió una miniatura real). Conclusión: es una limitación
  > conocida de `DriveApp.getThumbnail()` en Apps Script — confiable para
  > archivos nativos de Google Workspace, no para imágenes subidas
  > (JPG/PNG). No es un problema de timing ni de permisos de este proyecto.

  El código de ese intento (`thumb` en `handleGetArchivos`/
  `leerBlobDriveConReintento` en `Code.gs`, la clave de cache compuesta
  `archivoId::thumb` en `index.html`) se implementó, se probó y se
  **revirtió por completo** — no aportaba ningún beneficio real (siempre
  caía al fallback) y sumaba una llamada extra a Drive antes de cada
  fallback, con riesgo de hacer las cosas más lentas en vez de más rápidas.
  `Code.gs` y `Tests.gs` quedan sin cambios respecto a antes de este REQ.
- **Carga más rápida de las fotos en sí**: sigue sin resolverse. Ver
  [REQ-PERF-004](REQ-PERF-004.md) — necesita un enfoque distinto (miniatura
  generada en el cliente al subir la foto, guardada en la hoja) y una
  decisión de esquema de datos de Gary antes de implementarse.

## Criterios de aceptación (verificables por Duck)

| # | Criterio | Resultado |
|---|---|---|
| 1 | Al entrar a la app, la card de "fotos recientes" (o su placeholder) ocupa su espacio final desde que se ven las tareas — no hay un salto de layout cuando las fotos terminan de cargar. | **No verificado en navegador** (requiere login de Google, mismo límite que REQ-PERF-002). Verificado por lectura de código: `showFotosRecientesSkeleton()` se dispara en el mismo punto donde hoy se pintan las tareas. |
| 2 | Si no hay fotos recientes, la card no queda visible ni con skeleton colgado — se oculta apenas se sabe que la lista vino vacía. | **Verificado por lectura de código**: la rama `fotosRecientes.length === 0` de `renderFotosRecientesCard()` saca `is-loading` y oculta la card. |
| 3 | Subir una foto nueva a una tarea y ver que la card se actualiza en caliente sin volver a mostrar el skeleton (no debe "parpadear" tapando las miniaturas ya visibles). | **Verificado por lectura de código**: `showFotosRecientesSkeleton()` solo se llama desde `initApp()`, nunca desde el flujo de upload. |
| 4 | Sin regresión: REQ-MEDIA-001, REQ-MEDIA-002, REQ-PERF-002 (suites existentes) siguen en verde. | **OK, trivialmente** — `Code.gs`/`Tests.gs` no cambiaron en este REQ (el único cambio de código vive en `index.html`, puro cliente). |

## Datos sensibles

Ninguno. No se toca autenticación, permisos, ni el modelo de datos.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Skeleton que no se apaga si `loadFotosRecientes()` falla (catch silencioso ya existente) | El `catch` de `loadFotosRecientes()` deja `fotosRecientes = []`, que sigue el mismo camino que "sin fotos" → la card se oculta igual, no queda el skeleton colgado. |

## Plan de pruebas (Duck) — ejecutado

1. **Backend**: no aplica — `Code.gs`/`Tests.gs` sin cambios en este REQ.
   (El intento de miniaturas de Drive sí se probó y se descartó — ver
   diagnóstico arriba; el código de esa prueba, temporal, se removió del
   working tree, no queda en el repo.)
2. **Frontend**: sintaxis del script inline verificada (`node -e "new
   Function(...)"`) sin errores. Comportamiento visual (criterios 1-3) sin
   verificar en navegador — mismo límite que REQ-PERF-002, requiere login de
   Google real.
3. **Regresión**: `probarMEDIA001` 22/22, `probarMEDIA002` 48/48,
   `probarBUGLOGIN001B` 38/38 — sin cambios de resultado (backend intacto).
