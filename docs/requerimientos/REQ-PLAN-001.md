# REQ-PLAN-001 — Cerrar una tarea requiere el acuerdo de los dos

> **Estado:** DEFINIDO (2026-09-27). Preguntas cerradas; listo para que Gary diseñe el modelo y Bob el servidor.
> **Nivel:** cambio de fondo (modelo de datos + regla de negocio en el servidor + front).
> **Dueño técnico:** Bob (servidor) + Jay (front) · **DBA:** Gary · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Depende de:** REQ-SYNC-001 (sin él, el otro no ve el acuerdo hasta recargar) y REQ-MEDIA-004 (conteo de fotos).
> **Datos sensibles:** sí, bajo. Quién dio el acuerdo y cuándo es un dato personal y se audita.

## Problema

Hoy cualquiera de los dos cierra una tarea sola (`completePlan`, con al menos
una foto). El 2026-09-27 Franco la cerró antes de que Noelia subiera sus fotos,
y tuvo que reabrirla a mano desde la planilla.

## Qué se pide

1. En cada tarea pendiente, cada persona tiene su propio **"Estoy de acuerdo
   con cerrarla"**. Se activa y desactiva con un clic.
2. Los dos ven el estado de los dos: "Franco está de acuerdo · Noelia todavía
   no". Con avatar o inicial, no solo con color.
3. El botón **"Completar"** se habilita solo cuando los dos están de acuerdo.
   Antes se ve deshabilitado, con una explicación de qué falta ("Falta que
   Noelia esté de acuerdo").
4. Recién al tocar "Completar" se verifica que haya al menos una foto (o
   video, cuando exista, ver BL-023). Si no hay, el mensaje lo dice claro y
   abre la subida (hoy ya lo hace con `FOTO_REQUERIDA`).
5. **Pill de estado de la tarea**, en la tarjeta y en el modal:
   - *Pendiente*: nadie dio el acuerdo.
   - *Esperando acuerdo*: 1 de 2.
   - *Lista para cerrar*: 2 de 2.
   - *Completada*.
   - Si está *Vencida* se suma a la pill (hoy ya existe como marca aparte).
6. **Reabrir** (decidido por Franco el 2026-09-27: "quiero manejar todo con la
   app"). Una tarea completada tiene un botón "Reabrir" que la vuelve a
   *Pendiente* sin tocar la planilla. Pide confirmación ("La tarea vuelve a
   pendiente y hay que volver a ponerse de acuerdo para cerrarla"). Cualquiera
   de los dos puede reabrir, y el otro lo ve. Las fotos no se tocan. Sale de
   BL-024.

## Reglas (confirmadas por Franco el 2026-09-27, DEC-004)

- **Lo decide el servidor.** `completePlan` responde error si falta el acuerdo
  de alguien, aunque el botón se habilite a la fuerza desde DevTools. Lo que
  oculta el front es cosmético (CLAUDE.md).
- "Los dos" son todas las personas habilitadas en `Usuarios` (hoy 2). Si
  mañana hubiera una tercera, harían falta los 3.
- Cada uno solo puede activar o desactivar **su propio** acuerdo.
- Subir fotos o editar la tarea **no** borra los acuerdos ya dados.
- Si una tarea `completado` vuelve a `pendiente`, los acuerdos se borran y hay
  que darlos de nuevo.
- Dar o sacar el acuerdo queda en `Auditoria`.

## Modelo de datos (Gary)

Hace falta guardar quién dio el acuerdo en cada tarea. Gary decide si son
columnas nuevas en `Planes` o una hoja aparte, que es más limpio si algún día
son más de 2. Cualquiera de las dos necesita `setupSheets()` en test y en prod
antes del deploy (convenciones-tecnicas, clasp). Se aprovecha para sumar
`fecha_completado` y `completado_por` a `Planes`, que hoy no existen (ver
BUG-FECHA-001).

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | En una tarea pendiente, A activa su acuerdo. B lo ve (≤ 10 s, REQ-SYNC-001), la pill dice "Esperando acuerdo" y el botón "Completar" sigue deshabilitado con el motivo. |
| 2 | Con los dos de acuerdo, la pill dice "Lista para cerrar" y se habilita "Completar" para los dos. |
| 3 | A desactiva su acuerdo → el botón vuelve a deshabilitarse para los dos. |
| 4 | Con los dos de acuerdo y 0 fotos, "Completar" responde el error de foto requerida con su explicación y abre la subida. La tarea sigue pendiente. |
| 5 | Con los dos de acuerdo y 1 foto o más, la tarea pasa a `completado`, con `fecha_completado` en hora Argentina y `completado_por`. |
| 6 | Llamar `completePlan` con un solo acuerdo devuelve error con `code` propio y no cambia el estado (test `probarXXX()`, que falla contra el `Code.gs` actual). |
| 7 | A no puede cambiar el acuerdo de B, ni siquiera armando el pedido a mano (test). |
| 8 | Una tarea completada que vuelve a pendiente (desde la app o desde la hoja) queda sin acuerdos. |
| 9 | Dar o sacar el acuerdo deja una fila en `Auditoria`. |
| 10 | Las pills se entienden sin color (texto) y se ven bien a 375 px y en tema oscuro. |
| 11 | En una tarea completada, "Reabrir" pide confirmación y la deja `pendiente`, sin acuerdos y con sus fotos. El otro la ve reabierta en ≤ 10 s. Queda en `Auditoria`. |
| 12 | "Reabrir" en una tarea que no está completada devuelve error con explicación (test). |

## Preguntas para Franco (cerradas)

1. ~~¿Subir fotos o editar después del acuerdo lo anula?~~ **No**: "la subida
   de fotos es independiente del acuerdo" (Franco, 2026-09-27, DEC-004).
2. ~~¿Hace falta un botón "Reabrir"?~~ **Sí** (Franco, 2026-09-27). Entra en
   este REQ, punto 6.
3. ~~¿Las tareas que ya existen arrancan sin acuerdos?~~ **Sí** (Franco, 2026-09-27).

## Cómo lo resuelven otros (2026-09-27)

Ver `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`. Ninguna app de pareja de las revisadas pide el acuerdo de los dos para cerrar. El modelo más parecido es el de los "cuatro ojos" (maker-checker) y las revisiones obligatorias de GitHub, que descartan la aprobación si cambió el contenido. Para la pregunta 1 hay tres opciones: (a) el acuerdo se mantiene, que es lo que recomienda Paul; (b) se anula al subir fotos, como hace GitHub; (c) se mantiene, pero el otro ve "subió 2 fotos después de tu OK". Para la pregunta 2, reabrir es estándar en Todoist y Asana; Paul recomienda sumarlo a este REQ (BL-024).
