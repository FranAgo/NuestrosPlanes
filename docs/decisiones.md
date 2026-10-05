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

## DEC-010 — Miniaturas: `thumbnailLink` de Drive por REST desde el servidor, a 200 px
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: REQ-PERF-004 / BL-030. Cada vista previa bajaba la foto entera: 7,6 MB y 33 s para 16 fotos.
- Opciones consideradas: dónde sale la miniatura: (A) `thumbnailLink` de Drive, bajado en el servidor; (B) generarla en el navegador al subir y guardarla en una columna de `Archivos`. Cómo llamar a Drive: (1) Servicio Avanzado `Drive.Files.get`; (2) API REST con `UrlFetchApp.fetchAll` y el token del script.
- Decisión: A + 2. Franco aprobó el alcance a las 10:56 (hora Argentina) y el parche a 200 px después de la medición en producción.
- Motivo:
  - (B) toca la subida y la hoja, y no sirve para las fotos que ya están subidas.
  - (2) no cambia el manifiesto, porque los scopes ya estaban. Además pide todas las miniaturas en paralelo, mientras que con el Servicio Avanzado van de a una.
  - 200 px alcanzan para celdas de 64 a 80 px en pantallas 2x. A 320 px eran ~31 KB por foto.
  - No tiene costo: usa la cuota gratis de `UrlFetchApp`, de 20.000 llamadas por día.
- Reabrir si: Drive deja de generar `thumbnailLink` para las fotos de la app, la cuota empieza a quedar corta, o hace falta mostrar las miniaturas sin pasar por el servidor.


## DEC-011 — Se sigue con Apps Script y Sheets; migrar a Firebase solo si se cumple una condición concreta
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: BL-032. Medido en test: cada pedido al Web App tarda de 1,5 a 4,5 s aunque no haga nada (mediana ~2,2 s), y leer una hoja ~200 ms. La lentitud es de la plataforma por pedido, no de la planilla. Franco preguntó si vale la pena cambiar de sistema.
- Opciones consideradas: (A) seguir con Apps Script y Sheets, y esquivar el costo por pedido desde el front (mostrar lo ya cargado y releer de fondo, menos pedidos); (B) migrar ahora a Firebase (Firestore, Storage y Auth con Google); (C) otro backend (Supabase, Cloudflare Workers).
- Decisión: A (Franco, 2026-09-28). Primer paso: opción (a) de BL-032.
- Motivo:
  - Lo que traba se puede esquivar desde el front, porque las fotos y miniaturas ya se guardan en el navegador. Migrar costaría rehacer 22 endpoints (~2.950 líneas de `Code.gs`), perder las pruebas de `Tests.gs`, migrar las hojas y las fotos de Drive, y volver a revisar la seguridad (sesión, lista blanca, BL-015, auditoría de la Ley 25.326).
  - Si se migra, el candidato es B: lecturas de cientos de ms, datos guardados en el teléfono, cambios del otro al instante (REQ-SYNC-001), y el equipo ya lo conoce por sis-web. C no suma nada frente a B para este caso.
  - La migración iría por etapas (datos y login primero, fotos en Drive al principio) y en paralelo hasta confirmar que la nueva versión anda.
- Reabrir si: (1) con la opción (a) de BL-032 y BL-001 hechas, abrir la app o una tarea en el teléfono se sigue sintiendo lento; (2) hace falta ver los cambios del otro en 1–2 s (REQ-SYNC-001); (3) los videos (BL-023) pasan a ser una necesidad real; (4) aparecen errores por cuotas de Apps Script.

## DEC-012 — Pedido en curso en la tarjeta: se muestra y se bloquea, sin cambio optimista
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: Franco probó 1.2.2: reabrir tardaba ~6 s sin aviso, y "Estoy de acuerdo" parecía congelado y cambiaba varias veces si se clicaba mucho (REQ-PLAN-001, ajuste 1.2.3).
- Opciones consideradas: reabrir (A) la tarjeta avisa "Reabriendo…" hasta que el servidor responde, o (B) vuelve a pendiente al toque y se revierte si falla; acuerdo (A) "Guardando…" con el botón bloqueado, o (B) el botón cambia al toque, nunca se bloquea y se manda solo el estado final.
- Decisión: A y A (Franco, 2026-09-28: "ambos coinciden en diseño"). Jay había recomendado B para el acuerdo.
- Motivo: los dos estados se ven y se comportan igual; nunca se muestra algo que después se deshace. Reabrir igual baja a la mitad porque deja de releer la lista.
- Reabrir si: con la red del celular la espera de "Guardando…" molesta más que un cambio que a veces se revierte.

## DEC-013 — Rediseño premium: qué técnicas entran y cuáles no
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: BL-034 (contraste) creció a REQ-UX-002: Franco quiere que la app se vea más premium sin perder su carácter, "con criterio", y confía el criterio a Jay. Investigación: `docs/investigacion/2026-09-28-diseno-premium.md`.
- Opciones consideradas: (A) solo subir el contraste de la paleta actual (niveles B o C del mockup de BL-034); (B) rediseño con un subconjunto elegido de técnicas (superficies en capas, bordes semitransparentes con filo de luz, cobre metálico escaso, atmósfera con grano, más aire, movimiento corto); (C) adoptar el lenguaje de las landing SaaS (glass en todo, bordes con degradé animado, brillos que siguen al mouse).
- Decisión: B (Franco aprobó el plan de REQ-UX-002 el 2026-09-28).
- Motivo: A arregla la legibilidad pero no suma lo premium que pidió Franco. C es caro en el celular de Noelia, baja la legibilidad, no funciona sin mouse y no encaja con una app íntima. B mantiene fuentes y colores y cumple 4,5:1.
- Reabrir si: después de la fase 1 el mockup no convence a Franco, o alguna técnica de B cuesta rendimiento medible en el celular.

## DEC-014 — Paleta B "Profunda", tarjeta completada con sello y línea verde, corazón metálico
- Fecha: 2026-09-28
- Estado: Aceptada
- Contexto: REQ-UX-002, fase 1. Mockup interactivo de Jay (Artifact, no versionado) con la paleta actual (1.2.4) al lado de dos propuestas que pasan todos los pares de `check-contraste.js`. Franco marcó además que la tarea completada cuesta distinguirla a simple vista y que el corazón se veía deforme.
- Opciones consideradas: paleta (A) "Cálida", con los fondos de hoy y más luz en textos y bordes, o (B) "Profunda", con fondo casi negro y un cobre más dorado. Tarjeta completada: (1) tinte verde en toda la tarjeta, (2) sello verde con tilde en lugar de la píldora, (3) línea verde fija arriba y píldora rellena, o combinaciones.
- Decisión: paleta B y tarjeta completada con sello + línea verde (Franco, 2026-09-28). Jay había recomendado A, y para la completada, tinte + sello. Durante la fase 2 Franco sumó que el fondo de la completada sea negro verdoso, como el negro rojizo del vencido (`--bg-card-done: #101812`).
- Motivo: B da más contraste y más dramatismo sin cambiar fuentes ni acento. El sello se reconoce sin leer, y la línea verde retoma la línea cobre del hover que ya existe, así que no es un recurso nuevo. En los dos casos el texto de la completada se lee (deja de estar al 55 % de opacidad).
- Reabrir si: en el celular de Noelia el fondo casi negro o el grano se ven mal, o la completada sigue costando distinguirse con la app real.

## DEC-015 — Visor de fotos: pantalla completa con tira de miniaturas (variante B)
- Fecha: 2026-10-02
- Estado: Aceptada
- Contexto: BL-027 y BL-028, formalizados como REQ-MEDIA-006. Mockup interactivo de Jay (widget en la conversación, no versionado) con tres variantes de visor para el teléfono. Franco preguntó si la B tenía sentido de diseño y pidió investigar cómo lo hacen las apps grandes (`docs/investigacion/2026-10-02-visor-de-fotos.md`).
- Opciones consideradas: (A) inmersivo, solo la foto, con "Cambiar fecha" en un menú ⋯; (B) igual que A más una tira de miniaturas abajo; (C) foto arriba y un panel fijo abajo con la fecha a la vista.
- Decisión: B (Franco: "siento que me da más control"), con tres ajustes que salieron de la investigación: botón (i) y deslizar hacia arriba para los detalles en vez de ⋯; miniaturas de 44 px (las de Apple son chicas porque se arrastran, las nuestras se tocan); deslizar hacia abajo para cerrar. Mientras se edita la fecha, la tira y la leyenda se esconden y el editor ocupa su lugar. Jay había recomendado A.
- Motivo: B es el patrón de Fotos del iPhone, que usan los dos. Baymard encontró que sin miniaturas la gente no sabe cuántas fotos hay y pasa de largo. C deja la foto en poco más de la mitad de la pantalla, casi como hoy.
- Reabrir si: en el celular la tira tapa demasiado la foto o los gestos se disparan sin querer.

## DEC-016 — El estado de un pedido vive solo en su REQ, con datos que no vencen
- Fecha: 2026-10-05
- Estado: Aceptada
- Contexto: los estados de REQ y backlog quedaban desactualizados una y otra vez (REQ-MEDIA-002, PERF-002 y PERF-003 corregidos el 2026-09-16; REQ-MEDIA-004 el 2026-09-28; REQ-MEDIA-006 decía "falta el push" estando en prod; seis BL "En curso" con su REQ ya hecho). Causas: el estado se escribía antes del push y nada lo actualizaba después, y estaba copiado en el REQ, en el BL, en la bitácora y en la memoria. Franco pidió ver cómo lo hacen otros: `docs/investigacion/2026-10-04-estado-de-requerimientos.md`.
- Opciones consideradas: (A) seguir igual y sumar un paso "actualizar estado después del push" al checklist; (B) pasar REQ y BL a GitHub Issues, con el estado movido por `Closes #N`, como Linear, GitHub o Jira; (C) adaptar esas prácticas a los archivos del repo: un solo lugar para el estado (el REQ), datos que no vencen (`Versión`, como el "Fix Version" de Jira o el `milestone` de los KEP) y un chequeo automático en `check-sintaxis.js` en lugar del evento que mueve el estado.
- Decisión: C (Franco, 2026-10-05).
- Motivo: A depende de acordarse, que es lo que ya falló cinco veces. B es lo que hacen las empresas, pero saca el estado de los archivos que leen las skills y la bitácora, y para dos personas es más de lo que hace falta. C saca la causa (estados que vencen y copias) y el chequeo cubre lo que hacía el evento automático.
- Reabrir si: el chequeo deja pasar estados viejos de nuevo, o el proyecto suma gente o un tablero y conviene pasar a GitHub Issues.
- Ajuste (2026-10-05, mismo día): el primer chequeo buscaba frases conocidas ("falta el push") y en la misma sesión se coló "sin deploy todavía" en el backlog. Se cambia a formato fijo: la línea de estado solo admite el valor y una fecha o versión, y todo el texto libre pasa a `Historia:` (REQ) o `Resuelto:` (BL). Se rechaza lo que no tenga la forma, en lugar de buscar lo prohibido.

## DEC-017 — Precarga del visor según la conexión, automática y con opción manual en Mi perfil
- Fecha: 2026-10-05
- Estado: Aceptada
- Contexto: el visor tardaba ~4 s por foto (BL-036). Franco pidió precargar con wifi y ahorrar datos con el celular. Investigación: `docs/investigacion/2026-10-05-visor-foto-siguiente.md`. Las apps nativas (WhatsApp, Instagram) le preguntan al sistema operativo qué red hay y dejan que el usuario elija qué hacer con cada una; una página web solo lo sabe en Chrome de Android (`navigator.connection`), no en Safari del iPhone ni en la computadora.
- Opciones consideradas: (1) automático donde se puede y una regla fija donde no (táctil ahorra, mouse precarga); (2) solo una opción manual en Mi perfil, como WhatsApp; (3) las dos: automático por defecto y la opción manual para cambiarlo. Para la pantalla: Mi perfil con el control en la tarjeta actual (A) o por secciones (B); en la computadora, columna centrada (A), dos columnas (B) o opciones en fila (C). Fuera: una app nativa para tener el dato del iPhone (otro proyecto).
- Decisión: 3, con Mi perfil por secciones y dos columnas desde 720 px (Franco, 2026-10-05; REQ-MEDIA-007, 1.6.0 y 1.6.1).
- Motivo: en el iPhone el navegador no dice si hay wifi, así que sin la opción manual nunca precargaría; con solo la manual, Android y la computadora no aprovecharían lo que sí se sabe. Las secciones dejan lugar para los ajustes que vengan en Mi perfil.
- Reabrir si: Safari implementa `navigator.connection`, si los datos móviles se vuelven un problema aun en "lo justo", o si la app pasa a ser nativa.

## DEC-018 — "Algún día": ideas sin fecha agrupadas por categoría (variante A)
- Fecha: 2026-10-05
- Estado: Aceptada
- Contexto: REQ-PLAN-003, pedido de Noelia. Investigación: `docs/investigacion/2026-10-05-ideas-sin-fecha.md`. Mockup de Jay (widget en la conversación, no versionado) con tres variantes, teléfono y computadora.
- Opciones consideradas: (A) un título por categoría y las ideas de la más vieja a la más nueva; (B) una sola lista por antigüedad con filtro por categoría; (C) secciones plegables por categoría. Después, una mezcla: A por defecto, secciones plegables y un botón "Todas juntas" para la vista B. Aparte: si "Todos" incluye ideas y si una idea se puede completar sin fecha. Una hoja aparte para las ideas contra la misma hoja `Planes` sin fecha.
- Decisión: A tal como estaba en el primer mockup (Franco: "dejamos la variante A original"). "Todos" muestra solo planes con fecha y una idea no se completa sin ponerle fecha antes ("las ideas sin definir días aún no son realmente un plan"). Misma hoja `Planes`, idea = `fecha_programada` vacía. Nombre del chip: "Algún día". Jay había recomendado A; Paul, la mezcla con todo abierto al entrar.
- Motivo: A obliga a ver todas las ideas cada vez que se entra, que es el objetivo (ponerles fecha). Plegar o separar en otra vista esconde justo lo que se quiere que no se olvide. Con la misma hoja, pasar a plan es ponerle fecha: fotos, auditoría y permisos no cambian.
- Reabrir si: las ideas pasan a ser tantas que la lista se vuelve larga de recorrer en el teléfono.

## DEC-019 — Un plan con fecha no vuelve a ser idea
- Fecha: 2026-10-05
- Estado: Aceptada
- Contexto: REQ-PLAN-003 no decía qué pasa si al editar un plan se le borra el día de inicio. Hasta 1.7.0, `updatePlan` tomaba una fecha vacía como "no la cambies".
- Opciones consideradas: (A) no se puede: la fecha se cambia pero no se vacía; (B) se puede si está pendiente: vuelve a "Algún día" y se borran los acuerdos de cierre, Termina y Vencimiento.
- Decisión: A (Franco, 2026-10-05; era la recomendada por Bob). El servidor sigue ignorando una fecha vacía al editar y el front avisa "Un plan con fecha no puede quedar sin fecha".
- Motivo: el contrato de `updatePlan` casi no cambia y no hay que decidir qué pasa con los acuerdos que ya se dieron.
- Reabrir si: en uso aparece la necesidad de "postergar sin fecha" un plan ya agendado.
