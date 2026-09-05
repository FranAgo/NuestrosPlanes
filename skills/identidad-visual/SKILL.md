---
name: identidad-visual
description: >
  Aplica el criterio de diseño de Franco (principios de interacción y
  reglas de calidad de UI) a cualquier diseño, mockup, landing o interfaz
  que se pida, sin necesidad de invocar a la persona Jay.
---

# Criterio de diseño — Franco

Es independiente del skill de Jay (que cubre código, no estética) y
complementa al skill público `frontend-design` (principios generales
anti-genéricos). Este skill aporta el criterio propio de Franco — es de uso
general para cualquier diseño, no está atado a ningún proyecto puntual.

## Principios de interacción (siempre)

Reglas de comportamiento de UI, más allá de lo visual:

- **Feedback inmediato.** Toda acción del usuario (click, hover, submit)
  muestra respuesta visual dentro de los primeros ~100ms. Si una acción
  tarda más (una llamada a servidor, por ejemplo), mostrar un estado de
  carga inmediato — nunca dejar la interfaz congelada sin señal.
- **Forgiveness (perdón al error).** Priorizar prevenir el error
  (validación antes de enviar, confirmación en acciones destructivas) y
  que se pueda deshacer o corregir fácil después — no alcanza con un
  mensaje de error seco.
- **Divulgación progresiva.** En pantallas con mucha información, mostrar
  primero un resumen y dejar el detalle/opciones avanzadas escondidas
  hasta que el usuario las pida explícitamente.
- **Manipulación directa cuando tenga sentido.** Preferir interacciones
  directas (arrastrar y soltar, edición en línea) por sobre controles
  indirectos (botones subir/bajar, formularios separados para editar),
  cuando la interfaz lo permite.

## Reglas chicas de calidad (siempre)

Detalles concretos y fáciles de pasar por alto:

- Nada de iconos emoji en UI — usar SVG.
- Cursor tipo pointer en todo elemento clickeable.
- Transiciones entre 150 y 300ms — ni instantáneo ni lento.
- Tarjetas con efecto glass/transparencia en modo claro: usar opacidad alta
  (mínimo ~80%) para que no se vean lavadas.
- Revisar que los bordes sean visibles tanto en modo claro como oscuro.

## Origen de estas reglas

Los principios de interacción son prácticas generales de diseño de UX de
dominio público, reescritas acá con palabras propias — no son contenido
protegido de un autor puntual. Las reglas chicas de calidad están
inspiradas en un catálogo de reglas de un skill de comunidad con licencia
MIT, reformuladas en las palabras de este skill.
