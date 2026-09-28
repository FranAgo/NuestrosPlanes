# REQ-MEDIA-005 — Cada foto lleva el día en que se sacó, y las tareas pueden durar varios días

> **Estado:** DEFINIDO (2026-09-27). Franco aprobó A y B, incluida la estructura de Drive (DEC-005).
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
