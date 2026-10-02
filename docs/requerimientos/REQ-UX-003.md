# REQ-UX-003 — Tocar la tarjeta abre la tarea, con las fotos primero

> **Estado:** EN PRODUCCIÓN como `1.4.0` desde el 2026-10-02 (commit `7692165`, tag `v1.4.0`, push con OK de Franco; Pages confirmado con curl). Verificado antes en 127.0.0.1 con `fetch` simulado. Falta que Franco y Noelia lo usen en el celular.
> **Nivel:** cambio de fondo (pantalla nueva y cambia cómo se usa la lista). Solo front: `Code.gs` no cambia.
> **Dueño técnico:** Jay · **PM:** Paul · **QA:** Duck · **AppSec:** Julia (sin superficie nueva)

## Problema

Para ver o subir las fotos de una tarea había que tocar el lápiz de
"Editar", que mezcla las fotos con el formulario de título y fechas. Las
fotos son lo principal de la app; editar la tarea es raro. Además, una
tarea completada no tenía lápiz, así que sus fotos solo se veían en el
carrusel de recuerdos y no se podían agregar más.

## Qué se pide (Franco, 2026-10-02, opción A del mockup)

1. Tocar en cualquier parte de la tarjeta abre el **detalle de la tarea**:
   título, categoría, estado, fechas, quién la creó, el acuerdo y las
   fotos ("Ya subidas" y "Agregar foto").
2. La tarjeta queda limpia: sin lápiz ni tacho. Un chevron indica que se
   abre. Los botones de acuerdo, "Completar" y "Reabrir" siguen en la
   tarjeta, porque se usan sin entrar.
3. Editar y eliminar van en el menú "⋯" del detalle. "Editar tarea" pasa
   el mismo modal al formulario; "Guardar" y "Cancelar" vuelven al
   detalle.
4. Una tarea completada abre el detalle igual: se ven sus fotos y se
   pueden agregar más (el servidor ya lo permitía; solo faltaba por dónde).
   No tiene menú: no se edita ni se elimina, como antes.
5. Todo funciona con el teclado (Tab, Enter, Escape y flechas en el menú).

## Investigación (Jay)

- Material Design (cards): una acción principal por tarjeta, en general la
  tarjeta entera hacia el detalle; acciones secundarias aparte, máximo
  dos, el resto en un menú "⋯". Una acción no va encima de una superficie
  que ya es accionable.
- Nielsen Norman Group (cards): la tarjeta es un resumen que invita a
  entrar; toda la superficie tocable mejora el uso en táctil y con mouse.
- Trello: tocar la tarjeta abre su "dorso", con adjuntos y edición adentro.
- Berkeley (accesibilidad de tarjetas): con varios botones en la tarjeta,
  no anidar botones; un enlace o botón principal y los demás aparte.

## Diseño

- El título es un `<button class="plan-titulo-btn">` y su `::after` cubre
  la tarjeta (patrón de "enlace estirado"). Los hijos de
  `.plan-card-actions` quedan por encima con `z-index: 1`; el resto de la
  tarjeta (fechas, avatar, acuerdo) abre el detalle.
- Es el mismo `#modal-plan`, con `state.planModo` = `nuevo` | `detalle` |
  `editar`. Las fotos siguen usando `state.editingPlanId` y los mismos
  ids, así que no se tocó su lógica (subida, caché, fechas, reintentos).
- Con el detalle abierto, `renderPlanes()` también repinta su resumen:
  el acuerdo del otro, un cierre o una reapertura se ven sin cerrar.
- Eliminar desde el menú usa el `confirmarModal` de siempre y cierra el
  detalle si se borró.
- `FOTO_REQUERIDA` (completar sin fotos) ahora abre el detalle.

## Criterios de aceptación y verificación (2026-10-02, 127.0.0.1, `fetch` simulado, sin pedidos a prod)

| # | Criterio | Resultado |
|---|---|---|
| 1 | Tocar la tarjeta fuera del título (fechas) abre el detalle | OK |
| 2 | Los botones de acuerdo y "Reabrir" reciben su propio click (no abren el detalle) | OK (`elementFromPoint` en su centro) |
| 3 | "⋯" → "Editar tarea" → Guardar: manda `updatePlan`, vuelve al detalle con el título nuevo y el foco en "⋯" | OK |
| 4 | Cancelar en "Editar tarea" vuelve al detalle y descarta lo tipeado | OK |
| 5 | Escape en el menú lo cierra y devuelve el foco a "⋯" | OK |
| 6 | Completada: detalle sin menú, sin el aviso de "al menos una foto", con sus fotos y "Agregar foto" | OK |
| 7 | "⋯" → "Eliminar" pide confirmación, manda `deletePlan` y cierra el detalle | OK |
| 8 | 375 px: sin scroll horizontal, título largo quiebra en el encabezado del detalle | OK |
| 9 | Tab llega al título de la tarjeta y se ve el contorno cobre en toda la tarjeta | OK |
| 10 | Consola sin errores | OK |

## Fuera de alcance

- El botón "⋯" y la X del modal miden 24 px, igual que los demás
  `.btn-icon`: menos que los 44 px para el dedo. Va con BL-026.
- El visor a pantalla completa al tocar una foto sigue siendo BL-027.
