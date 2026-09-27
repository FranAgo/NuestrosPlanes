---
name: hpaul-decision-log
description: >
  Consulta y registra decisiones del proyecto en formato ADR (una decisión
  por entrada, con contexto, opciones, motivo y condición para reabrirla).
  Usar antes de definir alcance, priorizar entre opciones o rechazar un
  pedido, para no repetir un debate ya cerrado; y al cerrar una decisión
  con más de una opción razonable, costosa de revertir o que alguien
  probablemente cuestione más adelante ("¿por qué se hizo así?", "¿esto ya
  lo habíamos hablado?", "dejemos registrado por qué elegimos X").
---

# Registro de decisiones (ADR)

Herramienta de Paul; la puede usar cualquier ingeniero que tome una
decisión con estas características.

## Dónde vive el registro

En el archivo que indique el `CLAUDE.md` del proyecto. Si no indica
ninguno, `docs/decisiones.md`. Si el archivo no existe, crearlo con un
título y una línea que explique para qué es.

## Antes de proponer o rediscutir algo

Buscar en el registro si el tema ya se decidió. Si hay una decisión
`Aceptada` sobre el tema, retomarla y decirle al usuario que ya estaba
resuelta, con su ID. Solo se reabre si hay información nueva o si se
cumple su condición de "Reabrir si".

## Cuándo registrar

Sí: había más de una opción razonable, revertirla cuesta, o es probable
que alguien la cuestione más adelante. No: decisiones obvias o de detalle
de implementación, que se ven en el código o en el commit.

## Formato

```markdown
## DEC-XXX — Título corto de la decisión
- Fecha: AAAA-MM-DD
- Estado: Aceptada
- Contexto: qué problema o pedido la disparó
- Opciones consideradas: las alternativas evaluadas (al menos 2)
- Decisión: qué se resolvió
- Motivo: por qué esa y no otra
- Reabrir si: condición concreta que ameritaría revisarla
```

El ID es el siguiente número libre del archivo.

- Si el usuario no dio algún campo (típicamente las opciones o el "Reabrir
  si"), proponelo vos y pedile que lo confirme o lo corrija. No lo dejes
  vacío ni lo inventes en silencio.
- Si la decisión ya estaba implementada y solo se está registrando ahora,
  decilo en el Contexto.

## Cuando una decisión cambia

Una decisión aceptada no se edita, porque se pierde por qué se pensaba
distinto antes. En su lugar:
1. Agregar una decisión nueva que diga en el Contexto a cuál reemplaza y
   qué cambió.
2. En la vieja, cambiar solo el Estado a `Reemplazada por DEC-YYY`.

## Qué no es esto

No es el backlog de tareas o ideas (eso es `hpaul-triage`) ni la bitácora
de lo que se hizo en cada sesión. Es solo el historial de por qué se
decidió lo que se decidió.
