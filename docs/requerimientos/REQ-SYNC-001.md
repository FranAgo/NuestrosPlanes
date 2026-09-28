# REQ-SYNC-001 — Los cambios del otro se ven en segundos, sin recargar

> **Estado:** PROPUESTO (2026-09-27). Sin diseñar.
> **Nivel:** cambio de fondo (endpoint nuevo + front + cuota de Apps Script).
> **Dueño técnico:** Bob (servidor) + Jay (front) · **Infra:** Roy (cuotas) · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Datos sensibles:** sí. El endpoint nuevo pasa por `validarSesion` como todos los demás.

## Problema

Franco volvió una tarea a `pendiente` desde la planilla y la app no se enteró
hasta que se recargó la página. Lo mismo pasa cuando la otra persona crea,
edita o completa una tarea, o sube fotos: hoy la app carga los datos una sola
vez al entrar (no hay `setInterval` ni nada que escuche cambios).

Esto se vuelve crítico con REQ-PLAN-001: el acuerdo para cerrar una tarea
tiene que aparecerle al otro sin que recargue.

## Qué se pide

Con la app abierta y visible, un cambio hecho por la otra persona (desde la
app o a mano en la planilla) aparece solo en **10 segundos como máximo**.

## Restricciones que no se negocian

- Apps Script no puede mandar avisos al navegador: hay que consultar cada
  cierto tiempo. La consulta tiene que ser liviana. Lo ideal es que pregunte
  "¿cambió algo desde X?" y que solo si la respuesta es sí se bajen los datos.
  El cómo lo define Bob.
- Los cambios hechos a mano en la planilla también cuentan. Un contador que
  solo sube cuando escribe el servidor no alcanza, porque no se entera de las
  ediciones manuales.
- Con la pestaña oculta o el teléfono bloqueado no se consulta. Al volver a la
  pestaña se consulta en el momento.
- Refrescar no puede romper lo que el usuario está haciendo. No se cierra un
  modal abierto, no se pierde un formulario a medio escribir, no se cortan
  fotos subiendo y no salta el scroll.
- Roy confirma que el volumen de consultas (2 personas, cada 5 a 10 s con la
  app abierta) entra en las cuotas diarias de Apps Script de la cuenta.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | Con dos sesiones abiertas, la tarea que crea, edita, completa o borra A aparece en la pantalla de B en ≤ 10 s, sin recargar. |
| 2 | Cambiar `estado` de una tarea a mano en la hoja `Planes` se refleja en la app abierta en ≤ 10 s. |
| 3 | Las fotos que sube A a una tarea aparecen en el conteo de esa tarea para B en ≤ 10 s (depende de REQ-MEDIA-004). |
| 4 | Con la pestaña oculta no salen consultas (se ve en la pestaña de red). Al volver, sale una en el momento. |
| 5 | Si B tiene abierto el modal de una tarea mientras llega un refresco, el modal no se cierra y no pierde lo que B escribió. |
| 6 | Un 401 durante una consulta de fondo lleva al logout normal (BL-021), sin mensajes repetidos. |
| 7 | Si la consulta de fondo falla por red, se reintenta en silencio en la siguiente vuelta. Si falla 3 veces seguidas, se muestra un aviso claro y no bloqueante (REQ-UX-001). |
| 8 | El endpoint nuevo devuelve 401 sin sesión válida (test `probarXXX()`). |

## Decisión pendiente

Consultar cada tanto o usar algún mecanismo tipo push externo (Firebase, por
ejemplo): se registra como ADR cuando Bob proponga el diseño. Paul recomienda
consultar cada tanto, porque no suma otro servicio y con 2 personas el costo
es bajo.

## Cómo lo resuelven otros (2026-09-27)

Ver `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`. Apps Script no ofrece SSE ni WebSockets. Firebase daría milisegundos, pero es otro servicio, con otra autenticación y datos personales en otro proveedor. Para 2 personas alcanza con consultar cada tanto, pausando con la pestaña oculta (Page Visibility API). Para las ediciones a mano en la planilla se puede usar un trigger `onChange` instalable que marque la versión. Roy confirma en la tabla oficial de cuotas si las llamadas a la Web App cuentan contra los 90 min/día de triggers de una cuenta gmail.
