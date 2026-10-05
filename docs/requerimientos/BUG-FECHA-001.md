# BUG-FECHA-001 — Las fotos subidas después de las 21 h quedan con la fecha del día siguiente

> **Estado:** CERRADO (2026-09-27)
> **Historia:** CERRADO (2026-09-27). En producción (Web App @24) y corrección de datos corrida en prod, las dos con OK de Franco.
> Tests en test: `probarBUGFECHA001` 21/21; sin regresión en MEDIA001 22/22, MEDIA002 43/43 (43 era la línea base, confirmado corriendo el código viejo), DATA002 70/70, BUGLOGIN001B 38/38, BUGCARGA001 9/9, BL015 12/12. Smoke en prod: `getCategorias` con token inválido → 401.
> `formatDate()` se revisó y queda como estaba: en la hoja conviven fechas a medianoche UTC (Planes) y a medianoche de la planilla (texto o edición a mano), y `toISOString()` lee bien las dos con la planilla en hora Argentina. Leerlas en hora Argentina corría las de Planes al día anterior (lo detectó Duck antes de probar).
> **Nivel:** ajuste puntual (DEC-002): fix acotado en `Code.gs`, sin cambio de contrato.
> **Dueño técnico:** Bob · **DBA:** Gary (corrección de filas ya grabadas) · **QA:** Duck · **PM:** Paul
> **Datos sensibles:** no directamente (fechas de fotos personales).

## Reporte

Franco (2026-09-27) subió fotos a una tarea y la completó: quedó con la fecha
del día. Como Noelia se había olvidado de subir las suyas, Franco volvió la
tarea a `pendiente` desde la planilla. Noelia subió sus fotos esa misma noche
y quedaron con fecha **28/09**.

## Diagnóstico (Paul + Bob, leído en el código)

No tiene que ver con haber reabierto la tarea. El servidor calcula "hoy" en
**UTC**, no en hora Argentina:

- `Code.gs:1619`: `fechaHoyFoto = new Date().toISOString().split('T')[0]`.
  Con eso se arma el nombre del archivo en Drive.
- `Code.gs:1833` (`insertArchivo`): `fecha_contenido` por defecto es
  `ahora.split('T')[0]`, con `ahora` en ISO UTC. Esa es la fecha que muestra el
  carrusel de recuerdos.
- `Code.gs:1584`: la misma cuenta arma el nombre y el mes de la carpeta de
  Drive de la tarea (solo con la primera foto).

Desde las 21:00 hora Argentina, en UTC ya es el día siguiente. Las fotos de
Franco se subieron antes de las 21 y quedaron bien. Las de Noelia se subieron
después y quedaron con el 28. Pasa con cualquier foto subida entre las 21:00 y
las 23:59, reabierta o no. En el último día del mes, la carpeta también cae
en el mes siguiente.

`appsscript.json` ya tiene `timeZone: America/Argentina/Buenos_Aires`, pero
`toISOString()` siempre devuelve UTC.

La tarea no guarda una fecha propia de completado (`handleCompletePlan` solo
toca `estado`, `modificado_por` y `fecha_modificacion`). La fecha que se ve es
la de las fotos.

## Alcance

**Entra:**
- Las tres fechas de "hoy" del servidor (fecha de la foto, nombre del archivo,
  nombre y mes de la carpeta) se calculan en hora Argentina.
  `fecha_subida`, `fecha_modificacion` y todo lo de `Auditoria` siguen en ISO
  UTC, como pide `docs/modelo-datos.md`.
- Revisar la variante `formatDate()` (`Code.gs:1357`): convierte las fechas
  nativas de Sheets con `toISOString()`. Hoy no falla porque se guardan a
  medianoche, pero hay que confirmar que una fecha editada a mano en la
  planilla no se corre de día.
- Test en `Tests.gs` que simule una subida a las 22:00 hora Argentina y
  espere la fecha de ese día.

**No entra:**
- Agregar una fecha de completado a la tarea. Si hace falta, va con
  REQ-PLAN-001.

## Corrección de datos ya grabados

Las fotos de Noelia del 27/09 quedaron en `Archivos` de producción con
`fecha_contenido = 2026-09-28`, y así se llaman también sus archivos en Drive.
Corregirlas es una escritura en producción: **se hace solo con el OK de
Franco**. La propuesta de Gary es corregir `fecha_contenido` en la hoja y
dejar el nombre del archivo en Drive como está, porque es cosmético y la app
no lo lee.

**Franco dio el OK para corregirlas el 2026-09-27.** Gary propone una
corrección general en vez de tocar solo las de Noelia. Nadie manda
`fechaContenido` desde el front (verificado con grep), así que hoy
`fecha_contenido` es siempre el día UTC de `fecha_subida`. Eso permite
recalcular sin adivinar: una función que se corre una sola vez recorre
`Archivos` y pone en `fecha_contenido` el día en hora Argentina de
`fecha_subida`. Arregla también cualquier foto vieja subida después de las
21 h, no solo las del 27/09. Se prueba primero en test. En prod se corre al
deployar este fix, con un OK puntual justo antes (el OK de hoy aprueba
corregir, no el deploy), y la corrida lista cuántas filas cambió.

| # | Criterio de la corrección |
|---|---|
| 6 | En la planilla de test, una fila con `fecha_subida = 2026-09-28T01:30:00Z` y `fecha_contenido = 2026-09-28` queda en `2026-09-27`. Una con `fecha_subida` a las 15:00Z no cambia. |
| 7 | Correrla dos veces no cambia nada la segunda vez. |
| 8 | Después de correrla en prod, las fotos de Noelia del 27/09 figuran con esa fecha en el carrusel. |

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Una foto subida a las 22:30 hora Argentina queda con `fecha_contenido` del mismo día. |
| 2 | El nombre del archivo en Drive lleva la misma fecha que `fecha_contenido`. |
| 3 | La primera foto de una tarea subida el 30/09 a las 22:00 crea la carpeta bajo `septiembre`, no `octubre`. |
| 4 | `fecha_subida` sigue guardándose en ISO UTC con `Z`. |
| 5 | Sin regresión: `probarMEDIA001`, `probarMEDIA002` y `probarDATA002` en verde. |

## Corrección corrida en prod (2026-09-27, con OK de Franco)

`clasp run corregirFechaContenidoArchivos -u duck` contra prod: **16 filas**
corregidas, todas un día para atrás: 2 del 08/09 → 07/09, 7 del 16/09 → 15/09
y 7 del 28/09 → 27/09 (las de Noelia). Segunda corrida: 0 cambios
(criterio 7). Los nombres de archivo en Drive quedan con la fecha vieja, como
se decidió. Para deshacer, esas celdas de `fecha_contenido` vuelven al valor
"antes" de la lista:
`arc_mts2y6af_sxt1ra`, `arc_mts2y6ns_ysvdkk` (08/09);
`arc_mu3d9f95_x0ug9n`, `arc_mu3d9hyh_5a85dq`, `arc_mu3d9kq9_r14ntx`,
`arc_mu3d9nn3_hwhtyl`, `arc_mu3d9qip_wc42xz`, `arc_mu3d9t6c_rf226m`,
`arc_mu3d9y55_rebfxh` (16/09);
`arc_mukjxeed_itutui`, `arc_mukjxgyi_urpx3n`, `arc_mukjxkpe_d7sver`,
`arc_mukjxnin_x0a9jv`, `arc_mukjxqeg_2jj86k`, `arc_mukjxsvt_5qma1c`,
`arc_mukjxv0z_0cbvu8` (28/09).

Criterio 8 (se ve el 27/09 en el carrusel): el carrusel lee
`fecha_contenido` con `formatDate()`, el mismo camino que cubre
`probarBUGFECHA001` en test. No se miró en el navegador porque hace falta
iniciar sesión con Google en prod.
