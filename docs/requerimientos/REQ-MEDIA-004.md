# REQ-MEDIA-004 — Ver qué fotos ya tiene una tarea y en qué estado está cada subida

> **Estado:** PROPUESTO (2026-09-27). Sin diseñar.
> **Nivel:** cambio de fondo (endpoint nuevo + cambio en `getPlanes` + front).
> **Dueño técnico:** Bob (servidor) + Jay (front) · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Depende de:** nada. Conviene hacerlo antes de REQ-PLAN-001, que usa el mismo conteo.
> **Datos sensibles:** sí, son fotos personales (Ley 25.326). Mismo criterio que REQ-MEDIA-001: nunca una URL de Drive al cliente, todo pasa por `getArchivo`/`getArchivos` con sesión.
> MEDIA-003 queda reservado para "recuerdos" (BL-007).

## Problema

Dos cosas que Franco vio el 2026-09-27:

1. **No se ve lo que ya se subió.** Al abrir una tarea que ya tiene fotos no
   aparece ninguna foto ni un indicio de que se subieron. El modal solo
   muestra la selección nueva (`resetPlanFotosSeleccion()`), y no existe un
   endpoint que liste las fotos de una tarea (solo están las recientes del
   carrusel).
2. **No se entiende en qué estado está cada subida.** Hoy la foto seleccionada
   tiene un spinner mientras sube y nada más. No queda claro qué está en
   espera, qué se está subiendo, qué ya quedó guardado y qué falló.

## Alcance

**Entra:**

- **Conteo en la tarjeta de la tarea.** Si tiene fotos, un indicador chico:
  "3 fotos", "1 foto". Sin fotos, no se muestra nada (nunca "0 fotos"). Con
  videos (cuando existan, ver BL-023) se muestran juntos y sin ceros: "2 fotos
  · 1 video", "1 video".
- **Fotos ya subidas en el modal de la tarea.** Miniaturas de lo que ya está
  subido, separadas de lo que se está por subir, con quién la subió (avatar o
  inicial) y la fecha. Tocar una la abre en grande (el visor del carrusel ya
  existe).
- **Pills de estado por foto en la subida**, siempre con texto y no solo con
  color:
  - *Lista para subir*: seleccionada, sin enviar todavía.
  - *Subiendo*: en curso.
  - *Subida*: guardada en el servidor; pasa a "ya subidas".
  - *Error*: no se subió, con el motivo en palabras (REQ-UX-001) y la opción
    de reintentar o sacarla.
- Resumen de la tanda cuando termina: "Se subieron 3 de 4. 1 no se pudo subir:
  el formato no es compatible".

**No entra:**
- Borrar, editar o reordenar una foto ya subida (BL-009, BL-010).
- Videos (BL-023). El conteo se deja preparado para que no haya que rehacerlo.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Una tarea con 3 fotos activas muestra "3 fotos" en su tarjeta. Una con 1 muestra "1 foto". Una sin fotos no muestra indicador. |
| 2 | Las fotos con `estado` distinto de `activo` no cuentan. |
| 3 | Al abrir el modal de una tarea con fotos, se ven sus miniaturas, con quién subió cada una y la fecha, sin subir nada nuevo. |
| 4 | Lo mismo en una tarea `completado` que se vuelve a `pendiente` (el caso de Franco). |
| 5 | Al seleccionar 3 fotos, cada una muestra la pill "Lista para subir". Al confirmar, pasan a "Subiendo" y después a "Subida" o "Error" una por una. |
| 6 | Una foto con error muestra el motivo en palabras y permite reintentarla sin volver a elegir las demás. |
| 7 | Las pills se leen igual en tema oscuro, a 375 px de ancho, y tienen texto (no dependen solo del color). |
| 8 | Ninguna miniatura se sirve por URL de Drive: todas vienen por el proxy con sesión. El endpoint nuevo devuelve 401 sin sesión y no lista fotos de otra tarea (test `probarXXX()`). |
| 9 | Sin regresión: `probarMEDIA001` y `probarMEDIA002` en verde. |

## Verificación del 2026-09-27: los dos suben a la misma carpeta

Franco pidió confirmar que, si los dos suben fotos a la misma tarea, van a la
misma carpeta de Drive. **Sí.**

- En el código, la carpeta se crea con la primera foto (sea de quien sea) y su
  ID queda guardado en `Planes.carpeta_fotos_drive_id`, dentro de un
  `LockService`. Las siguientes fotos usan ese ID. La Web App corre como el
  dueño del script (`executeAs: USER_DEPLOYING`), así que Noelia no necesita
  permisos propios sobre la carpeta.
- En las pruebas, `probarMEDIA002` corrida contra test el 2026-09-27 dio
  **43/43 APTO**. Los casos C4 suben la primera foto como `usr_fran` y la
  segunda como `usr_noe`: la carpeta no cambia, el archivo queda `0002` y hay
  exactamente 2 archivos.

## Cómo lo resuelven otros (2026-09-27)

Ver `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`. Suma al alcance: un error de red pasajero se reintenta solo una vez, sin mostrarlo, antes de pasar la foto a *Error*. Reintentar nunca vuelve a subir las fotos que ya están *Subida*.
