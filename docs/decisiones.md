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

## DEC-004 — Subir fotos no anula el acuerdo para cerrar una tarea
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: REQ-PLAN-001 pide el acuerdo de los dos para cerrar una tarea. Faltaba definir qué pasa si alguien sube fotos después de que los dos dieron el acuerdo. En empresas, los sistemas de doble aprobación (GitHub, maker-checker) descartan la aprobación si el contenido cambió.
- Opciones consideradas: (1) el acuerdo se mantiene; (2) subir fotos borra los acuerdos; (3) se mantiene, pero se avisa "subió fotos después de tu OK".
- Decisión: opción 1. Franco: "la subida de fotos es independiente del acuerdo". También aceptó las reglas propuestas por Paul: cada uno solo cambia su propio acuerdo, reabrir borra los acuerdos, y las tareas que ya existen arrancan sin acuerdos.
- Motivo: el acuerdo es sobre si la salida o la tarea ya pasó, no sobre el conjunto de fotos. Anularlo con cada foto obligaría a ponerse de acuerdo de nuevo por algo que no cambia la decisión.
- Reabrir si: pasa que una tarea se cierra con fotos que uno de los dos no quería.

## DEC-005 — Fotos de tareas de varios días: una sola carpeta, con el nombre por el día de inicio
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: REQ-MEDIA-005 suma un día de fin opcional y agrupa las fotos por el día en que se sacaron. Había que decidir cómo se refleja en Drive y de dónde sale la fecha del nombre de la carpeta, que según REQ-MEDIA-002 era la de la primera foto subida.
- Opciones consideradas: estructura: (A) una sola carpeta, con el día en el nombre de cada archivo; (B) subcarpetas por día. Fecha de la carpeta: (1) la de la primera subida, como hoy; (2) el día de inicio de la tarea.
- Decisión: A + 2 (Franco, 2026-09-27, después de ver el ejemplo del viaje a Tandil).
- Motivo: con subcarpetas, corregir la fecha de una foto o cambiar el día de inicio o de fin obligaría a mover o renombrar cosas en Drive, y la app no usa Drive para agrupar. La fecha de inicio hace que el nombre no dependa de quién subió primero ni de cuándo, y deja los viajes en el mes en que empezaron.
- Reabrir si: alguien empieza a usar Drive directamente para mirar las fotos por día y el nombre del archivo no le alcanza.

## DEC-006 — El acuerdo para cerrar una tarea se muestra en la tarjeta, con una fila por persona
- Fecha: 2026-09-27
- Estado: Aceptada
- Contexto: REQ-PLAN-001 pide que cada uno dé su acuerdo para cerrar una tarea y que los dos vean el estado de los dos. Había que decidir dónde y cómo se ve.
- Opciones consideradas: (A) en la tarjeta: fila con los avatares y "Franco está de acuerdo · Noelia todavía no", botón "Estoy de acuerdo" y "Completar" deshabilitado con el motivo; (B) un solo botón que avanza ("Estoy de acuerdo" → "Esperando a Noelia" → "Completar tarea"), con "1 de 2"; (C) en la tarjeta solo la pill y los avatares, y el acuerdo adentro del modal de la tarea.
- Decisión: A (Franco, 2026-09-27, después de ver el mockup interactivo de Jay).
- Motivo: con dos personas, tener todo a la vista cuesta poco y cada uno ve sin abrir nada qué falta y de quién. B esconde quién está de acuerdo detrás de un número; C obliga a un toque más.
- Reabrir si: la tarjeta queda demasiado cargada al sumar el conteo de fotos (REQ-MEDIA-004) o si en el teléfono la fila no entra a 375 px.

## DEC-007 — Subir fotos a una tarea se confirma en un paso aparte
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: REQ-MEDIA-004. Franco pidió que la app pregunte antes de la subida final de fotos. Una foto subida no se puede borrar desde la app (BL-009), así que subir es irreversible.
- Opciones consideradas: (A) confirmación en un paso aparte, con las miniaturas y el aviso "Después no se pueden borrar desde la app"; (B) sin confirmación, el botón dice "Subir 3 fotos" y el aviso queda en texto chico debajo; (C) sin confirmación, la subida arranca a los 5 segundos y mientras tanto se puede deshacer.
- Decisión: A (Franco, 2026-09-28, después de ver el mockup interactivo de Jay).
- Motivo: frena justo antes de lo que no se puede deshacer, y con las miniaturas a la vista se nota si se coló una foto equivocada. B deja el aviso en letra chica; C no tiene vuelta atrás pasados los 5 segundos y no arranca si se cierra la app en ese lapso.
- Reabrir si: se implementa BL-009 (borrar una foto subida), porque ahí subir deja de ser irreversible y B alcanza.

## DEC-008 — Día de fin en el mismo renglón que el inicio, y la fecha de la foto se corrige antes y después de subir
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: REQ-MEDIA-005 suma un día de fin opcional a las tareas y una fecha por foto que se puede corregir a mano. Había que decidir cómo se carga el fin y dónde se corrige la fecha.
- Opciones consideradas: formulario: (A) "Empieza" y "Termina" lado a lado, con "Termina" vacío para un día; (B) un solo campo con el enlace "Dura más de un día" que abre el segundo. Corrección de fecha: (A) se ve y se cambia en "Por subir" antes de subir, y también en el visor después; (B) solo en el visor, con la foto ya subida.
- Decisión: A y A (Franco, 2026-09-28, después de probar el prototipo interactivo de Jay).
- Motivo: con los dos campos a la vista se entiende sin descubrir nada que una tarea puede durar varios días. Ver la fecha antes de subir avisa en el momento de una foto sin fecha de captura (iPhone al compartir, capturas de pantalla), cuando corregirla cuesta menos; en el visor queda para las que ya se subieron.
- Reabrir si: el formulario queda apretado en el teléfono o casi nadie usa el día de fin.

## DEC-009 — Versionado de la app: SemVer único, tag en cada salida y CHANGELOG para los usuarios
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: BL-029. Franco preguntó si llevábamos versionado. No había: el servidor tiene los números de deploy de Apps Script (@27) y el front solo commits en `main`, sin forma de saber qué versión tiene abierta cada teléfono ni qué front va con qué servidor.
- Opciones consideradas: esquema: (A) SemVer `MAYOR.MENOR.PARCHE`; (B) CalVer (`2026.09`). Alcance: (1) una versión para toda la app; (2) una para el front y otra para el servidor.
- Decisión: A + 1 (Franco, 2026-09-28, después de ver la investigación de Roy). MENOR = un REQ nuevo, PARCHE = un bug o ajuste, MAYOR = un cambio que obliga a actualizar front y servidor a la vez. Arranca en `1.0.0` = lo que está en prod hoy; REQ-MEDIA-003 sale como `1.1.0`. Constante `APP_VERSION` en `index.html` y `Code.gs`, visible en el perfil; tag anotado `vX.Y.Z` en git y la misma versión en la descripción del deploy de Apps Script; `CHANGELOG.md` en formato Keep a Changelog, en castellano y para Franco y Noelia (la bitácora sigue siendo el registro técnico).
- Motivo: CalVer sirve cuando se publica en fechas fijas y acá se publica cuando algo está listo. Una sola versión evita tener que cruzar dos números para saber qué anda con qué, que es justo el problema que se quiere resolver.
- Reabrir si: el front y el servidor empiezan a salir tan desacoplados que una sola versión deja de describir lo que está en prod.
