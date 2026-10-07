> **Origen:** copiada tal cual del proyecto sis-web
> (`C:\0002-SIS-WEBS\0001-sis-web\docs\skills\METODOLOGIA.md`) el
> 2026-09-27 (DEC-001). Los `DEC-XXX`, `BL-XXX` y ejemplos que menciona
> (Firestore, `render()`, InSIS) son de **sis-web**, no de este repo: se
> dejan como historia de por qué el proceso es así. Lo que vale acá es el
> proceso (secciones 1, 2, 4 y 13). Las secciones 9 a 12 (pasadas de
> Duck, Bob, Gary y Roy en sis-web) se sumaron el 2026-10-06, al traer
> sus herramientas (DEC-021). Las pasadas por ingeniero de
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

## 9. Aprendizajes de la pasada de Duck (2026-10-05)

- **Una persona que trae el procedimiento adentro da una línea base
  engañosa.** Sin las herramientas, Duck ya hacía casi todo porque la
  persona tenía los pasos. Las herramientas salieron igual (DEC-042): la
  persona quedó con el qué y el cuándo, y el "test en rojo" se activa en
  cualquier sesión, aunque Duck no esté.
- **Medir también lo que se hace de más.** El hueco más claro de la línea
  base fue el exceso (mutantes y reportes de cambio de fondo en un ajuste
  chico), no la falta. La herramienta tiene una tabla de proporción.
- **Una regla que el modelo ve y acepta igual necesita un paso propio.**
  La línea base vio que su golden master dependía del día y siguió "porque
  el riesgo es bajo". Por eso hay un paso que repasa el catálogo contra
  lo escrito y obliga a preguntar.
- **Claude B en paralelo con la escritura ve archivos a medio cambiar.**
  Uno de los dos vio los cambios de la sesión aparecer y los tomó por otra
  sesión. Lanzar Claude B recién cuando los archivos estén quietos, o
  decirle qué se está editando.
- **Los escenarios de tests vuelven a encontrar bugs reales** (BL-050 y su
  variante, BL-051 confirmado, BL-057). Se verifican a mano antes de
  registrarlos, igual que en seguridad.

## 10. Aprendizajes de la pasada de Bob (2026-10-06)

- **Los topes de tamaño de una decisión sirven.** El primer borrador de
  las dos herramientas sumaba 306 líneas contra un tope de 300 (DEC-045);
  compactarlo sacó repeticiones sin perder pasos. Las correcciones de
  Claude B también tuvieron que entrar en el tope.
- **Definir las palabras que deciden el nivel.** "Cambia una firma" y
  "toca un contrato" llevaban a que cualquier arreglo de un total fuera
  cambio de fondo. Los dos Claude B se trabaron en el mismo lugar. Se
  definió una vez y se repitió igual en la herramienta y en `CLAUDE.md`.
- **Dos herramientas hermanas pueden contradecirse entre sí.** "El código
  muerto trivial va en el mismo cambio" (impacto) chocaba con "nunca
  reorganizar en el mismo paso" (salud). Pedirle a Claude B los choques
  entre herramientas propias, no solo con otras skills.
- **"Sin diff" no prueba nada si nadie lo recorre.** Una reorganización
  con fotos idénticas pasó con 4 de 6 mutantes vivos. El criterio útil es
  si los tests muerden el código movido.
- **Los escenarios vuelven a encontrar bugs reales**, ahora de seguridad
  desde un pedido de back-end (BL-063: monto reservado deducible). Se
  verificaron a mano antes de registrarlos.

## 11. Aprendizajes de la pasada de Gary (2026-10-06)

- **Pedir la condición previa como paso.** En C2 la herramienta mandaba
  verificar en el código que el arreglo estuviera desplegado antes de
  corregir datos; así salió que BL-061 seguía abierto, cuando el pedido lo
  daba por hecho.
- **Contrastar los "dónde ya está bien" del catálogo contra la
  herramienta nueva.** `cerrarSaldoHistorico.js` figuraba como ejemplo
  bueno y cumplía poco de lo que la herramienta pide (valores anteriores,
  vuelta atrás, no pisar una OS abierta).
- **Definir qué pide aprobación también en lecturas.** Las reglas del
  proyecto hablaban solo de escrituras; leer producción o un ambiente con
  datos reales quedó con el OK del usuario por ambiente.
- **Lo propio del proyecto va al catálogo, aunque lo pida la
  herramienta.** Claude B pidió cómo simular contra el emulador, cómo no
  pisar una OS abierta y cómo reusar la fórmula: fue a `datos.md`, no a
  las herramientas, que siguen siendo de uso general. Con tres archivos al
  tope (300 y 150 líneas) las correcciones se pagaron compactando.
- **La proporción achicó la entrega, no el gasto.** Con la tabla, Claude
  B entregó planes y no scripts, pero igual gastó cerca de 200 mil tokens
  por subagente, ahora en verificar en el emulador. Los escenarios
  volvieron a encontrar bugs reales (BL-075 a BL-078), verificados a mano.

## 12. Aprendizajes de la pasada de Roy (2026-10-06)

- **Los escenarios basados en un pedido falso enseñan más que los
  verdaderos.** D1, D3 y D4 pedían deployar algo que no existía o que ya
  estaba publicado; los dos Claude B leyeron lo desplegado y frenaron. El
  paso que faltaba era qué hacer cuando el diff da vacío: se sumó.
- **Medir con la herramienta real, no con la del repo.** "Comparar contra
  el commit" sonaba exacto y daba "distinto" en todo: Windows publica la
  copia de trabajo con CRLF (BL-084). La regla correcta salió de comparar
  hashes de verdad.
- **Una herramienta nueva repite reglas de otra con matices propios, y se
  contradicen.** El orden "cierra un acceso" de `hroy-deploy` tenía una
  excepción que chocaba con Julia y con `seguridad.md`; quedó remitiendo a
  Julia. Pedirle a Claude B las citas de los dos lados sirvió para
  decidir rápido.
- **Una revisión periódica encuentra lo que nadie buscaba.** La primera
  pasada de `hroy-estado-infra` encontró un vencimiento ya pasado (Node 20
  de las acciones de GitHub, BL-085) que ni la línea base ni el
  diagnóstico habían visto, porque solo miraban el `node-version`.

## 13. Por qué no opinan los 7 en cada cambio

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
