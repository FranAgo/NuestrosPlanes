> **Origen:** copiada tal cual del proyecto sis-web
> (`C:\0002-SIS-WEBS\0001-sis-web\docs\skills\METODOLOGIA.md`) el
> 2026-09-27 (DEC-001). Los `DEC-XXX`, `BL-XXX` y ejemplos que menciona
> (Firestore, `render()`, InSIS) son de **sis-web**, no de este repo: se
> dejan como historia de por qué el proceso es así. Lo que vale acá es el
> proceso (secciones 1, 2, 4 y 9). Las pasadas por ingeniero de
> Peroncitos se registran en `docs/skills/INVENTARIO.md`.

# Metodología de mejora de skills (ingenieros y herramientas)

Proceso acordado con Franco el 2026-09-25 para revisar, limpiar y ampliar
los skills del equipo (los 7 ingenieros y sus herramientas `h<ing>-*`).
Se aplica de a un ingeniero por sesión. Las decisiones que salen de cada
pasada se registran en `docs/decisiones.md` (formato ADR).

Base: [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
de Anthropic, más investigación sobre personas y debate multi-agente (ver
"Por qué no opinan los 7" al final).

## 1. Tipos de pieza

Cada bloque de texto de cada skill tiene que caer en exactamente uno de
estos tipos. Si no cae en ninguno, sobra.

| Tipo | Qué es | Dónde vive | Ejemplo |
|---|---|---|---|
| Persona | Cómo piensa y decide un rol: protocolo y checklist propios | `.claude/skills/<nombre>-engineer-*/` | `paul-engineer-pm` |
| Herramienta | Un procedimiento concreto (pasos, checklist o script) | `.claude/skills/h<ing>-*/` | `hpaul-triage` |
| Catálogo | Conocimiento de consulta, un archivo por tema | skill con archivos por tema | `convenciones-tecnicas` |
| Datos | Lo que una herramienta lee o escribe | `docs/` del proyecto | `docs/backlog.md` |
| Regla del proyecto | Algo que vale siempre en este repo | `CLAUDE.md` | reglas de deploy |

Reglas que se desprenden de la tabla:
- **Una skill nunca contiene datos del proyecto.** Si una skill se copia a
  otro proyecto (o existe también a nivel de cuenta de claude.ai), los
  datos viajan con ella. Así se contaminó el backlog en 2026-09 (ver
  DEC-002).
- **El prefijo marca quién mantiene la herramienta, no quién puede usarla.**
  `hjay-*` la mantiene Jay; cualquier ingeniero la usa si le sirve.
- **La persona nombra sus herramientas y dice cuándo usarlas; no copia su
  contenido.** El cómo vive en un solo lugar.

## 2. Fases (por ingeniero)

**Fase 0: inventario (una vez, se actualiza al cierre de cada pasada).**
Qué skills hay, de qué tipo, cuánto miden, quién referencia a quién.
Resultado: `docs/skills/INVENTARIO.md`.

**Fase 1: análisis de la persona.** Leer su `SKILL.md` completo y
clasificar cada bloque con la tabla de tipos. Marcar:
- lo que es de la persona y queda,
- procedimientos metidos adentro (candidatos a herramienta),
- lo específico del proyecto (va a `CLAUDE.md`),
- lo duplicado, muerto o de relleno de personaje (se elimina). Se
  conservan el protocolo y los checklists; el tono y el color se recortan
  al mínimo (ver sección 5).

**Fase 2: análisis de sus herramientas.** Por cada una: ¿es genérica o
arrastra cosas del proyecto? ¿la descripción dice qué hace y cuándo
usarla? ¿tiene datos adentro? ¿se usa de verdad? (evidencia: bitácora,
`git log`).

**Fase 3: limpieza y separación.** Mover datos a `docs/`, reglas a
`CLAUDE.md`, sacar duplicados. Actualizar todas las referencias (grep).
En esta fase no se crea nada nuevo. Las menciones en la bitácora de meses
anteriores son historia y no se reescriben.

**Fase 4: conexión.** La persona referencia sus herramientas por nombre.
Si una herramienta le sirve a otro ingeniero, se suma una línea en la
persona de ese ingeniero, sin duplicar la herramienta.

**Fase 5: herramientas nuevas, solo con evidencia.** Cada candidata
necesita un caso real (bug repetido, paso que se olvidó, proceso de varios
pasos que siempre se hace igual). Sin caso, no se crea. Las que pasan el
filtro:
1. se escriben 3 escenarios de prueba,
2. se mira qué hace Claude sin la skill (línea base),
3. se escribe lo mínimo que cierre la diferencia (con `skill-creator`).
Nivel de libertad según fragilidad: texto donde varios caminos son
válidos; script ejecutable donde un error cuesta caro (permisos, deploy,
reglas de Firestore).

**Fase 6: validación y cierre.**
- **Claude B:** un subagente limpio, que no vio la conversación, recibe
  los escenarios de prueba y se observa si activa y usa bien las skills.
  Consigna: no escribir nada, mostrar el texto exacto que agregaría,
  contrastar los datos reales contra lo que dice la skill y buscar
  contradicciones entre skills y `CLAUDE.md`.
- **Revisión:** opinan el dueño de la skill y los ingenieros que la usan,
  no los 7. Duck no opina: verifica con evidencia.
- Decisiones a `docs/decisiones.md`, entrada en la bitácora, inventario
  actualizado, commit y push.

## 3. Orden

1. Paul (piloto: ya tiene herramientas y problemas conocidos).
2. Ajustar esta metodología con lo aprendido.
3. Jay (`hjay-identidad-visual`) y `convenciones-tecnicas` (transversal).
4. Julia, Duck, Bob, Gary, Roy.

No toca código de la app: no hay deploy.

## 4. Checklist de salida de una skill

- [ ] `description` en tercera persona, dice **qué hace y cuándo usarla**,
      con frases que el usuario diría de verdad.
- [ ] Hace una sola cosa.
- [ ] Sin datos ni rutas del proyecto, salvo que la skill sea
      explícitamente del proyecto (como `convenciones-tecnicas`).
- [ ] No repite contenido de otra skill.
- [ ] Dice qué **no** es.
- [ ] Sin información con fecha que vaya a quedar vieja.
- [ ] Referencias a otros archivos a un solo nivel de profundidad; índice
      al principio si un archivo pasa las 100 líneas.
- [ ] `SKILL.md` de menos de 500 líneas.
- [ ] Probada por Claude B con al menos 3 escenarios.

## 5. Aprendizajes del piloto (Paul, 2026-09-25)

- **Claude B vale más que cualquier revisión de opinión.** Con 4
  escenarios encontró 9 fallas que la escritura no había visto: formato
  de encabezados que no anidaba, estados del backlog que no coincidían
  entre la persona y la herramienta, el cierre de ítems que chocaba con el
  nivel liviano de `CLAUDE.md`, un checklist de cierre de sesión que no
  existía. Se mantiene como paso obligatorio.
- **Pedirle a Claude B que contraste los datos contra la skill.** Varios
  hallazgos salieron de comparar cómo están escritos los datos reales con
  lo que la skill dice. Se suma a su consigna.
- **Pedir que no escriba nada y que muestre el texto exacto.** Así se
  prueba sin ensuciar los datos y se ve el formato real que produce.
- **Fase 5 sin herramienta nueva es un resultado válido.** El problema
  real de Paul (ideas postergadas que no se anotaban) era de activación y
  de cierre de sesión, no de falta de herramienta: se resolvió con la
  descripción de `hpaul-triage` y el checklist de cierre en `CLAUDE.md`.
- **Los datos históricos no se reescriben** al cambiar un formato: se
  migra lo mecánico (niveles de encabezado) y se deja una nota.

## 6. Aprendizajes de la pasada de Jay (2026-09-25)

- **La Fase 5 puede terminar en temas de catálogo, no en herramientas.**
  Los errores repetidos de Jay (foco perdido por `render()`, cuatro veces;
  nombres tapados en JS, dos veces) eran cuidados del proyecto: fueron a
  `convenciones-tecnicas` como temas nuevos, no a una skill `hjay-*`.
- **Contrastar las skills contra el código, no solo contra los datos.**
  Claude B leyó el código real y encontró que una regla recién escrita
  llevaba a un cambio innecesario (sumar pantallas a `hayEdicionEnCurso()`)
  y que dos ejemplos de "ya está bien hecho" no lo estaban.
- **Las personas viejas asumían chat, no repo.** "Entregá el archivo
  completo" o "ordená el código desordenado" son dañinos con un archivo de
  20.000 líneas y fixtures de golden master. Revisar ese supuesto en cada
  persona.
- **Choques entre skills:** pedirle a Claude B que busque pares de reglas
  que no se pueden cumplir a la vez (por ejemplo, estilo inline y `:hover`).
- **La línea base se corre antes de escribir la skill, o con la consigna de
  no leerla.** En BL-019 el borrador ya estaba en el repo y el subagente de
  línea base lo encontró y lo usó: hubo que repetirla con la prohibición
  explícita de abrir esos archivos.
- **La línea base también enseña.** Sin la skill, el modelo ya medía en vez
  de mirar capturas y tipeaba con teclado real. Eso quedó en la skill
  solo como una tabla corta, porque en sesiones reales sí falló. Y se sumó
  algo que trajo solo la línea base: la escala de Windows (125% → 1536px).

## 7. Aprendizajes de la pasada de Julia (2026-09-25)

- **Escenarios sacados de pedidos reales, no de la skill.** Claude B
  siguió los 4 escenarios hasta el código y encontró 5 hallazgos de
  seguridad reales que ninguna revisión anterior había visto. Se verifican
  a mano antes de registrarlos: si una skill enseña a separar hallazgo de
  hipótesis, su propia validación no puede presentar hipótesis.
- **Una regla absoluta se prueba con un caso donde no se puede cumplir.**
  "Interfaz y reglas tienen que decir lo mismo" sonaba bien y no se podía
  aplicar a un valor calculado con campos que la base entrega completos
  (DEC-029).
- **Revisar qué stack asume la persona.** La de Julia tenía un checklist
  de backend clásico (SQL, hash, rate limiting) para un sistema sin
  servidor propio; lo que importaba era qué capa decide.

## 8. Aprendizajes de las herramientas de Julia (2026-09-26)

- **Una línea base fuerte achica la herramienta, no la elimina.** El
  modelo ya conocía los riesgos; lo que faltaba era evidencia en cada
  paso (tests que fallan contra la versión vieja, cada eslabón con su
  `archivo:línea`). La herramienta quedó como orden y evidencia, sin
  repetir el checklist de la persona.
- **Los escenarios de seguridad encuentran hallazgos reales otra vez.**
  Igual que en la pasada de la persona: 5 hallazgos y 3 hipótesis nuevos.
  Se verificaron a mano antes de registrarlos.
- **Probar la definición con el caso que la rompe.** "Con una sola capa es
  hipótesis" sonaba prudente y degradaba un hallazgo real (DEC-035).
- **Una herramienta no manda a hacer algo que una regla del proyecto
  prohíbe.** `git stash` de todo el árbol se lleva cambios ajenos
  (`CLAUDE.md`): quedó `git stash push -- <archivo>`.

## 9. Por qué no opinan los 7 en cada cambio

Los 7 ingenieros son el mismo modelo con distinto rol. La investigación
sobre debate multi-agente muestra que la mejora viene de la diversidad
real y del efecto de juntar varias respuestas, no de la especialidad del
personaje, y que forzar a un rol a contradecir a otro rinde peor. También
hay evidencia de que las personas de "experto" pueden bajar la precisión
en preguntas de conocimiento, y que los detalles de personaje irrelevantes
meten ruido.

Conclusión práctica: el valor de cada ingeniero es **su checklist**, no su
personaje. Por eso revisan el dueño y los que usan la herramienta, y la
validación real es una prueba (Claude B, tests), no una ronda de opiniones.

Fuentes: [Debate or Vote](https://arxiv.org/html/2508.17536v1),
[Should we be going MAD?](https://openreview.net/pdf?id=CrUmgUaAQp),
[Expert Personas Improve Alignment but Damage Accuracy](https://arxiv.org/html/2603.18507v1),
[Playing Pretend (Wharton)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5879722).
