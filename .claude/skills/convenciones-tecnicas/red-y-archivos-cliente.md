# Fotos de Drive y pedidos de red en el cliente

Las fotos llegan como data URL a través del Web App (`getArchivo`), de a
una. Cada pedido tarda, y el usuario navega más rápido que la red. El
carrusel de recuerdos (REQ-PERF-005) acumuló cuatro bugs de este tipo en
un día; todos quedaron resueltos en `fetchArchivoDataUrl` y
`renderCarruselFoto`.

## Un pedido por archivo, compartido mientras está en vuelo

**Qué cuidar:** antes de pedir un archivo, mirar si ya hay un pedido en
vuelo para ese mismo id y reusar su promesa. Chequear solo la caché de
resultados no alcanza: el primer pedido todavía no resolvió.

**Por qué:** el prefetch de "la foto siguiente" y el pedido real salían
en paralelo por el mismo archivo (bitácora 2026-09-15, "pulse rápido y se
rompió").

**Dónde ya está bien:** `archivosEnCurso` en `fetchArchivoDataUrl`.

## Un fallo no se cachea

**Qué cuidar:** a la caché va solo el éxito. Un `null` cacheado deja la
foto rota para toda la sesión, aunque el fallo haya sido pasajero.

**Por qué:** mismo bug de arriba: una foto quedaba en "No se pudo cargar
la foto." para siempre.

## Cancelar lo que ya no importa

**Qué cuidar:** si el usuario ya pasó de largo, abortar los pedidos
viejos (`AbortController`; `api()` acepta `signal`). El navegador limita
las conexiones al mismo origen y el pedido que importa hace cola detrás.

**Por qué:** navegando rápido, la foto vigente tardaba lo que tardaban
todas las anteriores (bitácora 2026-09-15, cuarto pulido).

**Dónde ya está bien:** `abortFetchesExcepto([idActual])` al arrancar
cada navegación.

## Una respuesta vieja no pisa a la vigente

**Qué cuidar:** si varias respuestas pueden llegar en otro orden, cada
render guarda un token y descarta lo que llega con un token viejo.

**Dónde ya está bien:** `carruselRenderToken`.

## Un `<img>` nunca queda sin fuente a la vista

**Qué cuidar:** un `<img>` con `src=""` o sin `src` se pinta como ícono
de imagen rota. Dejar la foto anterior visible (con el loader encima)
hasta que la nueva esté lista, y hacer el cambio en un solo paso. Un
error de decodificación (`onerror`) muestra un mensaje, no el ícono.

**Por qué:** dos reportes de Franco sobre el carrusel (bitácora
2026-09-15).

## `localStorage` tiene cuota: no persistir en cada ítem

**Qué cuidar:** `guardarImageCachePersistido()` se llama una vez por
apertura de pantalla, no por cada foto. Fotos de ~500 KB en base64
llenan la cuota enseguida y cada escritura fallida reintenta.

**Por qué:** bug introducido y corregido en REQ-PERF-005 antes de llegar
a producción: trababa cada "siguiente".

## Traer de a uno, no en lote, lo que se muestra de a uno

**Qué cuidar:** `getArchivos` (lote) lee de Drive en serie dentro de una
sola ejecución y no responde hasta terminar todo; si se cae, fallan todas
las fotos a la vez. Para algo que se ve de a una, pedir la vigente y
precargar la siguiente.

**Por qué:** el carrusel tardaba más de 40 s en abrir (REQ-PERF-005).

## Miniaturas: `DriveApp.getThumbnail()` no sirve

**Qué cuidar:** para fotos subidas por la app, `getThumbnail()` no
devuelve nada útil. `thumbnailLink` de Drive API v3 (Servicio Avanzado)
sí, pero la URL de Google nunca va al cliente: se baja en el servidor.
Detalle en `docs/requerimientos/REQ-PERF-004.md` y BL-011.

## Un error de carga no se pinta como lista vacía

**Qué cuidar:** toda carga que no devuelve 200 muestra un error con
motivo, código (`codigo` del 500) y "Reintentar". Nunca el estado vacío
("No hay planes") como si no hubiera datos. Las lecturas pueden
reintentar solas una vez; las escrituras no, porque duplican.

**Por qué:** BUG-CARGA-001: Franco vio "No hay planes aquí todavía" con 4
planes en la hoja.

**Dónde ya está bien:** `loadPlanes`/`loadCategorias` con `apiLectura` y
el cartel de error (BUG-CARGA-001 fase 1).
