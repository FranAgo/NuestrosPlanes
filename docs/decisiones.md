# Registro de decisiones

Por qué se decidió lo que se decidió, una decisión por entrada (formato
ADR). Datos del proyecto que mantiene la skill `hpaul-decision-log` (ahí
están el formato y cuándo consultar o agregar). Reemplaza a
`skills/hpaul-decisiones-producto/hpaul-decisiones-producto.md`, que hasta
el 2026-09-27 tenía solo la plantilla, sin entradas.

Una decisión aceptada no se edita: si cambia, se agrega una nueva que la
reemplaza y la vieja pasa a `Reemplazada por DEC-XXX`.

---

## DEC-001 — Skills del equipo reemplazadas por las de sis-web, en `.claude/skills/`, con los datos en `docs/`
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: Franco pidió traer las skills y lo útil del proyecto sis-web (`C:\0002-SIS-WEBS\0001-sis-web`), donde los 7 ingenieros y sus herramientas ya pasaron por una revisión (`docs/skills/METODOLOGIA.md`). En Peroncitos las skills vivían en `skills/` (Claude Code no las carga solas desde ahí, así que en la práctica se usaban las copias `anthropic-skills:*` de la cuenta, más viejas) y el backlog y las decisiones vivían adentro de carpetas de skills.
- Opciones consideradas: (1) actualizar el contenido y dejarlas en `skills/`; (2) reemplazarlas por las de sis-web con su misma estructura: `.claude/skills/` (skills del proyecto), datos en `docs/`, copias de la cuenta apagadas en este proyecto con `skillOverrides`.
- Decisión: opción 2, pedida explícitamente por Franco ("que las skills de este proyecto sean reemplazadas con las de sis web"). Las skills genéricas se copian tal cual (Gary con una línea de contexto generalizada); el catálogo `convenciones-tecnicas` de sis-web es propio de InSIS y no se copia: se arma uno de Peroncitos con los cuidados que salieron de bugs reales de este proyecto (bitácora de septiembre y memoria de Claude).
- Motivo: un skill con datos adentro los arrastra a donde se copie (así se contaminó el backlog de sis-web, su DEC-002); y con las skills en `skills/` convivían dos versiones distintas de cada ingeniero sin que quede claro cuál se usa.
- Reabrir si: sis-web vuelve a mejorar las skills genéricas y hay que decidir cómo mantener las dos copias en sincronía (hoy se copian a mano).

## DEC-002 — Dos niveles de control según el tamaño del cambio
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: hasta ahora todo cambio pasaba por el proceso completo (Paul organiza, cada ingeniero opina, Duck revisa paso a paso). En sis-web ese mismo proceso para ajustes chicos consumía demasiado tiempo y tokens, y se partió en dos niveles (su DEC-011). Franco eligió traer la misma regla.
- Opciones consideradas: (1) seguir con el proceso completo para todo; (2) dos niveles: ajuste puntual liviano y cambio de fondo completo.
- Decisión: opción 2. El criterio de cada nivel está en `CLAUDE.md`, sección "Nivel de control según el tamaño del cambio".
- Motivo: el proceso completo sigue donde el riesgo lo justifica (features, seguridad, modelo de datos, deploy a prod); un fix de una línea o un cambio de copy no necesita la opinión de los 7.
- Reabrir si: un ajuste tratado como liviano termina en un bug en producción que el proceso completo hubiera atajado.

## DEC-003 — Las skills de Peroncitos se mejoran acá; se deja de sincronizar con sis-web
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: la validación A/B (BL-014) encontró que `hjay-verificacion-visual` y `hjulia-revision-cambio` asumen una base con SDK y reglas (Firestore) y propuso mejoras genéricas (BL-020). DEC-001 dejó las skills genéricas como copias de sis-web, que se traían de nuevo a mano cuando sis-web las mejoraba (su condición de "Reabrir si").
- Opciones consideradas: (1) mejorarlas en sis-web y traerlas; (2) mejorarlas en Peroncitos y llevarlas después a sis-web; (3) mejorarlas en Peroncitos y dejar de sincronizar.
- Decisión: opción 3, pedida por Franco ("mejoralas acá; ya no tocamos sis-web a menos que indique lo contrario"). Desde ahora las skills de `.claude/skills/` son de este repo y evolucionan acá. DEC-001 sigue vigente en lo demás (estructura y datos en `docs/`).
- Motivo: Franco no quiere tocar sis-web desde este proyecto, y mantener dos copias en sincronía a mano no paga para una app de dos personas.
- Reabrir si: Franco pide volver a traer o a llevar skills entre sis-web y Peroncitos.
