# Fecha obligatoria en las fotos: cómo lo resuelven otros (2026-10-07)

Pedido de Franco: que toda foto tenga fecha antes de subirse, "de la misma
manera que tira error cuando se quiere guardar una tarea sin categoría". Su
idea: que no deje subir hasta que todas tengan fecha. Sale de la charla
sobre BL-046 (orden de "Por subir" y numeración en Drive).

## Cómo está hoy

- Al elegir fotos, la app lee el día y la hora de captura del EXIF
  (REQ-MEDIA-005, REQ-MEDIA-008). Si no hay (capturas de pantalla, fotos
  reenviadas por WhatsApp, PNG), la fila dice "Sin fecha de captura · Queda
  con el día de subida" y se puede corregir con el botón de calendario.
- El servidor (`resolverFechaFoto`, `Code.gs`) acepta la fecha si es un día
  real, no futuro y desde 1990; si no viene o no sirve, guarda el día de
  subida con origen `subida`.
- La categoría obligatoria (REQ-PLAN-002, 1.7.0): el botón Guardar sigue
  habilitado; al tocarlo sin categoría aparece "Elegí una categoría para
  guardar." debajo del campo, el campo se marca en rojo
  (`aria-invalid`) y el servidor también rechaza.

## Qué hacen otros

- **Galerías grandes (Google Photos, Immich): no frenan, completan
  solas.** Sin fecha en el EXIF, Google Photos usa la fecha de
  modificación del archivo; Immich usa la fecha del archivo y, en una
  versión reciente, la más vieja entre creación y modificación. Después se
  corrige a mano ("Editar fecha y hora", también de a varias). Es lo que
  hace hoy la app con el día de subida. Para ellas la fecha es para ordenar
  una biblioteca enorme; frenar la subida de miles de fotos no tiene
  sentido.
- **Formularios de gobierno y diseño de servicios (GOV.UK, Scottish
  Government, CMS de EE. UU.): un dato obligatorio se valida al enviar,
  con el botón habilitado.** GOV.UK: los botones de enviar "nunca se
  deshabilitan"; si falta algo, al enviar aparece un resumen de errores
  arriba, el foco va ahí, y cada campo con problema lleva su mensaje. No se
  valida mientras se escribe.
- **Por qué no deshabilitar el botón (Smashing Magazine, Adrian Roselli y
  otros):** un botón gris no dice qué falta; quien no ve toda la lista
  (en el teléfono, con 16 fotos) no sabe cuál lo frena; y un botón
  deshabilitado no recibe el foco con el teclado. Se acepta deshabilitar
  solo cuando la acción no está disponible por un rato y el motivo es
  obvio (por ejemplo, mientras sube).
- **Cargar el dato que falta de a muchas:** Google Photos permite cambiar
  la fecha de varias fotos juntas. Con muchas fotos sin fecha (un álbum de
  WhatsApp), ir una por una es el costo principal.

## Qué no se pudo confirmar

- No revisé la documentación oficial de Google Photos sobre la fecha de
  modificación: sale de foros y guías de terceros. Es coherente con lo que
  documenta Immich.
- La fecha de modificación del archivo (`File.lastModified` en el
  navegador) de una foto de WhatsApp es la del día en que se bajó, no la
  de la foto: por eso no se propone usarla como valor sin preguntar.

## Qué se toma para Nuestros Planes

Acá no hay miles de fotos: son las de una tarea, y Franco quiere que la
fecha sea cierta. Por eso no se copia la galería (completar sola) sino el
patrón de formulario, que es el mismo de la categoría:

1. **Obligatoria, validada al tocar "Subir"; el botón no se deshabilita.**
   Si alguna no tiene fecha, no sube ninguna; cada fila sin fecha se marca
   en rojo con "Poné la fecha de esta foto", arriba del botón un resumen
   ("2 fotos no tienen fecha") y el foco va a la primera. Es la idea de
   Franco ("que no deje subir"), con la forma que recomiendan GOV.UK y que
   ya usa la categoría.
2. **Ayuda para muchas a la vez:** un botón en el resumen, "Ponerles la
   fecha de la tarea (12 oct.)", que completa todas las que faltan con el
   día de la tarea (casi siempre es ese) y quedan como fecha "puesta a
   mano". Si la tarea es de varios días o no tiene fecha, el botón no
   aparece y se ponen de a una.
3. **El servidor también la exige** (todo control real vive en `Code.gs`):
   una foto sin fecha válida se rechaza en vez de guardarse con el día de
   subida. Orden de deploy: primero el front, después el servidor, así un
   front viejo en caché no queda subiendo fotos que el servidor rechaza sin
   explicar.
4. **Las fotos ya subidas no cambian:** las que quedaron con el día de
   subida se pueden corregir desde el visor (REQ-MEDIA-006).
5. **Con todas fechadas, "Por subir" se ordena por día y hora**, y así la
   numeración en Drive coincide con el orden de la app (pregunta abierta de
   BL-046). Las que se fecharon a mano no tienen hora: van después de las
   que sí, en el orden en que se eligieron.

## Fuentes

- Labnol, cambiar la fecha en Google Photos: https://labnol.org/internet/change-google-photos-date-time/29008
- Foro de rclone, Google Photos y la fecha sin EXIF: https://forum.rclone.org/t/google-photos-not-listing-photos-by-date-correctly/35175
- Immich, FAQ (fecha de la foto y respaldo): https://ark.sudovanilla.org/Infrastructure/immich/src/commit/9f7bf36786017aa916af74202636434fc2eca166/docs/docs/FAQ.md
- GOV.UK Design System, validación: https://design-system.service.gov.uk/patterns/validation
- Scottish Government Design System, resumen de errores: https://designsystem.gov.scot/components/error-summary
- CMS Design System, validación de errores: https://design.cms.gov/patterns/Forms/error-validation/
- Smashing Magazine, problemas de los botones deshabilitados: https://smashingmagazine.com/2021/08/frustrating-design-patterns-disabled-buttons/
- Adrian Roselli, no deshabilitar controles: https://adrianroselli.com/2024/02/dont-disable-form-controls.html
