---
name: hpaul-backlog-triage
description: >
  Captura ideas o mejoras mencionadas en cualquier sesión de trabajo (con
  cualquier ingeniero activo, no solo Paul) que no se formalizan en el
  momento como REQ. Usar cuando surja una idea que se posterga ("después lo
  vemos", una mejora identificada pero no implementada ya) y cuando se
  decida promover un ítem de skills/hpaul-backlog/BACKLOG.md a un REQ formal.
---

# Backlog de ideas sin formalizar

Etapa previa a un REQ: skills/hpaul-backlog/BACKLOG.md es donde vive una
idea entre el momento en que se menciona y el momento en que se formaliza
o se descarta. No reemplaza docs/requerimientos/REQ-XXX.md ni
bitacora/AÑO/MES.txt — bitácora registra lo que ya se hizo, BACKLOG.md
registra lo que falta decidir o construir.

## Cuándo escribir
- Idea que no se formaliza en el momento → agregar a skills/hpaul-backlog/BACKLOG.md, estado Propuesto.
- Se decide priorizar → actualizar el campo Prioridad del ítem, no reordenar el archivo.
- Se formaliza como REQ → actualizar estado a "Formalizado como REQ-XXX", la entrada queda, no se borra.
- **El hallazgo es sobre un REQ que YA existe** (diagnóstico, prueba, dato
  nuevo que cambia el enfoque de un REQ ya formalizado en
  docs/requerimientos/REQ-XXX.md, aunque siga sin implementar) → esto NO es
  un ítem nuevo de backlog. Actualizar **directamente el REQ-XXX.md**
  correspondiente en la misma sesión en que surge el hallazgo (sección
  "Enfoque propuesto" o la que aplique, y el Estado si corresponde).
  Solo si además conviene tener el hallazgo indexado en
  skills/hpaul-backlog/BACKLOG.md, agregarlo ahí como referencia cruzada al
  REQ — nunca como el único lugar donde vive la información.
- Antes de cerrar cualquier sesión: repasar la conversación buscando ideas
  mencionadas que no quedaron ni en un REQ ni en
  skills/hpaul-backlog/BACKLOG.md, y agregarlas — y buscar también
  hallazgos sobre REQs ya existentes que solo quedaron en BACKLOG.md o en
  la bitácora, para propagarlos al REQ-XXX.md correspondiente.

## Qué no es esto
No es un REQ. No lleva Objetivo, Alcance ni Criterios de aceptación — eso se
define recién cuando se promueve a REQ formal.
