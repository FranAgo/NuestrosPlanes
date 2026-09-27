---
name: hpaul-triage
description: >
  Anota en el backlog del proyecto las ideas, mejoras o problemas que
  aparecen en cualquier sesión (con cualquier ingeniero) y no se resuelven
  en el momento, y actualiza su estado cuando se priorizan o se
  implementan. Usar cuando alguien posterga algo ("después lo vemos", "más
  adelante", "anotalo", "eso es otro tema"), cuando se detecta un problema
  que queda fuera del alcance de la tarea actual, cuando se implementa un
  ítem que ya estaba en el backlog, y siempre antes de cerrar una sesión
  de trabajo.
---

# Backlog de ideas sin formalizar

Herramienta de Paul; la usa cualquier ingeniero. El backlog guarda lo que
falta decidir o construir. No es la bitácora, que guarda lo que ya se
hizo, ni el registro de decisiones (`hpaul-decision-log`).

## Dónde vive el backlog

En el archivo que indique el `CLAUDE.md` del proyecto. Si no indica
ninguno, `docs/backlog.md`. Si el archivo no existe, crearlo con un título
y una línea que explique para qué es.

## Formato de un ítem

Los ítems se agrupan bajo el encabezado de la sesión en que surgieron:

```markdown
## Sesión AAAA-MM-DD

### BL-XXX — Título breve
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: quién lo encontró o lo pidió, y en qué contexto
- Nota: descripción breve de qué es y por qué importa
- Resuelto: (se completa al pasar a Formalizado o Descartado) sesión o commit
```

- El ID `BL-XXX` es global y secuencial: el siguiente número libre del
  archivo, sin importar la sesión. Nunca se reinicia.
- Una sesión es una conversación de trabajo. Si ya hubo otra el mismo
  día, el encabezado lleva un sufijo: `## Sesión AAAA-MM-DD (2)`. Si ya
  existe el encabezado de esta sesión, el ítem se agrega debajo.
- Prioridades: Alta / Media / Baja / Sin definir.
- No es un requerimiento: no lleva objetivo, alcance ni criterios de
  aceptación. Tampoco es la bitácora: el detalle de cómo se resolvió va a
  la bitácora o al commit, y en el ítem queda solo la referencia en
  `Resuelto`.

## Estados

| Estado | Significa |
|---|---|
| Propuesto | Anotado, nadie decidió nada todavía |
| Priorizado | Se decidió hacerlo; tiene prioridad asignada |
| En curso | Se está trabajando (incluye cuando ya se escribió el requerimiento) |
| Formalizado | Implementado y cerrado según el protocolo de cierre del equipo |
| Descartado | Se decidió no hacerlo; el motivo va en `Resuelto` |

Si un ítem Formalizado se reabre (por ejemplo, QA encuentra un bug), vuelve
a En curso con una línea en la Nota que diga por qué.

## Cuándo escribir

- **Algo se posterga:** agregar el ítem con estado Propuesto en ese
  momento, no al final. Lo que queda dicho solo en la conversación se
  pierde.
- **Se prioriza:** actualizar el campo Prioridad donde está el ítem. No
  se reordena el archivo ni se mueve de sesión.
- **Se empieza a trabajar:** pasar a En curso.
- **Se implementa y se cierra:** pasar a Formalizado y completar
  `Resuelto`. La entrada queda en su sesión de origen, no se borra.
- **Se descarta:** pasar a Descartado y poner el motivo en `Resuelto`.
- **Antes de cerrar la sesión:** repasar la conversación buscando ideas
  postergadas que no quedaron anotadas, y agregarlas.

## Qué no es esto

No es un requerimiento formal, ni la bitácora de sesiones, ni el registro
de decisiones. Si el ítem termina en una decisión con opciones y motivo,
esa decisión va a `hpaul-decision-log`.
