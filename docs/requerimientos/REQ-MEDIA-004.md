# REQ-MEDIA-004 — Ver qué fotos ya tiene una tarea y en qué estado está cada subida

> **Estado:** CERRADO (2026-10-05)
> **Historia:** CERRADO (2026-10-05, Franco confirmó que lo usan y anda bien). Antes: en producción desde el 2026-09-28. Servidor en la Web App @26 y front en `main` (commit `3d1f2a0`). Franco eligió la variante A del mockup (DEC-007). *(Estado corregido el 2026-09-28: el doc seguía diciendo "falta deploy y push".)*
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

## Pedido de Franco (2026-09-27): confirmar antes de la subida final

Franco propone que, con las fotos ya elegidas y antes de subirlas, la app
pregunte si está seguro de avanzar. Hoy ya hay dos pasos: "Agregar foto"
muestra la vista previa y "Subir fotos" las manda. Pero una vez subida, una
foto **no se puede borrar desde la app** (BL-009). Eso hace que la subida
sea irreversible, que es justo el caso en que `hjay-identidad-visual` pide
confirmar ("confirmar lo destructivo; después, que se pueda deshacer").

Opciones a mostrar en mockup antes de decidir (pedido de Franco: ver el
mockup y después elegir):
- **A. Confirmación en un paso aparte:** "¿Subir 3 fotos a *Cena de fin de
  mes*? Después no se pueden borrar desde la app", con las miniaturas.
- **B. El botón ya dice todo:** "Subir 3 fotos", con las pills "Lista para
  subir", sin un modal extra. Menos fricción, pero no avisa que no se puede
  deshacer.
- **C. Sin confirmación, pero con deshacer:** unos segundos para cancelar
  después de tocar "Subir", o implementar BL-009 (borrar una foto). Quita la
  necesidad de confirmar.

Relacionado: si se cierra el modal con fotos elegidas y sin subir, hoy se
pierden sin aviso (mismo principio: "cerrar un formulario con datos sin
guardar pregunta antes de descartar"). Entra en el alcance de este REQ.

## Diseño elegido (2026-09-28, DEC-007)

Franco vio el mockup interactivo de Jay (conteo en la tarjeta, "Ya subidas" y
"Por subir" en el modal, tres variantes de confirmación) y eligió la **A**:
al tocar "Subir N fotos" aparece un paso aparte con las miniaturas, "¿Subir 3
fotos a *título*?" y "Después no se pueden borrar desde la app", con "Volver"
y "Subir 3 fotos".

Lo demás del mockup, que va en cualquier variante:
- Tarjeta: "3 fotos" / "1 foto" en la meta, con el ícono de cámara. Sin
  fotos, nada.
- Modal: bloque "Ya subidas" (miniaturas con la inicial de quién la subió y
  la fecha; tocar una la abre en el visor del carrusel) y bloque "Por subir"
  (una fila por foto con su pill, el motivo del error en palabras,
  "Reintentar" y "Sacar").
- Se suben de a una; un error de red o 5xx se reintenta solo una vez antes
  de pasar a *Error*. "Reintentar" sube solo esa foto.
- Resumen al terminar: "Se subieron las 3 fotos." / "Se subieron 2 de 3. 1
  no se pudo subir: *motivo*".
- Cerrar el modal (X, Cancelar, click afuera) con fotos elegidas sin subir
  pregunta "¿Descartar N fotos elegidas sin subir?".

## Plan de implementación (Paul, 2026-09-28)

Orden:
1. **Servidor (Bob).** `getPlanes` suma `fotos` (conteo de adjuntos activos
   por tarea, un solo pase por `Archivos`). Endpoint nuevo `getFotosPlan
   {planId}` → `[{archivoId, subidoPor, fechaContenido, fechaSubida}]`,
   ordenado por subida, sin IDs de Drive, 404 si la tarea no existe o está
   eliminada. `uploadPlanPhotos` no cambia: el front lo llama con una foto
   por pedido.
2. **Tests (Duck).** `probarMEDIA004()` en `Tests.gs`: conteo (activas sí,
   archivadas no, eliminadas no; tarea sin fotos = 0), `getFotosPlan` (solo
   las de esa tarea, orden, sin `drive_file_id`, 404), 401 sin sesión por
   `doPost`. Tiene que fallar contra el `Code.gs` actual. Regresión:
   MEDIA001, MEDIA002, PLAN001, DATA002.
3. **Front (Jay).** Conteo en la tarjeta; "Ya subidas" con `getFotosPlan` +
   `getArchivos` (misma caché de imágenes); "Por subir" con pills y subida de
   a una; paso de confirmación A; aviso al cerrar con fotos sin subir;
   refrescar el conteo al terminar. Verificación en navegador con el front
   contra el Web App de test (`simPLAN001`-style), 375/600/601/1366.
4. **Deploy (Roy)**, cada paso con OK de Franco: servidor primero (el campo
   y el endpoint nuevos no rompen el front viejo), después el front.

Contratos que no se rompen (Bob): `getPlanes` solo suma un campo;
`uploadPlanPhotos`, `getArchivos` y `getRecentPlanPhotos` quedan iguales.
Hojas (Gary): sin columnas nuevas, no hace falta `setupSheets()`.
Seguridad (Julia): `getFotosPlan` pasa por la sesión de `doPost` como el
resto; no devuelve IDs de Drive ni emails; cualquiera de los dos puede ver
las fotos de cualquier tarea (igual que hoy en el carrusel).

## Implementación (2026-09-28)

- **Servidor (Bob):** `getPlanes` suma `fotos` por tarea (`conteoFotosPorPlan()`,
  un pase por `Archivos`). Endpoint nuevo `getFotosPlan {planId}` →
  `{fotos: [{archivoId, subidoPor, fechaContenido, fechaSubida}]}`, la más
  vieja primero, sin IDs de Drive; 400 sin `planId`, 404 si la tarea no
  existe o está eliminada; pasa por la sesión de `doPost`.
- **Tests (Duck):** `probarMEDIA004` 21/21 (0/5 contra el `Code.gs` de
  `HEAD`: sin `fotos` y sin el endpoint). Sin regresión: PLAN001 44/44,
  MEDIA002 43/43, MEDIA001 22/22, DATA002 70/70.
- **Front (Jay):** conteo en la tarjeta; en el modal, "Ya subidas" (miniaturas
  de a una por `getArchivo`, inicial o avatar de quién la subió, fecha; tocar
  una la abre en el visor del carrusel con el título de la tarea) y "Por
  subir" (fila por foto con pill, motivo del error en su propia línea,
  "Reintentar" y "Sacar"); paso de confirmación en un modal aparte
  (`#modal-subir-fotos`); subida de a una; resumen solo con el conteo;
  cerrar (X, Cancelar o después de Guardar) con fotos sin subir pregunta por
  `#modal-confirm` ("Descartar y cerrar").
- **Desvío del alcance (Paul):** no hay reintento automático. El REQ pedía
  reintentar una vez sola ante un error de red, pero subir es una escritura:
  si la foto llegó y se perdió la respuesta, el reintento la duplica, y no se
  puede borrar desde la app (convenciones-tecnicas, red y archivos: "las
  escrituras no [reintentan], porque duplican"). Ante un corte, la fila dice
  "No hubo respuesta. Puede que haya llegado igual: fijate en 'Ya subidas'
  antes de reintentar", y "Ya subidas" se relee sola al terminar la tanda.
- **Verificado en navegador** (front local en 127.0.0.1 contra el Web App de
  test @9, sesiones de prueba con `simPLAN001_preparar`): conteo 1 → 3 → 4
  en la tarjeta; "Ya subidas" con miniatura fallida ("Sin vista previa");
  3 fotos "Lista para subir"; confirmación con título, miniaturas y aviso,
  "Volver" sin pedidos; subida con teclado (Enter, Enter); traza de estados
  `error,subiendo,espera → error,subida,subiendo → error,subida,subida` con
  un corte simulado; el servidor recibió solo las 2 que salieron;
  "Reintentar" sube solo esa y sin volver a confirmar; cerrar con 1 foto con
  error pregunta, "Cancelar" la conserva y "Descartar y cerrar" cierra;
  visor con el título de la tarea; 375 px sin desborde; consola sin errores.
  Duck encontró que "Reintentar" seguía activo durante otra tanda (dos
  subidas en paralelo): se oculta mientras hay una en curso.
- **Sin verificar:** con fotos reales de un teléfono y la sesión real (se ve
  después del deploy). En test quedaron los archivos de Drive de las fotos
  de prueba (las filas de `Archivos` se borraron con `simPLAN001_limpiar`).

## Hallazgo en producción (2026-09-28): miniaturas en "Sin vista previa"

Franco abrió una tarea con 16 fotos y 10 quedaron en "Sin vista previa". Al
tocarlas, el visor las mostraba bien, pero la miniatura no se actualizaba.
`clasp logs` no tenía ningún error de `getArchivo` de la Web App en ese
momento: los pedidos no fallaron en el servidor. Las que se veían eran casi
todas las recién subidas desde ese dispositivo, que ya estaban en caché.

Causas en el código:
1. `cargarFotosYaSubidas` disparaba un `getArchivo` por foto, todos a la vez
   (16 simultáneos), y el que fallaba quedaba como fallido sin reintento.
2. Abrir el visor llama a `abortFetchesExcepto`, que cancela las miniaturas que
   siguen en vuelo, y esas se marcaban como fallidas.
3. Cuando el visor traía la foto, la miniatura no se volvía a pintar.

Arreglo (solo front, `index.html`): `cargarMiniaturasYa` pide de a 3 a la vez
y reintenta una vez cada una, porque es una lectura. `miniaturaYaLlego` repinta
la miniatura cuando la foto llega por el visor o por su prefetch. Verificado
con `fetch` simulado: 16 fotos, la mitad falla en el primer intento y el visor
se abre en medio de la carga. Resultado: 16/16 con imagen y como máximo 4
pedidos a la vez (3 miniaturas y el visor). Una que falla dos veces queda en
"Sin vista previa" y pasa a verse apenas se abre en el visor.
