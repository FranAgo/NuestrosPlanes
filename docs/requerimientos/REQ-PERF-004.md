# REQ-PERF-004 — Performance: miniatura real de fotos, generada al subir

> **Estado:** CERRADO (2026-10-06)
> **Historia:** HECHO — en producción desde el 2026-09-28 11:11 (hora Argentina): servidor en la Web App @29, front en `main`. Criterio 1 confirmado por Franco el 2026-09-28 ~15:15 con 1.2.2, en una wifi parecida a la de su casa: las miniaturas de "Ya subidas" aparecen ya listas, sin pasar por "Cargando". Alcance aprobado por Franco el 2026-09-28 10:56, enfoque `thumbnailLink` por el servidor. Motivo de la prioridad: BL-030. Versión: 1.2.0 (DEC-009: un REQ nuevo sube la versión menor). CERRADO el 2026-10-06: Franco confirmó que en su casa las miniaturas de "Ya subidas" aparecen enseguida. La foto completa en el visor puede tardar unos segundos: es el piso de `getArchivo` y lo cubre REQ-MEDIA-007 (miniatura desenfocada mientras llega).
> **Dueño técnico:** Bob (servidor) + Jay (front) · **Seguridad:** Julia · **QA:** Duck · **PM:** Paul
> **Versión:** 1.2.0
> **Origen:** BL-011

## Alcance aprobado (2026-09-28)

Motivo: BL-030. Hoy cada miniatura de "Ya subidas" baja la foto entera: en
una tarea de 16 fotos fueron 7,6 MB y 33 s hasta la última, en la
computadora de Franco.

1. **Servidor.** Acción nueva `getMiniaturas({ archivoIds })`, de a varias
   por pedido. Para cada foto: `drive_file_id` de la hoja `Archivos` → API
   de Drive v3 (`files.get`, `fields=thumbnailLink`) → baja la miniatura
   con el token del dueño y la devuelve en base64. Se hace por REST con
   `UrlFetchApp.fetchAll` (en paralelo), no con el Servicio Avanzado: no hace
   falta tocar `appsscript.json`, porque los scopes `drive` y
   `external_request` ya están. Si una foto no tiene miniatura, vuelve con
   `sinMiniatura: true` y el front la pide completa (`getArchivo`), como hoy.
2. **Front.** "Ya subidas" y la tarjeta de fotos recientes usan miniaturas,
   con un caché propio separado del de fotos completas. Ese caché se
   persiste acotado y se borra al cerrar sesión (BL-016). El visor y el
   carrusel siguen con la foto completa. Si `getMiniaturas` falla entero
   (por ejemplo, un front nuevo contra un servidor viejo), se cae a
   `getArchivo`.
3. **Costo:** ninguno. La cuota gratis de `UrlFetchApp` es de 20.000
   llamadas por día y cada miniatura usa 2. Si se pasara la cuota, se
   aplica el mismo respaldo (foto completa).
4. **Sin cambios** en hojas ni columnas (Gary).

## Medición en producción (2026-09-28 11:20, hora Argentina)

La medición se hizo en el Chrome de Franco, sobre la app publicada (1.2.0, @29), en modo solo lectura: `fetch` quedó instrumentado y bloqueaba toda acción que no fuera de lectura. La tarea era la de 16 fotos (`plan_muj2zk04_sfpb81`), con el caché de fotos vaciado en memoria.

| | Antes (1.1.0) | Primera apertura (1.2.0) | Segunda apertura (1.2.0) |
|---|---|---|---|
| Miniaturas | 16/16 | 16/16, ninguna en "Sin vista previa" | 16/16 |
| Pedidos de fotos | 16 `getArchivo` | 1 `getMiniaturas` y 0 `getArchivo` | ninguno (caché) |
| Datos | 7,6 MB | 499 KB | 2 KB |
| Tiempo hasta la última | 33 s | 9,9 s: `getFotosPlan` 3,6 s + `getMiniaturas` 6,2 s | 4,5 s (todo `getFotosPlan`) |

- **Criterio 1 no se cumple tal como estaba escrito** (menos de 5 s y menos de 200 KB). Las miniaturas de fotos reales a 320 px pesan unos 31 KB en base64 cada una, más de lo que había dado el diagnóstico con una imagen chica.
- Ahora el cuello de botella es `getFotosPlan`: tarda unos 4 s solo en traer la lista, antes de pedir cualquier miniatura.
- **Criterios 2 y 3:** se cumplen.
- **Criterios 4 a 6:** cubiertos en test.

**Decisión (Franco, 2026-09-28): parche 1.2.1.** Las miniaturas bajan a 200 px, porque las celdas de la grilla miden de 64 a 80 px. En test, la miniatura de la imagen de prueba pasó de 11,4 KB a 5,7 KB. El criterio 1 queda así: menos de 200 KB y menos de 5 s **para `getMiniaturas`**. Los ~4 s de `getFotosPlan` son otro problema y van al backlog.

**Medición de 1.2.1 (2026-09-28 ~11:40, hora Argentina).** Franco estaba fuera de casa, con mala conexión.
- **Peso:** `getMiniaturas` trajo 242 KB para las 16 fotos, contra 499 KB de la 1.2.0. Todavía queda un poco arriba de los 200 KB.
- **Resultado:** 16/16, sin "Sin vista previa".
- **Tiempos:** no sirven. `getFotosPlan` tardó entre 15 y 42 s, y en otra corrida no volvió en más de 40 s. Una de las corridas además se mezcló con otra que seguía andando en la misma pestaña.
- **Pendiente:** repetir la medición de tiempos con la conexión de casa antes de cerrar el criterio 1. *(2026-10-06: Franco lo confirmó en uso en su casa, sin medir tiempos: las miniaturas aparecen enseguida.)*

**Efecto secundario aceptado:** la card de recuerdos ya no deja bajada de antemano la foto completa. Al abrir el carrusel, la primera foto se pide en ese momento, igual que las siguientes desde REQ-PERF-005. Si se nota lenta, se puede precargar solo la primera.

## Criterios de aceptación

1. En la tarea de 16 fotos, "Ya subidas" muestra todas las miniaturas en
   menos de 5 s (hoy tarda 33 s) y baja menos de 200 KB (hoy, 7,6 MB).
2. Ninguna foto queda en "Sin vista previa" por no tener miniatura: en ese
   caso se muestra la foto completa.
3. El visor sigue mostrando la foto en resolución completa.
4. El `thumbnailLink` (y cualquier URL de Google) no aparece en ninguna
   respuesta ni en los logs. Los errores se registran con un mensaje fijo,
   sin el texto de la excepción.
5. `getMiniaturas` exige sesión: sin sesión da 401. Para comprobar que el
   test muerde, se agrega `getMiniaturas` a `publicActions` y el test tiene
   que fallar.
6. `probarPERF004()` pasa contra el proyecto de test y
   `node check-sintaxis.js` también pasa.
> **Depende de:** [REQ-PERF-003](REQ-PERF-003.md) (diagnóstico de por qué el enfoque de miniaturas de Drive no sirve).

## Objetivo

Franco pidió que las fotos de la card de "fotos recientes" del dashboard
carguen más rápido. REQ-PERF-003 resolvió que la card no aparezca de golpe,
pero no la velocidad de carga en sí: la card sigue bajando el binario
completo de cada foto desde Drive (varios cientos de KB en base64) para
mostrarla en un círculo de 38px.

El enfoque intentado en REQ-PERF-003 (`DriveApp.getThumbnail()`) no funciona
para imágenes subidas vía Apps Script — devuelve `null` de forma consistente
para fotos de tareas, confirmado contra el proyecto de test con una imagen
realista (no es un problema de timing ni de permisos). Ver el diagnóstico
completo en REQ-PERF-003, sección "Alcance — fuera de este REQ".

## Enfoque propuesto (a validar con el equipo antes de implementar)

**Actualización 2026-09-16 — diagnóstico de `thumbnailLink` (ver también
[backlog.md, BL-011](../backlog.md)):** se probó,
contra el proyecto de test, el campo `thumbnailLink` de la API de Drive v3
(Servicio Avanzado) — a diferencia de `DriveApp.getThumbnail()` (descartado
en REQ-PERF-003, no sirve para fotos subidas), `thumbnailLink` **sí
funciona**: disponible de inmediato tras subir (`hasThumbnail:true` sin
esperar), y liviano — 594 bytes a 220px vs. 111.584 bytes del original
(~188x más chico). Probado también a 400px (1.103B), 800px (2.653B) y
1600px (= original, sin upscale). Corrido dos veces, mismo resultado.
Aplica solo a la card del dashboard (necesita el proxy de Apps Script para
no exponer la URL de Google al cliente, mismo criterio de privacidad de
REQ-MEDIA-001) — no al carrusel a pantalla completa, que necesita
resolución completa. Este enfoque es mucho menos invasivo que el de abajo:
no toca el flujo de subida ni agrega columnas a `Archivos`, solo cambia
cómo `getRecentPlanPhotos` sirve la miniatura. Falta: Bob lo implementa con
fallback al blob completo si Drive no devuelve `thumbnailLink` (fotos
viejas o error), y Julia confirma el criterio de privacidad del proxy.
**Candidato preferido sobre el enfoque original de abajo, a confirmar con
Franco antes de implementar.**

### Enfoque original (client-side, más invasivo — supersedido si el de arriba se aprueba)

Generar la miniatura del lado del cliente, en el mismo momento en que ya se
comprime la foto para subirla (`comprimirImagenPlan()`,
[index.html:2867](../../index.html:2867) redimensiona a máx. 1800px vía
canvas antes de mandarla al backend). Se le sumaría ahí mismo una segunda
pasada con un tamaño mucho menor (ej. 100-150px de lado, JPEG de baja
calidad — apuntando a pocos KB) y esa miniatura se guardaría como texto
(base64) en una columna nueva de la hoja `Archivos`, para que
`getRecentPlanPhotos` (o `getArchivos`) la devuelva directo de la hoja **sin
tocar Drive en absoluto** para el caso común del dashboard.

Esto es más invasivo que REQ-PERF-003: toca el flujo de subida completo
(cliente → Bob → hoja), no solo la lectura.

## Por qué no se implementó ya

Necesita, antes de tocar código:

1. **Gary** defina la columna nueva de `Archivos`: nombre, si guarda solo el
   base64 o también dimensiones/mimeType de la miniatura, y qué pasa con las
   fotos ya subidas antes de este REQ que no van a tener esa columna
   poblada (fallback esperable: comportarse como hoy, blob completo desde
   Drive, para esas filas viejas — sin necesidad de backfill retroactivo,
   mismo criterio de "no hace falta migrar lo viejo" que ya usó
   REQ-PERF-002 para el cache de `localStorage`).
2. Confirmar el límite de tamaño de celda de Google Sheets (50.000
   caracteres) deja margen cómodo para una miniatura de 100-150px en JPEG de
   baja calidad — a validar con una prueba real antes de comprometerse al
   enfoque, mismo criterio de "no asumir, medir" que dejó en evidencia
   REQ-PERF-003.
3. Decidir si esto amerita, además, revisar el flujo de `uploadPlanPhotos`
   para que una foto grande + su miniatura viajen en la misma subida sin
   duplicar el costo de comprimir dos veces del lado del cliente.

## Alcance — a definir cuando se retome

No tiene todavía Objetivo detallado, criterios de aceptación ni riesgos —
eso se escribe recién cuando Paul lo formalice para implementación, con
Gary ya habiendo definido el esquema.

## Notas de la revisión de seguridad (2026-09-27, A/B de BL-020)

Salieron al probar `hjulia-revision-cambio` con este REQ como escenario.
Verificadas a mano; son cuidados para cuando se implemente, no hallazgos:

- `appsscript.json` del repo tiene `"dependencies": {}`: el servicio
  avanzado Drive (necesario para `thumbnailLink`) no está declarado. Hay
  que sumarlo al manifiesto, y el manifiesto viaja en cada `clasp push`
  (test y prod).
- Hipótesis: si el handler nuevo copia el patrón de log de `getArchivo`
  (`Logger.log(... + err.toString())`, `Code.gs:1445`), un error de
  `UrlFetchApp` podría llevar el `thumbnailLink` a los logs. Loguear un
  mensaje fijo, sin el texto de la excepción. Se confirma forzando un
  error de fetch en test y leyendo `clasp logs --json`.
- Un test de bloqueo contra el código viejo no muerde (la acción no
  existe, da 400): el mutante es poner `getMiniatura` en `publicActions`.

## Cómo lo resuelven otros (2026-09-27)

Ver `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`. La documentación de Drive confirma el enfoque: `thumbnailLink` dura unas horas, necesita credenciales y no está pensado para usarse directo en la web, así que el proxy del servidor es lo recomendado. Para invalidar el caché se puede usar la versión de la miniatura.

## Confirmación de Franco (2026-09-28, ~15:15, versión 1.2.2)

En la computadora, con una wifi parecida a la de su casa: al abrir tareas con
fotos, las miniaturas de "Ya subidas" ya estaban listas, sin mostrar
"Cargando". Criterio 1 cumplido.
