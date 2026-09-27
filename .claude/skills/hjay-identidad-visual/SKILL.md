---
name: hjay-identidad-visual
description: >
  Aplica el criterio de diseño de Franco (principios de interacción y
  reglas chicas de calidad de UI) al diseñar, mockupear o revisar
  cualquier interfaz, pantalla, landing o componente, aunque sea un ajuste
  visual chico. Usar ante pedidos como "diseñá", "armá un mockup", "cómo
  debería verse", "mejorá la pantalla", "se ve feo", "revisá la UI", o al
  implementar un cambio que el usuario va a ver. No cubre cómo escribir el
  código (eso es de Jay) ni convenciones técnicas de un proyecto puntual.
---

# Criterio de diseño — Franco

Criterio propio, de uso general, no atado a ningún proyecto. Lo mantiene
Jay; lo usa cualquiera que diseñe o toque una interfaz.

Contenido: Principios de interacción · Reglas chicas de calidad · Control
de cada elemento nuevo · Cuando el proyecto ya hace otra cosa · Origen.

## Principios de interacción

- **Feedback inmediato.** Toda acción (click, hover, submit) muestra
  respuesta visual dentro de los ~100ms. Si tarda más (red, servidor),
  estado de carga inmediato: nunca una interfaz congelada sin señal.
- **Forgiveness.** Primero prevenir el error (validar antes de enviar,
  confirmar lo destructivo); después, que se pueda deshacer o corregir
  fácil. Un mensaje de error seco no alcanza: dice qué corregir.
  Cerrar un formulario con datos sin guardar (click afuera, Escape, ×)
  pregunta antes de descartar, o conserva lo cargado.
- **Divulgación progresiva.** Con mucha información, primero el resumen;
  el detalle y las opciones avanzadas, cuando el usuario las pide.
- **Manipulación directa cuando tenga sentido.** Arrastrar y soltar,
  edición en línea, antes que controles indirectos (subir/bajar,
  formularios aparte para editar).

## Reglas chicas de calidad

- Nada de iconos emoji en la UI: SVG.
- Cursor pointer en todo lo clickeable.
- Transiciones de 150 a 300ms: ni instantáneo ni lento.
- Glass/transparencia en modo claro con opacidad alta (mínimo ~80%) para
  que no se vea lavado.
- Bordes visibles en todos los modos de color que tenga la interfaz.
- Transiciones con las propiedades nombradas, nunca `transition: all`
  (se anima lo que no se quería). Un desplazamiento o cambio de tamaño se
  anima con `transform`, no con `top`, `left`, `width` o `height`. El
  movimiento se apaga con `prefers-reduced-motion`.
- Interfaz oscura: `color-scheme: dark` en la raíz, o color de fondo y de
  texto explícitos en cada `<select>`, o el menú nativo sale claro o
  ilegible.

## Control de cada elemento nuevo

Son cosas que se saben pero se olvidan al escribir rápido. Repasarlas en
cada elemento que se agrega:

- **Foco visible.** Nada de `outline: none` sin un reemplazo en
  `:focus-visible` que se vea sobre el fondo. Un estilo en línea no puede
  tener `:focus` y pisa el borde que ponga una clase: si no hay forma de
  darle un reemplazo, no se saca el `outline` del navegador.
- **Botón de solo ícono:** `aria-label` (y `title` para el mouse) que diga
  la acción y sobre qué ("Eliminar factura 0003").
- **Acciones con `<button type="button">`,** navegación con `<a>`. Un
  `div`, `span` o `tr` con `onclick` no se alcanza con Tab ni con Enter.
  Un botón dentro de una fila clickeable corta el click con
  `event.stopPropagation()`.
- **Cada campo con su `<label for>`,** el tipo correcto (`tel`, `email`,
  `url`) e `inputmode` para el teclado del celular. No bloquear pegar. Un
  campo de texto de solo lectura va con `readonly`, no `disabled`, para que
  se pueda copiar (un `<select>` no tiene `readonly`).
- **Guardar que espera la respuesta:** el botón no acepta un segundo click
  mientras dura, y se ve desactivado. Si el proyecto ya avisa el guardado
  de forma central, no se suma otro aviso.
- **Columnas de números:** en una tabla nueva, alineadas a la derecha.
  Con decimales fijos y `font-variant-numeric: tabular-nums` (salvo fuente
  monoespaciada), para que las cifras queden en columna.
- **Contenido real, no el del ejemplo:** probar mentalmente vacío, corto y
  muy largo. El vacío tiene su mensaje; el largo se corta con `…` o
  quiebra, sin romper la grilla (en flex, el hijo necesita `min-width: 0`
  para poder cortarse).
- **Zoom:** nunca `user-scalable=no` ni `maximum-scale=1`.

## Cuando el proyecto ya hace otra cosa

Si el proyecto tiene un `DESIGN.md` (su sistema de diseño, extraído del
código), es la referencia para colores, tipografía y componentes, con las
reglas de prioridad que diga ese archivo. Este criterio decide lo que ese
archivo no cubre.

Si una regla choca con lo que la interfaz existente ya usa en todos lados
(por ejemplo, emojis como iconos):

- Un elemento nuevo o tocado dentro de una pantalla existente sigue lo
  que lo rodea en esa pantalla, y se dice que la regla quedó sin aplicar.
  Excepción: lo del control de cada elemento nuevo que no cambia cómo se
  ve (`aria-label`, `<label for>`, `type`, `inputmode`, `tabular-nums`)
  se aplica aunque los vecinos no lo tengan, siempre que se pueda sin
  cambiar un helper o componente compartido. Si hace falta cambiarlo, se
  dice y va al backlog: arreglar los vecinos es aparte.
- Una pantalla nueva entera sigue la regla, aunque el resto de la app
  (navegación, otras pantallas) no lo haga. Un modal nuevo cuenta como
  pantalla nueva para su contenido; el botón que lo abre sigue a sus
  vecinos.
- Los principios de interacción valen para lo nuevo. Un comportamiento
  existente que no los cumple (un modal que se cierra sin preguntar) no se
  cambia de paso: se anota en el backlog.
- No se migra en masa lo existente como parte de otra tarea: se propone
  aparte (backlog del proyecto).
- Una regla que no aplica (modo claro en una app que solo tiene modo
  oscuro) se ignora sin forzarla.

## Origen

Los principios de interacción son prácticas generales de UX, con palabras
propias. Las reglas chicas se inspiran en un catálogo de un skill de
comunidad con licencia MIT, reformuladas. El control de cada elemento
nuevo y las reglas de animación y de interfaz oscura salen de una
selección de las Web Interface Guidelines de Vercel (licencia MIT),
reformuladas: quedaron afuera las de React/Next, imágenes, fuentes, video,
idioma y estilo de textos en inglés.
