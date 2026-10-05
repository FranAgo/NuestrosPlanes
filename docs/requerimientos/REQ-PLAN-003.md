# REQ-PLAN-003 — "Algún día": ideas de planes sin fecha

> **Estado:** CERRADO (2026-10-05)
> **Historia:** CERRADO (2026-10-05): en producción con 1.8.0 (front `22917f0`, Web App @34); Franco confirmó en uso que anda todo bien. PROPUESTO (2026-10-05). Pedido de Noelia, traído por Franco. Diseño elegido el mismo día (DEC-018). Depende de REQ-PLAN-002. Investigación: `docs/investigacion/2026-10-05-ideas-sin-fecha.md`. Antes de implementar, Franco decidió que un plan con fecha no vuelve a idea: la fecha se puede cambiar pero no vaciar. HECHO el 2026-10-05: `probarPLAN003` 39/39 en test (20 fallan con el `Code.gs` de 1.7.0); regresión `probarPLAN002` 26/26, `probarPLAN001` 44/44, `probarMEDIA005` 59/59, `probarDATA002` 70/70. Front verificado en 127.0.0.1 con fetch simulado a 375, 719/720 y 1366, sin pedidos a prod. Hallazgo de paso: `updatePlan` aceptaba una fecha de inicio imposible (`2026-13-01`) y la guardaba como 1970-01-01; ahora da 400.
> **Versión:** 1.8.0
> **Nivel:** cambio de fondo (contrato de `createPlan`/`updatePlan` + pestaña nueva).
> **Dueño técnico:** Jay (front) + Bob (servidor) · **DBA:** Gary · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Depende de:** REQ-PLAN-002 (toda idea necesita categoría para agruparse).

## Problema

Noelia quiere anotar ideas de planes que todavía no tienen día, para sacarlas
de la cabeza. Hoy no se puede guardar una tarea sin "Empieza".

## Qué se pide (decidido por Franco el 2026-10-05)

1. Una tarea se puede guardar **sin fecha de inicio**. Sin fecha es una
   **idea**, no un plan.
2. Chip nuevo **"Algún día"** junto a Planes / Completados / Todos, con la
   cantidad ("Algún día · 5").
3. **Variante A del mockup:** un título por categoría (punto de color y
   cantidad) y, dentro, las ideas de la más vieja a la más nueva según
   `fecha_creacion`. Las categorías se ordenan por su idea más vieja. En la
   computadora, dos columnas dentro de cada categoría. Sin plegar ni vista
   "todas juntas" (se probaron y se descartaron, DEC-018).
4. Cada idea: círculo punteado en vez del estado, "Anotada hace X · quién"
   (en ámbar con más de 3 meses) y un solo botón **"Ponerle fecha"**, que abre
   el formulario con el foco en la fecha. Con fecha, pasa sola a Planes.
5. **"Todos" muestra solo planes con fecha.** Una idea no es un plan.
6. **Una idea no se completa:** primero hay que ponerle fecha. Ni botón de
   completar ni acuerdo de cierre (REQ-PLAN-001) en las ideas.

## Notas técnicas

- **Gary:** misma hoja `Planes`, sin columnas nuevas: idea = `fecha_programada`
  vacía. Pasar a plan es ponerle fecha, sin copiar filas.
- **Bob:** revisar todo lo que asume fecha: `createPlan`/`updatePlan`
  (`Code.gs`, hoy exigen `fechaProgramada`), `compararPlanes`, `isVencido`,
  carrusel de recuerdos, carpeta de fotos (ya cae al día de hoy). "Termina" y
  "Vencimiento" sin inicio no tienen sentido: se rechazan.
- `completePlan` y el acuerdo de cierre rechazan una tarea sin fecha en el
  servidor.

## Criterios de aceptación

- Guardar sin fecha la deja en "Algún día", no en Planes ni en Todos.
- Orden por categoría y antigüedad como en el punto 3.
- "Ponerle fecha" + guardar la pasa a Planes sin recargar.
- El servidor rechaza completar o dar acuerdo sobre una idea, y "Termina" /
  "Vencimiento" sin inicio: pruebas `probarXXX()` contra test.
- Sin errores en consola; 375 px y 1366 px.
