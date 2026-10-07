# REQ-PLAN-002 — Toda tarea lleva categoría, y se puede crear una sin salir del formulario

> **Estado:** CERRADO (2026-10-06)
> **Historia:** PROPUESTO (2026-10-05). Pedido de Franco en la misma conversación que REQ-PLAN-003 (ideas sin fecha). Va primero porque "Algún día" agrupa por categoría y eso solo funciona si toda tarea tiene una. Investigación: `docs/investigacion/2026-10-05-ideas-sin-fecha.md`. Franco aprobó el mockup interactivo el mismo día. HECHO el 2026-10-05: `probarPLAN002` 26/26 en test (10 fallan con el `Code.gs` anterior); front verificado en 127.0.0.1 con fetch simulado a 375 y 1366, sin pedidos a prod. CERRADO el 2026-10-06: Franco confirmó en uso el aviso al guardar sin categoría y la creación de una categoría desde el formulario.
> **Versión:** 1.7.0
> **Nivel:** cambio de fondo (regla de negocio nueva en el servidor + front).
> **Dueño técnico:** Jay (front) + Bob (servidor) · **AppSec:** Julia · **QA:** Duck · **PM:** Paul

## Problema

Hoy la categoría es opcional ("Categoría (opcional)", `index.html`; `createPlan`
y `updatePlan` aceptan `categoriaId` vacío). Franco (2026-10-05): "las tareas
tienen que tener sí o sí una categoría para guardarla". Y si la categoría que
quieren no existe, hoy hay que cerrar el formulario, ir a Categorías, crearla
y volver a empezar.

## Qué se pide

1. **Categoría obligatoria** al crear y al editar una tarea. La etiqueta pasa a
   "Categoría *".
2. **Aviso al guardar sin categoría.** El botón Guardar queda activo (no se
   deshabilita: un botón gris no explica qué falta). Al tocarlo sin categoría:
   el campo se marca, aparece debajo "Elegí una categoría para guardar" y el
   foco va al desplegable. El mensaje se va al elegir una.
3. **El servidor también lo rechaza** (`createPlan` y `updatePlan`). Lo que
   controla la pantalla es cosmético (Julia).
4. **"+ Nueva categoría" al final del desplegable**, separada de las
   categorías. Al elegirla, el mismo modal cambia al formulario de categoría
   (nombre y color) sin abrir otro modal encima. Tiene **Volver** (vuelve al
   plan sin crear nada) y **Cancelar**. Al guardar, vuelve al plan con la
   categoría nueva ya elegida y lo escrito en el plan intacto.

## Cómo quedó

- Mockup aprobado: placeholder "Elegí una categoría", separador y "+ Nueva
  categoría" al final; el paso nuevo reemplaza el formulario en el mismo
  modal (sin la X, con flecha de volver y Cancelar) y el botón dice "Crear
  y elegir".
- `updatePlan` sin `categoriaId` no toca la categoría: una tarea vieja sin
  categoría se puede seguir editando desde otros lados, pero el formulario
  siempre la manda, así que al editarla la pide. No se contaron las viejas
  en prod (haría falta una función de lectura nueva en el servidor).
- De paso: `updatePlan` validaba la categoría después de escribir el título;
  un 404 dejaba el título cambiado. Ahora valida todo antes de escribir.

## Criterios de aceptación

- Guardar sin categoría no llama al servidor y muestra el aviso en el campo.
- `createPlan` / `updatePlan` sin `categoriaId` devuelven 400: prueba
  `probarXXX()` en `Tests.gs` contra test.
- Crear una categoría desde el plan la deja elegida y no borra título ni
  fechas; Volver y Cancelar no crean nada.
- Navegable con teclado; sin errores en consola; 375 px y 1366 px.
