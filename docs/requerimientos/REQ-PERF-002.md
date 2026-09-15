# REQ-PERF-002 — Performance: render de tareas desacoplado de imágenes, cache de imágenes persistido y reintento de Drive

> **Estado:** IMPLEMENTADO, APTO de Duck. Backend en prod (Web App @21, 2026-09-15). Frontend pendiente de push a GitHub Pages (queda en working tree hasta confirmación de Franco, ver flujo de commit/push del proyecto).
> **Dueño técnico:** Bob (back) + Jay (front) · **QA:** Duck · **PM:** Paul
> **Depende de:** [REQ-PERF-001](REQ-PERF-001.md) (contexto y arquitectura ya diagnosticada ahí).
> **Nota:** REQ-PERF-001 había dejado anotado un candidato "REQ-PERF-002" distinto (endpoint único de carga inicial). Tras investigar el reporte nuevo de Franco, ese no resultó ser el cuello de botella principal — este REQ ataca tres causas más concretas y de menor riesgo. El endpoint único sigue sin diseñar; si hace falta retomarlo, corresponde numerarlo REQ-PERF-003.

## Objetivo

Franco reportó, después de REQ-PERF-001 ya en prod, que seguía tardando mucho
la carga de fotos recientes y — más todavía — que las tareas tardaran en
mostrarse. Aparte, reportó errores intermitentes de "no se pudo cargar la
foto" que no estaban antes de REQ-MEDIA-002/PERF-001.

## Diagnóstico (Bob)

Tres causas independientes, ninguna relacionada con la que REQ-PERF-001 ya
había resuelto:

1. **Render de tareas atado a la etapa más lenta**: `initApp()` ([index.html:2256](../../index.html:2256))
   pintaba `renderPlanes()` recién después de `Promise.all(categorias,
   usuarios, fotos)`, aunque `loadPlanes()` (una lectura simple de hoja) ya
   hubiera resuelto hacía rato. Las tareas tardaban en verse tanto como la
   parte más lenta (avatares y fotos, que sí dependen de Drive) sin necesidad.
2. **Cache de imágenes solo en memoria**: `avatarCache` ([index.html:2361](../../index.html:2361))
   nunca persistía — cada recarga de página volvía a pedirle a Drive
   (`getArchivos`) imágenes que ya se habían visto en esa misma sesión de
   navegador.
3. **Sin reintento ante error transitorio de Drive**: `handleGetArchivo`/
   `handleGetArchivos` ([Code.gs:1421](../../Code.gs:1421)) llaman a
   `DriveApp.getFileById(...).getBlob()` en vivo, sin cachear nada del lado
   del servidor. Un error transitorio de Drive en un solo archivo lo
   marcaba `error` sin reintentar — con el carrusel pidiendo más imágenes de
   una que antes (REQ-MEDIA-002), hay más superficie para que salga.

Explícitamente **no** es el endpoint único de carga inicial que REQ-PERF-001
había anotado como candidato: ese ataca el costo fijo por invocación de Apps
Script, que no es la causa dominante de lo que reportó Franco esta vez.

## Alcance — entra

### 1. `initApp()` — dos etapas en vez de una

- ([index.html:2256](../../index.html:2256)) Categorías y planes se esperan
  primero (`Promise.all([categoriasPromise, planesPromise])`) y se pintan de
  inmediato (`renderCategorias()`, `renderPlanes()`, `appLoading.hidden =
  true`) — sin esperar a `loadOtherUsers()` (avatares) ni a
  `loadFotosRecientes()`.
- Esas dos siguen corriendo en segundo plano en una segunda etapa; al
  terminar, se repinta (`updateHeaderUser()`, `renderPlanes()` de nuevo) para
  reflejar nombres/avatares de otros usuarios.
- `getUserDisplay`/`getUserAvatarArchivoId` ya toleraban el caso "todavía no
  resuelto" (caían al ID crudo / iniciales) — no fue necesario tocarlos.
- Efecto esperado: para el propio usuario (siempre resuelto por
  `state.session`, no por `state.users`), las tareas se ven completas desde
  el primer render. Para tareas creadas por el otro usuario, puede
  parpadear brevemente el ID en vez del nombre hasta que resuelva la segunda
  etapa — aceptado, es el mismo criterio de "placeholder mientras carga" que
  ya usan los avatares.

### 2. Cache de imágenes persistido en `localStorage`

- `loadImageCachePersistido()`/`guardarImageCachePersistido()`
  ([index.html:2361](../../index.html:2361)): el `archivoId` es inmutable
  (una foto nueva siempre nace con un ID nuevo, REQ-MEDIA-001), así que no
  hace falta invalidación — solo acotar cuánto se guarda.
- Se cargan al boot (`loadImageCachePersistido()` en `boot()`,
  [index.html:3564](../../index.html:3564)) y se guardan cada vez que
  `fetchAvataresDataUrl` resuelve archivos nuevos.
- Solo se persisten entradas resueltas (`!!url`); los `null` (fallos) no se
  guardan, para que un archivo que falló por un hipo de Drive se pueda
  reintentar en la próxima carga en vez de quedar "roto" para siempre.
- Tope de 150 entradas (recorte al más reciente) para no crecer sin límite;
  si `localStorage.setItem` tira por cuota llena, reintenta una vez con la
  mitad y si sigue sin entrar, sigue solo en memoria para esa sesión (mismo
  criterio defensivo que ya usa `saveSession`).

### 3. Reintento en lectura de Drive

- `leerBlobDriveConReintento()` ([Code.gs:1380](../../Code.gs:1380)): hasta 3
  intentos con backoff corto (200ms, 400ms) antes de darse por vencido.
  Usado por `handleGetArchivo` y `handleGetArchivos`.
- No cambia el contrato de la respuesta: sigue devolviendo `error` por
  archivo si todos los intentos fallan (mismo criterio que ya validaba
  REQ-PERF-001 criterio 3).

## Alcance — fuera de este REQ

- **Endpoint único de carga inicial** (el candidato original anotado en
  REQ-PERF-001): sigue sin diseñar. Si el "primer vistazo" a fotos nunca
  vistas (dispositivo nuevo, cache de navegador borrado) sigue sintiéndose
  lento después de este REQ, ahí sí hace falta — correspondería a
  REQ-PERF-003, con diseño de Bob y revisión de Gary sobre el costo de armar
  una respuesta combinada del lado del servidor.
- Cache de imágenes del lado del servidor (`CacheService`): evaluado y
  descartado para este REQ — el límite de 100KB por clave de `CacheService`
  queda muy justo (a veces por debajo) del tamaño de una foto de tarea
  comprimida en base64 (~85KB × 1.33 ≈ 113KB), así que no es una base
  confiable sin trabajo adicional de trocear/comprimir más agresivo.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | Con categorías y tareas ya en la hoja, `renderPlanes()` pinta la lista antes de que resuelvan `loadOtherUsers()`/`loadFotosRecientes()` — no espera la etapa de imágenes. |
| 2 | Un archivoId ya cacheado en `localStorage` de una carga anterior no dispara una llamada a `getArchivos` en la carga siguiente. |
| 3 | Un archivoId que falló (`error`) en una carga no queda persistido — la carga siguiente lo reintenta contra el backend. |
| 4 | `getArchivos` con un archivo válido + uno inexistente sigue devolviendo 3 entradas (una por ID pedido), con `error` solo en la inexistente — sin regresión de REQ-PERF-001 criterios 2/3. |
| 5 | Sin regresión: REQ-MEDIA-001 (22/22), REQ-MEDIA-002 (43/43, incluye el test nuevo de este REQ), BUG-LOGIN-001-B (38/38). |

## Datos sensibles

Ninguno de los tres cambios toca autenticación, permisos ni el modelo de
datos. El cache de imágenes en `localStorage` guarda las mismas fotos que ya
se veían en pantalla (nada nuevo se expone); vive solo en el navegador de
cada usuario, no se sincroniza entre dispositivos ni cuentas.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `localStorage` lleno por acumular muchas fotos con el tiempo | Tope de 150 entradas, recorte al más reciente; reintento con la mitad si la cuota está llena; degrada a "solo en memoria" sin romper nada. |
| Reintento de Drive tapa un error real (archivo borrado/corrupto) | Solo reintenta el mismo request 3 veces con backoff corto (~600ms total) — no es un retry indefinido; si el archivo de verdad no está, las 3 fallan y se reporta `error` igual que antes. |
| Parpadeo de nombre (ID en vez de nombre) para tareas del otro usuario en el primer render | Aceptado — mismo criterio que ya toleraban los avatares (iniciales mientras cargan); se corrige solo en el repintado de la segunda etapa, que llega segundos después. |

## Plan de pruebas (Duck)

1. Suites contra Apps Script real (proyecto de test, planillas scratch
   descartables): `probarMEDIA001` 22/22, `probarMEDIA002` 43/43 (incluye
   el test nuevo `grupoGetArchivosBatch`, que no existía — REQ-PERF-001 lo
   había dejado marcado como pendiente), `probarBUGLOGIN001B` 38/38 — sin
   regresión.
2. Sintaxis: `index.html` (script inline) y `Code.gs`/`Tests.gs` parsean sin
   errores (`node -e "new Function(...)"`).
3. No probado en navegador real con login de Google (mismo criterio que
   REQ-PERF-001: se verificó cada pieza contra el motor real por separado —
   el cache de `localStorage` y el orden de render de `initApp()` no tienen
   forma de probarse contra el backend de test, son puramente de cliente).
