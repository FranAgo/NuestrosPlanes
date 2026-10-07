# REQ-MEDIA-009 — Toda foto se sube con fecha

> **Estado:** HECHO (2026-10-07)
> **Historia:** PROPUESTO (2026-10-07), pedido de Franco al revisar BL-046. Franco eligió la variante B del mockup (marcar las que faltan + "Ponerles la fecha de la tarea") y pidió que las fotos que ya traen fecha no se reconfirmen. EN DESARROLLO el 2026-10-07. HECHO el 2026-10-07: implementado y verificado en test (ver Verificación). Investigación: `docs/investigacion/2026-10-07-fecha-obligatoria-fotos.md`.
> **Versión:** 1.10.0
> **Nivel:** cambio de fondo (regla de negocio nueva en el servidor + front).
> **Dueño técnico:** Jay (front) + Bob (servidor) · **DBA:** Gary · **AppSec:** Julia · **Infra:** Roy · **QA:** Duck · **PM:** Paul

## Problema

Una foto sin fecha de captura (captura de pantalla, foto reenviada por
WhatsApp, PNG) hoy se sube con "el día de subida" (`resolverFechaFoto`,
`Code.gs`; fila "Sin fecha de captura · Queda con el día de subida"). Esa
fecha casi nunca es la de la foto, y desde 1.9.0 la app ordena por día y
hora de captura (DEC-023): una foto de hace un mes queda entre las de hoy.

Franco (2026-10-07): "que sea obligatorio poner fecha a las fotos, de la
misma manera que tira error cuando se quiere guardar una tarea sin
categoría"; "si ya se trae fecha de la imagen, no hace falta que
reconfirme. Eso traería fricción".

## Qué se pide

1. **Sin fecha no se sube.** Al tocar "Subir", si alguna foto de "Por
   subir" no tiene fecha, no sube ninguna. Cada una sin fecha se marca en
   rojo con "Poné la fecha de esta foto", arriba aparece un resumen ("2
   fotos no tienen fecha") y el foco va a la primera. El botón no se
   deshabilita (mismo patrón que la categoría, REQ-PLAN-002).
2. **Las que traen fecha no se tocan.** Una foto con fecha de captura en el
   EXIF pasa directo, sin pedir confirmación. Si todas la traen, subir es
   igual que hoy.
3. **Completar de una:** en el resumen, "Ponerles la fecha de la tarea (12
   oct.)" pone el día de la tarea a todas las que faltan (y solo a esas),
   como fecha puesta a mano. No aparece si la tarea no tiene fecha, si es
   de varios días o si su fecha es futura.
4. **El servidor también la exige:** una foto sin fecha válida se rechaza
   (error en esa foto, las demás siguen), en vez de guardarse con el día de
   subida.
5. **Orden en Drive = orden de la app** (cierra la pregunta de BL-046): al
   subir, las fotos se mandan ordenadas por día, hora (las que tienen
   primero) y orden de selección, así la numeración de Drive sigue la
   fecha. La lista "Por subir" no se reordena mientras se edita.

## Aportes

- **Bob (contratos):** `uploadPlanPhotos` no cambia de forma. Cambia la
  regla: `fechaContenido` pasa a ser obligatoria por archivo. Si falta o no
  es válida (día real, no futuro, desde 1990), ese archivo va a `errores`
  con "Falta la fecha de la foto." y se descarta antes de reservar números
  (las válidas siguen correlativas, REQ-MEDIA-002 C10). `fechaOrigen` solo
  puede ser `captura` o `manual`. `resolverFechaFoto` devuelve `null` en
  vez del día de subida. Las ~20 subidas de `Tests.gs` que no mandan fecha
  se actualizan.
- **Gary (datos):** sin columnas nuevas. Las filas viejas con
  `fecha_origen = 'subida'` quedan (las leen `getFotosPlan`, el visor y
  `getRecuerdos`) y se pueden corregir desde el visor (REQ-MEDIA-006). Las
  nuevas solo llevan `captura` o `manual`. Las fechadas a mano no tienen
  hora (`hora_contenido` vacío).
- **Julia (seguridad):** sin superficie nueva; la regla vive en el
  servidor. El mensaje no muestra datos internos.
- **Roy (deploy):** primero el front (push a `main`), después el servidor
  (`clasp push` + redeploy). Si un front viejo en caché sube una foto sin
  fecha, la ve con su error en la fila. Sale con 1.9.1 (BL-046), que no se
  publicó.
- **Jay (front):** el error por fila y el resumen reutilizan los estilos de
  la categoría (`--red-line`, `.campo-error`). El resumen va en
  `#plan-fotos-resumen` (ya es `aria-live`). Una fila deja de estar en
  error al ponerle fecha.

## Criterios de aceptación

1. Con todas las fotos con fecha de captura, "Subir" abre la confirmación
   como hoy; no aparece ningún aviso.
2. Con alguna sin fecha, "Subir" no abre la confirmación ni manda nada: las
   filas sin fecha quedan en rojo con "Poné la fecha de esta foto", el
   resumen dice cuántas faltan y el foco va al calendario de la primera.
3. Al poner la fecha a una fila, esa fila deja de estar en rojo y el
   resumen se actualiza; con todas fechadas, el resumen desaparece.
4. "Ponerles la fecha de la tarea" completa solo las que faltan, como
   "Fecha puesta a mano", y no cambia las que traían fecha de captura.
5. El botón no aparece en una tarea sin fecha, de varios días o con fecha
   futura.
6. Servidor: un archivo sin `fechaContenido`, con fecha futura, anterior a
   1990, con formato inválido o día inexistente va a `errores` con "Falta
   la fecha de la foto." y no consume número; los demás del pedido suben
   correlativos.
7. Servidor: `fechaOrigen` distinto de `manual` se guarda como `captura`.
8. Las fotos se mandan ordenadas por día, hora y selección: en Drive la
   numeración sigue ese orden.
9. A 375 y 1366, consola limpia, teclado: el resumen se lee (`aria-live`),
   el foco llega al calendario.

## Verificación (2026-10-07, proyecto de test y front local, sin pedidos a prod)

- Servidor: `probarMEDIA005` reescrito para la regla nueva (las 5 fotos sin
  fecha válida van a `errores` con "Falta la fecha de la foto." y no gastan
  número; la de origen raro queda `captura`). Con el `Code.gs` de 1.9.0
  da 3 FAIL (subía las 8); con el nuevo 55/55 tres veces. `probarMEDIA008`
  ajustado (H3 y H5 ahora se rechazan) 33/33. Las demás subidas de
  `Tests.gs` mandan la fecha del día, como el front.
- Regresión en test: DATA002 70/70, BUGLOGIN001B 38/38, MEDIA001 22/22,
  MEDIA002 43/43, BUGCARGA001 9/9, BL015 12/12, BUGFECHA001 21/21, PLAN001
  44/44, MEDIA004 21/21, MEDIA003 36/36, PERF004 22/22, PLAN002 26/26,
  PLAN003 39/39, Parche181 43/43.
- Front en 127.0.0.1 con `fetch` simulado y `leerFechaCaptura` reemplazada
  por fechas fijas: criterios 1 a 5 y 8 (con clics y teclas reales: el foco
  va al calendario vacío de la primera; tocar "Subir" de nuevo con el
  calendario vacío no pone el día de hoy; la fecha tecleada saca la fila
  del rojo; el botón de la tarea completa solo las que faltan; orden de
  envío 03/10 sin hora, 05/10 20:00, 05/10 21:10, 05/10 sin hora). Criterio
  9: a 375 y 1366 sin desbordes medidos, consola limpia, ningún pedido a
  `script.google`. Captura a 1024; a 375 y 1366 no se pudo capturar
  (ventana minimizada), se midió.
