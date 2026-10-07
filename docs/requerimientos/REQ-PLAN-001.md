# REQ-PLAN-001 — Cerrar una tarea requiere el acuerdo de los dos

> **Estado:** CERRADO (2026-10-02)
> **Historia:** CERRADO (2026-10-02). En producción desde el 2026-09-28 (Web App @25 y front `50b378e`), verificado de punta a punta con el front publicado contra el servidor de test (ver "Verificación del 2026-09-28"). Franco confirmó el 2026-10-02 que ya hicieron varios cierres reales con los dos acuerdos y anduvo todo bien.
> **Origen:** BL-024
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

## Diseño elegido (2026-09-27, DEC-006)

Franco vio el mockup interactivo de Jay con tres variantes y eligió la **A**:
en la tarjeta de la tarea, debajo de la meta, una fila con los dos avatares
(tilde verde si dio el acuerdo, borde punteado si todavía no) y la frase
"Franco está de acuerdo · Noelia todavía no". Botones: "Estoy de acuerdo"
(cobre; al activarlo pasa a "De acuerdo" con tilde, relleno, y se vuelve a
tocar para sacarlo) y "Completar" (verde), que se ve apagado con el motivo
abajo ("Falta que Noelia esté de acuerdo") hasta que estén los dos. Pill en el
encabezado: *Pendiente* (gris), *Esperando acuerdo · 1 de 2* (borde cobre),
*Lista para cerrar* (cobre relleno), *Completada* (verde). Una tarea
completada muestra "Completada el DD/MM por X" y el botón "Reabrir", que pide
confirmación.

## Implementación (2026-09-27)

- **Modelo (Gary):** columnas nuevas al final de `Planes`: `acuerdos_cierre`
  (IDs separados por coma), `fecha_completado` (ISO UTC; el front la muestra
  en hora local) y `completado_por`. Completar vacía los acuerdos, así que una
  tarea reabierta desde la app o a mano en la hoja arranca sin acuerdos (C8)
  sin lógica extra. La historia queda en `Auditoria` (`plan.acuerdo_dar`,
  `plan.acuerdo_sacar`, `plan.completar`, `plan.reabrir`).
- **Servidor (Bob):** `setAcuerdoCierre {planId, deAcuerdo}` (solo el propio,
  por sesión), `reopenPlan {planId}`, `completePlan` con `ACUERDO_PENDIENTE`
  (409, con `faltan` y el mensaje con nombres) antes de `FOTO_REQUERIDA`, y
  `NO_PENDIENTE` si ya estaba completada. `getPlanes` suma `acuerdos`,
  `fechaCompletado`, `completadoPor` y `participantes`. Todo bajo
  `LockService`.
- **Tests:** `probarPLAN001` 44/44 (falla contra el `Code.gs` viejo). Sin
  regresión: BUGFECHA001 21/21, MEDIA001 22/22, MEDIA002 43/43, DATA002
  70/70 (el conteo fijo de 13 columnas pasó a `PLANES_HEADERS.length`),
  BUGLOGIN001B 38/38, BUGCARGA001 9/9, BL015 12/12.
- **Front (Jay), variante A:** verificado en 127.0.0.1 con `fetch` simulado
  (ningún pedido a prod): los 5 estados, 375/600/601/1366 sin desborde,
  doble click = 1 pedido, error 5xx revierte con mensaje propio, carrera
  (el otro saca su acuerdo) muestra el motivo real, "Reabrir" pide
  confirmación y cancelar no manda nada, recorrido completo con teclado.
  Duck encontró que el foco se perdía al re-render: corregido
  (`devolverFoco`). Sin errores de consola.
- **Sin verificar:** con la sesión real de Google y los datos reales (se ve
  después del deploy). El aviso al otro en ≤ 10 s queda para REQ-SYNC-001:
  hoy lo ve al recargar.
- **Fuera de alcance, anotado:** los botones de la tarjeta miden 29 px de
  alto, menos que los 44 recomendados para el dedo (igual que los que ya
  había). Ver backlog.

## Verificación del 2026-09-28

**En prod (solo lectura):** el front de GitHub Pages es idéntico a `index.html`
de `main`. El `Code.gs` de prod (bajado con `clasp pull` a una carpeta aparte)
es idéntico al del repo, en la implementación @25. `setupSheets()` corrió en
prod y `Planes` tiene `acuerdos_cierre`, `fecha_completado` y
`completado_por`. `participantesCierre()` devuelve los dos usuarios. Uso real:
Franco dio su acuerdo en "Estudio de finde pre-parcial mate" y quedó guardado.
En los logs no hay errores de la Web App de prod desde el deploy.

**De punta a punta, contra test:** front publicado (franago.github.io), con
`fetch` redirigido en memoria al Web App de test (@8), dos pestañas y dos
sesiones de prueba (`simPLAN001_preparar()` en `Tests.gs`), ningún pedido a
prod. Resultado por criterio:

| # | Resultado |
|---|---|
| 1 | Testeo da su acuerdo: pill "Esperando acuerdo · 1 de 2", motivo "Falta que Noe (simulada) esté de acuerdo". Noe, en su pestaña, lo ve y su motivo dice "Falta que vos estés de acuerdo". "Completar" apagado no manda ningún pedido. |
| 2 | Con los dos: "Lista para cerrar" y "Completar" habilitado. |
| 3 | Noe saca su acuerdo: vuelve a "1 de 2", "Completar" apagado, el foco queda en el botón. Lo vuelve a dar con Enter. |
| 5 | Completar: `completado`, `completado_por` = Noe, `fecha_completado` 03:28 UTC (00:28 en Argentina), tarjeta "Completada el 28/09 por Noe (simulada)", acuerdos vacíos. |
| 9 | `Auditoria`: `acuerdo_dar` ×3, `acuerdo_sacar`, `completar` (con los acuerdos en el detalle) y `reabrir`, cada uno con su usuario. |
| 11 | "Reabrir" pide confirmación sin mandar nada. Al confirmar: `pendiente`, sin acuerdos. `fecha_completado` y `completado_por` quedan como registro del último cierre (a propósito, ver `handleReopenPlan`). |

Los criterios 4, 6, 7, 8 y 12 los cubre `probarPLAN001` (44/44). El 10 se
verificó el 2026-09-27. Sigue sin cubrirse que el otro lo vea sin recargar
(REQ-SYNC-001). `simPLAN001_limpiar()` dejó la planilla de test como estaba.

## Ajuste del 2026-09-28: estados de "Guardando…" y "Reabriendo…" (1.2.3)

Franco lo probó con 1.2.2 en producción (wifi parecida a la de su casa):
- Reabrir tardaba ~6 s sin ningún aviso. Causa: `reabrirPlan` esperaba
  `reopenPlan` (~3 s) y después `refreshPlanes` (lista + usuarios, ~3 s).
- "Estoy de acuerdo" parecía congelado y, clicando mucho, cambiaba de estado
  varias veces. Reproducido en local con `fetch` simulado: no hay carrera (el
  servidor queda siempre en el último guardado); el botón se apagaba sin
  explicación durante ~3 s y el primer clic después de volver a prenderse
  lo invertía otra vez (40 clics en 10 s = 4 guardados alternados).

Franco eligió la opción A en los dos casos (mockup en la sesión):
- `acuerdoEnCurso` pasa de `Set` a `Map` (planId -> 'acuerdo' | 'reabrir' |
  'completar'). Con 'acuerdo' el botón muestra spinner + "Guardando…" sin
  transparencia; con 'reabrir' la tarjeta completada recupera opacidad, borde
  cobre, píldora "Reabriendo…" que late y botón "Reabriendo…" con spinner.
- Con `reopenPlan` 200 el front aplica `pendiente` y acuerdos vacíos sin
  releer la lista (`fechaCompletado`/`completadoPor` se conservan, como en el
  servidor). Si falla, relee como antes.

Verificado en 127.0.0.1 con `fetch` simulado, a 1366 y 375: 6 clics seguidos
= 1 pedido; reabrir OK sin `getPlanes` extra; reabrir con 409 muestra el
error, relee y devuelve el foco a "Reabrir"; sin scroll horizontal; consola
limpia. Franco lo probó en prod con 1.2.3 (2026-09-28, ~15:35): "de 10 puntos todo".

Hallazgo del mismo día (BL-033, 1.2.4): al dejar de releer la lista después
de reabrir, 1.2.3 abrió una ventana. Un `getPlanes` que salió antes de
reabrir y llegaba después volvía a mostrar la tarea como completada (el
acuerdo ya tenía el mismo problema). En 1.2.4, cada escritura que sale bien
descarta las lecturas de planes que ya estaban en vuelo; ver BL-033 en
`docs/backlog.md`.
