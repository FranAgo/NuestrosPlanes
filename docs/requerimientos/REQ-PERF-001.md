# REQ-PERF-001 — Performance: compresión de fotos, batch de imágenes, caché de sesión/hojas y carga inicial en paralelo

> **Estado:** IMPLEMENTADO, APTO de Duck. Backend en prod (Web App @20, 2026-09-15). Frontend pusheado a GitHub Pages (commits `90729ed` y `d93e1f0`, 2026-09-15). Un ítem queda **fuera de este REQ** — ver [Alcance — fuera de este REQ](#alcance--fuera-de-este-req-anotado-para-el-futuro).
> **Dueño técnico:** Bob (back) + Jay (front) · **AppSec:** Julia · **DBA:** Gary · **QA:** Duck · **PM:** Paul
> **Depende de:** nada aguas arriba. Escrito retroactivamente — Paul lo formaliza después de la implementación, a pedido de Franco, para que el backlog no quede solo en la conversación.

## Objetivo

Franco reportó que la app tardaba mucho en cuatro acciones cotidianas: consultar
tareas, subir fotos, completar una tarea y agregar una tarea nueva — y, en una
segunda vuelta, que recargar la página se queda ~30s en "Cargando…". Bajar esa
latencia sin tocar el modelo de datos ni las garantías de seguridad ya
establecidas (revocación inmediata de sesión, ver [REQ-SEC-001](REQ-SEC-001.md)).

## Diagnóstico (Bob)

Arquitectura: Google Apps Script Web App + Google Sheets como base de datos.
Cuatro causas, todas activas a la vez:

1. Cada imagen (avatar o foto de tarea) era un request HTTP aparte al Web App —
   mostrar el carrusel de 20 fotos disparaba ~21 invocaciones.
2. `validarSesion()` releía la hoja `Sesiones` completa en **cada** request,
   sin importar la acción.
3. Handlers de validación simple (`userExists`, `categoriaExists`,
   `getCategoriaNombre`, `handleGetCategorias`) releían la hoja entera cada vez.
4. Fotos de tarea se subían sin comprimir (hasta 3MB originales) en base64.

Después, con eso resuelto, apareció una quinta causa específica de la carga
inicial de la página: `initApp()` encadenaba 5 llamadas al backend en serie
aunque varias eran independientes entre sí.

## Alcance — entra

### 1. Compresión de fotos de tarea en el navegador

- `comprimirImagenPlan()` ([index.html:2740](../../index.html:2740)): redimensiona
  con `<canvas>` (máx. 1800px de lado) y exporta como JPEG (calidad 0.82) antes
  de convertir a base64 — mismo patrón que ya usaba el recorte de avatar.
- El límite de tamaño del archivo *original* sube de 3MB a 20MB: antes había que
  elegir a mano una foto "más liviana"; ahora se comprime siempre.
- Fondo blanco antes de dibujar (un PNG con transparencia exportado a JPEG
  quedaría con las áreas transparentes en negro si no se rellena antes).

### 2. `getArchivos` — batch de imágenes

- Acción nueva `getArchivos` (plural) en el router ([Code.gs:1421](../../Code.gs:1421)):
  recibe un arreglo de hasta 100 `archivoId` y devuelve todos en una sola
  invocación, con un solo pase por la hoja `Archivos` (no una lectura por ID).
- Cada archivo se resuelve de forma independiente — uno que falla no tira abajo
  el batch (mismo criterio que `uploadPlanPhotos`).
- `getArchivo` (singular) queda intacto — lo siguen usando los tests de
  [REQ-MEDIA-001](REQ-MEDIA-001.md).
- Frontend: `fetchAvataresDataUrl()` ([index.html:2329](../../index.html:2329))
  reemplaza el viejo `fetchAvatarDataUrl` (singular) en los 3 call sites
  (`prefetchAvatares`, `renderFotosRecientesCard`, `openModalCarrusel`) —
  pide de una sola vez todos los IDs que falten en el caché del navegador.

### 3. Fast-path de validación de sesión

- `validarSesion()` ([Code.gs:426](../../Code.gs:426)) consulta primero un
  veredicto positivo cacheado (`cachearValidacionRapida`/`validarDesdeCacheRapida`,
  TTL 90s tope, acotado además al tiempo real que le queda a la sesión) antes de
  leer la hoja `Sesiones` completa.
- **Revisado con criterio de Julia antes de sumarlo:** el logout borra esta
  entrada de cache de inmediato (`handleLogout`), así que la revocación sigue
  siendo efectiva al toque. Nunca se usa como fallback cuando la hoja falla —
  se consulta ANTES de leerla, no después. No debilita ninguna garantía que ya
  probaba el harness de sesión de REQ-SEC-001 (`grpB_*` en `Tests.gs`).

### 4. Caché de lectura para Categorias y Usuarios

- `getDatosHoja()`/`invalidarCacheHoja()` ([Code.gs:1289](../../Code.gs:1289)):
  TTL 30s, **solo** para Categorias y Usuarios (hojas chicas, cambian poco) —
  deliberadamente NO se usa para Planes/Archivos/Sesiones, que necesitan estado
  siempre fresco (ej. el gate de fotos de `completePlan`).
- Invalidado a mano en cada escritura: `handleCreateCategoria`,
  `handleUpdateCategoria`, `handleDeleteCategoria`, `handleLoginGoogle`
  (`google_sub`), `setAvatarEnUsuario`.
- La clave de cache incluye el ID de la planilla activa (`claveCacheHoja`) —
  **bug encontrado y corregido por Bob antes de correr un test**: sin eso, una
  entrada de una planilla de test podía filtrarse a otra corrida o a prod,
  porque todas las planillas (scratch de test y la real) tienen una hoja
  llamada "Categorias"/"Usuarios" y `CacheService` es global al script, no a
  la planilla.

### 5. Carga inicial en paralelo (`initApp`)

- `initApp()` ([index.html:2211](../../index.html:2211)) encadenaba
  categorías/planes → usuarios → avatares → lista de fotos recientes →
  imágenes de fotos: 5 etapas en serie. `loadFotosRecientes` no dependía de
  nada de eso.
- Reordenado: categorías, planes y la lista de fotos recientes arrancan juntas
  desde el principio; `loadOtherUsers` (que sí depende de los planes) arranca
  en cuanto estos llegan, en paralelo con el resto. Queda en 3 etapas en serie
  como máximo.
- `refreshPlanes()` (tras crear/editar/borrar una tarea) pierde el refresco
  incidental de fotos recientes que arrastraba por depender de
  `loadOtherUsers` — no es una regresión, ninguna de esas acciones toca fotos.

## Alcance — fuera de este REQ (anotado para el futuro)

- **Endpoint único de carga inicial** (candidato a **REQ-PERF-002**, sin
  diseñar todavía): juntar categorías + planes + usuarios + avatares + fotos
  recientes en **una sola invocación** de Apps Script, en vez de las 3 etapas
  que quedaron tras el punto 5. Es el único cambio que ataca el problema de
  fondo (el costo fijo por invocación de Apps Script) en vez de acortar la
  cadena. Discutido con Franco el 15/09, no implementado — requiere que Bob
  diseñe el contrato de respuesta y que Gary opine sobre el costo de armar esa
  respuesta combinada del lado del servidor.
- Test automatizado permanente para `getArchivos` en `Tests.gs` — hoy solo
  tiene el smoke que corrió Duck una vez (no quedó en el archivo, ver Plan de
  pruebas).

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | Una foto de tarea seleccionada se comprime a JPEG (máx. 1800px) antes de subir; el resultado se ve correctamente en el preview y en el carrusel. |
| 2 | Pedir N imágenes (avatares y/o fotos de carrusel) hace **1 sola** llamada a `getArchivos`, no N llamadas a `getArchivo`. |
| 3 | Un `archivoId` inexistente dentro de un batch de `getArchivos` viene con `error` en su entrada, sin romper el resto de la respuesta. |
| 4 | Dos validaciones de sesión seguidas con el mismo token responden `userId` correctamente (la 2da puede venir del fast-path). |
| 5 | Tras `logout`, `validarSesion` del mismo token devuelve error de inmediato — el fast-path no revive una sesión cerrada. |
| 6 | Crear/borrar una categoría se refleja al toque en `categoriaExists`/`getCategorias` (el caché de 30s no la deja "invisible" ni "zombie"). |
| 7 | `initApp()` no dispara `getRecentPlanPhotos` después de que termine `loadOtherUsers` — arranca junto con categorías/planes. |
| 8 | Sin regresión: todo lo cubierto por [REQ-SEC-001](REQ-SEC-001.md), [REQ-MEDIA-001](REQ-MEDIA-001.md) y [REQ-MEDIA-002](REQ-MEDIA-002.md) sigue funcionando igual. |

## Datos sensibles

El fast-path de sesión (punto 3) toca autenticación — revisado con criterio de
Julia antes de implementarlo (ver esa sección). No se agregan campos nuevos de
datos personales; el caché de hojas (punto 4) no guarda nada que no estuviera
ya en Categorias/Usuarios.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Fast-path de sesión debilita la revocación inmediata de logout | Logout borra la entrada de cache de inmediato; TTL acotado al tiempo real restante de la sesión; nunca es fallback ante error de la hoja. Verificado con la suite `BUG-LOGIN-001-B` (38/38 sigue en verde). |
| Caché de hojas sirve datos obsoletos tras una escritura | Invalidación explícita en cada handler de escritura de Categorias/Usuarios; TTL corto (30s) como red de seguridad si se agrega un write path nuevo y se olvida invalidar. |
| Caché de hojas cruzado entre planillas (test↔test, test↔prod) | Clave de cache incluye el ID de planilla activa — bug encontrado y corregido antes de desplegar (ver punto 4). |
| Compresión de fotos degrada calidad visual | Calidad JPEG 0.82 sobre máx. 1800px — suficiente para "foto de tarea completada", no para impresión. Sin quejas reportadas al momento de escribir este REQ. |

## Plan de pruebas (Duck)

1. Suites existentes contra Apps Script real (proyecto de test, planillas
   scratch descartables): `probarDATA002` 70/70, `probarBUGLOGIN001B` 38/38,
   `probarMEDIA001` 22/22, `probarMEDIA002` 36/36 — sin regresión.
2. Smoke propio (corrido una vez, no permanente en `Tests.gs`): batch
   `getArchivos` con 2 archivos válidos + 1 inexistente (criterios 2, 3);
   fast-path de sesión con 2 validaciones seguidas + logout (criterios 4, 5);
   caché de Categorias con alta + baja (criterio 6). 20/20.
3. Navegador real: imagen sintética de ~8MB comprimida a ~85KB JPEG con
   `comprimirImagenPlan()` (criterio 1); `fetchAvataresDataUrl()` con 4 IDs
   hizo 1 sola llamada, y una segunda tanda con 2 ya cacheados + 1 nuevo pidió
   solo el nuevo (criterio 2); `initApp()` con latencia simulada fija (400ms
   por llamada) midió 3 etapas en serie en vez de 5 (criterio 7).
4. No probado: flujo completo con login real de Google en el navegador
   (requiere cuenta real autenticándose) — se verificó cada pieza por
   separado contra el motor real en su lugar.
5. Pendiente si se retoma REQ-PERF-002: medir el tiempo real de carga en
   producción (no simulado) antes/después, con las dos cuentas reales.
