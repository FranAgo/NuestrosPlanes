# REQ-MEDIA-005 — Cada foto lleva el día en que se sacó, y las tareas pueden durar varios días

> **Estado:** CERRADO (2026-10-05)
> **Historia:** CERRADO (2026-10-05, Franco confirmó que lo usan y anda bien). Antes: en producción desde el 2026-09-28. Servidor en la Web App @27 (con `setupSheets` corrido en prod; rollback `-V 26`) y front con el push a `main` de esta sesión. Franco eligió formulario A y corrección A en el prototipo (DEC-008).
> **Origen:** BL-025
> **Nivel:** cambio de fondo (modelo de datos + servidor + front).
> **Dueño técnico:** Jay (leer la fecha en el navegador, agrupar por día) + Bob (servidor) · **DBA:** Gary · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Depende de:** BUG-FECHA-001 (el respaldo "día de subida" tiene que estar en hora Argentina) y REQ-MEDIA-004 (el modal ya muestra las fotos subidas).
> **Datos sensibles:** sí. El EXIF de una foto puede traer la ubicación GPS: se lee **solo** la fecha y hora de captura y no se guarda ningún otro dato del EXIF.
> Sale de BL-025. Investigación en `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`.

## Problema

Hoy la fecha de una foto es el día en que se subió. Si sacan fotos el sábado
y las suben el lunes, quedan como del lunes. Además, una tarea tiene un solo
día, y hay tareas que duran más (un viaje, un fin de semana).

## A. Fecha de cada foto (aprobado por Franco, 2026-09-27)

1. La foto lleva **el día en que se sacó**, leído del dato de captura que
   guarda el celular (EXIF `DateTimeOriginal`).
2. Si la foto no trae ese dato (el iPhone a veces lo saca al compartir, o es
   una captura de pantalla), lleva el día en que se subió, en hora Argentina.
3. En los dos casos se puede corregir a mano desde la app.
4. La fecha programada **no** se usa como fecha de la foto.

Detalle técnico que no se puede perder: la app recomprime cada foto con
`canvas` antes de subirla (`index.html:3191`), y eso borra el EXIF. La fecha
se lee en el navegador **antes** de comprimir y viaja al servidor como un
campo aparte (`fechaContenido`). El servidor la valida (formato
`AAAA-MM-DD`, que no sea futura) y, si falta o no es válida, usa el día de
subida.

## B. Tareas de varios días

1. La tarea tiene un **día de fin opcional**. Sin día de fin, la tarea es de un
   solo día, como hoy. La fecha programada pasa a ser el día de inicio.
2. Al abrir la tarea, las fotos se ven agrupadas y ordenadas por el día en que
   se sacaron: "Día 1 · sáb 27/09", "Día 2 · dom 28/09". En una tarea de un
   solo día no se muestra el encabezado de día.
3. Una foto sacada fuera del rango de la tarea (antes del inicio o después del
   fin) se muestra igual, en su día, sin número de "Día N". No se rechaza.
4. La fecha de vencimiento no cambia: sigue siendo la fecha límite para
   programar la tarea.

### Drive (confirmado por Franco el 2026-09-27, DEC-005)

**Todas las fotos juntas en la carpeta de la tarea, sin subcarpetas por día.**
El día queda en el nombre del archivo, que ya lleva una fecha
(`0001-27-09-2026-titulo.jpg`) y pasa a llevar la fecha de captura en vez de la
de subida. Ordenar la carpeta por nombre en Drive las muestra en el orden en
que se subieron, con el día a la vista.

Por qué no subcarpetas:
- La fecha se puede corregir a mano: con subcarpetas habría que mover el
  archivo en Drive cada vez que alguien la cambia.
- Una tarea de un solo día tendría una subcarpeta sin sentido.
- La app no lee Drive para agrupar (lo hace con la planilla), así que la
  subcarpeta solo le serviría a quien mire Drive directamente.

Si se corrige la fecha de una foto a mano, el nombre del archivo en Drive **no**
se renombra (es cosmético y la app no lo usa).

**Nombre y mes de la carpeta: el día de inicio de la tarea** (`fecha_programada`),
no el de la primera foto subida. Esto cambia la regla de REQ-MEDIA-002 §3. Así
el nombre no depende de quién subió primero ni de cuándo, y un viaje del 30/09
al 02/10 queda en `septiembre/30-09-2026-...` aunque las fotos se suban el
03/10. La carpeta se sigue creando con la primera foto y su nombre queda
congelado: si después se edita la fecha de inicio, la carpeta no se renombra
(igual que hoy con el título). Las carpetas que ya existen no se tocan.

Ejemplo completo (viaje del sáb 10/10 al lun 12/10, fotos de los dos):

```
media/planes-fotos/2026/octubre/10-10-2026-viajes-escapada-a-tandil-a1b2c3/
  0001-10-10-2026-escapada-a-tandil.jpg
  0002-10-10-2026-escapada-a-tandil.jpg
  0003-11-10-2026-escapada-a-tandil.jpg
  0004-11-10-2026-escapada-a-tandil.jpg
  0005-12-10-2026-escapada-a-tandil.jpg
  0006-13-10-2026-escapada-a-tandil.jpg   <- corregida a 12/10 en la app; el nombre no cambia
```

## Modelo de datos (Gary)

- `Planes`: columna nueva `fecha_fin` (solo fecha `AAAA-MM-DD`, vacía = un
  día). Necesita `setupSheets()` en test y prod antes del deploy.
- `Archivos.fecha_contenido`: ya existe; cambia quién la escribe (el cliente
  la propone y el servidor la valida). Columna opcional `fecha_origen`
  (`captura` | `subida` | `manual`) para saber de dónde salió cada fecha. Gary
  decide si vale la pena.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Una foto sacada el sábado y subida el lunes queda con fecha del sábado. |
| 2 | Una foto sin dato de captura queda con el día de subida en hora Argentina. |
| 3 | La fecha de una foto se puede corregir desde la app, y la corrección se ve en el carrusel y en la tarea. |
| 4 | Una fecha futura o con formato inválido que llega del cliente se ignora y se usa el día de subida (test `probarXXX()`). |
| 5 | Del EXIF no se guarda ni se manda al servidor nada más que la fecha: ni GPS, ni modelo del celular. Se verifica en el pedido de red. |
| 6 | Una tarea sin día de fin se crea, se muestra y se completa igual que hoy. |
| 7 | En una tarea de sábado a domingo, las fotos aparecen en "Día 1 · sáb" y "Día 2 · dom", cada una en su día. |
| 8 | Una foto de un día fuera del rango aparece en su día, sin número. |
| 9 | Las fotos de todos los días quedan en la misma carpeta de Drive de la tarea, con la fecha de captura en el nombre. |
| 10 | Sin regresión: `probarMEDIA001` y `probarMEDIA002` en verde. |
| 11 | La primera foto de una tarea con inicio el 30/09, subida el 03/10, crea la carpeta `septiembre/30-09-2026-...`. |
| 12 | Editar la fecha de inicio de una tarea que ya tiene carpeta no la renombra ni la mueve. |

## Diseño elegido (2026-09-28, DEC-008)

Franco probó un prototipo interactivo con variantes y eligió:
- **Formulario A:** "Empieza *" y "Termina" lado a lado (también a 375 px),
  con la ayuda "Dejá 'Termina' vacío si es de un solo día".
- **Corrección A:** en "Por subir" cada foto muestra "Sacada el sáb 26/09",
  "Sin fecha de captura · Queda con el día de subida" o "dom 27/09 · Fecha
  puesta a mano", con un botón de calendario para cambiarla antes de subir.
  Después, en el visor de las fotos de la tarea, "Cambiar fecha" y de dónde
  salió la fecha (cámara, día de subida o corregida a mano).

## Implementación (2026-09-28)

**Gary:** `fecha_origen` entra (`captura` | `subida` | `manual`), al final de
`Archivos`. `setupSheets()` ahora también pasa `ensureColumn` por `Archivos`.
`Planes.fecha_fin` al final de `Planes`; un fin igual al inicio se guarda vacío,
así "un día" tiene una sola forma en la hoja.

**Servidor (`Code.gs`):**
- `createPlan`/`updatePlan` aceptan `fechaFin` (`''` la borra). Se valida con
  `validarFechaFin` contra el inicio que va a quedar: si solo se mueve el
  inicio después del fin guardado, 400 y no se escribe nada.
- `getPlanes` devuelve `fechaFin`; `getFotosPlan`, `fechaOrigen`.
- `uploadPlanPhotos`: cada archivo puede traer `fechaContenido` y
  `fechaOrigen`. `resolverFechaFoto` acepta la fecha si es un día real, no es
  futura en hora Argentina y no es anterior a 1990; el origen solo puede ser
  `captura` o `manual`. Si no, el día de subida con origen `subida`. Cualquier
  otro campo que llegue se ignora.
- La carpeta nueva de una tarea lleva el día de inicio (`fecha_programada`), no
  el de la primera subida (DEC-005).
- Endpoint nuevo `setFechaFoto { archivoId, fecha }`: con sesión, solo fotos de
  tarea activas de una tarea no eliminada, con lock, `fecha_origen = manual`,
  `modificado_por` de la sesión y registro en `Auditoria` (`foto.fecha`, con
  valor anterior y nuevo). No renombra el archivo en Drive.

**Front (`index.html`):**
- `leerFechaCaptura(file)`: lector propio de EXIF (sin librería externa), solo
  JPEG, solo `DateTimeOriginal` y, si falta, `DateTimeDigitized`. Se corre sobre
  el archivo original, antes de `comprimirImagenPlan`. No lee el GPS ni ningún
  otro campo.
- Tarjeta: "Del sáb 10/10 al lun 12/10" en las de varios días; las de un día
  siguen con "Para el DD/MM/AAAA".
- "Ya subidas" ordenadas por día de la foto y agrupadas: "Día N · sáb 10/10",
  y "mar 13/10 · fuera de las fechas" para las que quedan afuera. Se reagrupa
  al cambiar las fechas del formulario, antes de guardar. En una tarea de un
  día sin fotos fuera de fecha no hay encabezados (como antes); si hay alguna
  fuera, las del día llevan su encabezado para no parecer del grupo de arriba.
- Mientras se edita la fecha de una foto en "Por subir", la fila muestra solo
  el campo y "Listo" (Enter confirma, Escape cancela). "Subir fotos" confirma
  una edición abierta antes de preguntar.

**Pruebas:**
- `probarMEDIA005` (Tests.gs), en test: 59/59. Cubre los criterios 1 a 12 del
  lado del servidor, incluidos 401 sin sesión, 404 sobre un avatar y sobre
  una tarea eliminada, y que un campo extra (GPS) no queda en la hoja.
- Regresión en test: MEDIA001 22/22, MEDIA002 43/43, BUGFECHA001 21/21,
  PLAN001 44/44, MEDIA004 21/21, DATA002 70/70, BL015 12/12. A
  `probarMEDIA002` se le cambió la fecha esperada de la carpeta, del día de
  subida al día de inicio de la tarea, como pide DEC-005.
- En el navegador, con `fetch` simulado a 375 px (sin prod): tarjeta, reagrupado
  al cambiar el fin, fin anterior al inicio frenado en el front, `fechaFin` en
  `updatePlan`. Un JPEG armado con EXIF (fecha y bloque GPS) da `2026-09-26`,
  uno sin EXIF y uno con fecha futura dan "sin fecha". El pedido de subida
  lleva solo `fileBase64`, `mimeType`, `fechaContenido` y `fechaOrigen`, y el
  JPEG comprimido empieza con APP0 (sin EXIF): criterio 5. Visor: una fecha
  futura se frena con mensaje, un cambio válido actualiza leyenda, origen y
  grupos. Consola sin errores.

**Fuera de alcance:** "Cambiar fecha" en el carrusel de recuerdos (solo está en
el visor que se abre desde la tarea).
