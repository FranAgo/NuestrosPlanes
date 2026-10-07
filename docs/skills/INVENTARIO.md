# Inventario de skills

Fase 0 de `docs/skills/METODOLOGIA.md`. Se actualiza al cerrar cada pasada
o cada vez que se traen versiones nuevas desde sis-web. Última
actualización: 2026-10-06 (versiones 2.0 de sis-web: herramientas de Duck,
Bob, Gary y Roy, DEC-021).

## Skills del repo (`.claude/skills/`)

| Skill | Tipo | Dueño | Origen | Estado en Peroncitos |
|---|---|---|---|---|
| `paul-engineer-pm` | Persona | Paul | sis-web 2026-10-06, tal cual | Sin pasada propia |
| `hpaul-decision-log` | Herramienta | Paul | sis-web, tal cual (igual a la de hoy) | Sin pasada propia |
| `hpaul-triage` | Herramienta | Paul | sis-web, tal cual (igual a la de hoy) | Sin pasada propia. Las reglas de Peroncitos "hallazgo sobre REQ existente → al REQ" y "BL que pasa a REQ queda `Pasó a REQ-XXX`" (DEC-016), con el vínculo escrito una vez en el `Origen` del REQ y el `Pasó a` derivado por `check-sintaxis.js --arreglar` (DEC-024), viven en `CLAUDE.md`, no en la herramienta |
| `jay-engineer-frontend` | Persona | Jay | sis-web, tal cual (igual a la de hoy) | Sin pasada propia |
| `hjay-identidad-visual` | Herramienta | Jay | sis-web, tal cual (igual a la de hoy) | Sin pasada propia |
| `hjay-verificacion-visual` | Herramienta | Jay | sis-web, mejorada acá (BL-020) | Validada A/B el 2026-09-27. sis-web no la cambió desde entonces |
| `julia-engineer-appsec` | Persona | Julia | sis-web 2026-10-06, tal cual | Sin pasada propia |
| `hjulia-revision-cambio` | Herramienta | Julia | sis-web, mejorada acá (BL-020) + la línea de sis-web que remite a `hduck-test-en-rojo` (2026-10-06) | Validada A/B el 2026-09-27 |
| `duck-engineer-qa-testing` | Persona | Duck | sis-web 2026-10-06, tal cual | Sin pasada propia |
| `hduck-prueba-cambio` | Herramienta | Duck | sis-web 2026-10-06, tal cual | Validada con Claude B (2026-10-06, ver abajo) |
| `hduck-test-en-rojo` | Herramienta | Duck | sis-web 2026-10-06, tal cual | Validada con Claude B (2026-10-06) |
| `bob-engineer-backend` | Persona | Bob | sis-web 2026-10-06, tal cual | Sin pasada propia |
| `hbob-impacto-cambio` | Herramienta | Bob | sis-web 2026-10-06, tal cual | Validada con Claude B (2026-10-06) |
| `hbob-salud-codigo` | Herramienta | Bob | sis-web 2026-10-06, tal cual | Validada con Claude B (2026-10-06) |
| `gary-engineer-dba` | Persona | Gary | sis-web 2026-10-06; ruta del mapa de datos | Sin pasada propia |
| `hgary-cambio-datos` | Herramienta | Gary | sis-web 2026-10-06; "emulador" neutralizado | Validada con Claude B (2026-10-06) |
| `hgary-integridad` | Herramienta | Gary | sis-web 2026-10-06; "emulador" neutralizado, ejemplo "OS" | Validada con Claude B (2026-10-06) |
| `roy-engineer-devops-infraestructura` | Persona | Roy | sis-web 2026-10-06; ruta del inventario | Sin pasada propia |
| `hroy-deploy` | Herramienta | Roy | sis-web 2026-10-06, tal cual | Validada con Claude B (2026-10-06) |
| `hroy-estado-infra` | Herramienta | Roy | sis-web 2026-10-06, tal cual | Primera pasada real el 2026-10-06 (`docs/infra/inventario.md`); validada con Claude B |
| `convenciones-tecnicas` | Catálogo (del proyecto) | compartido | **Propio de Peroncitos**: misma estructura que el de sis-web | 12 temas. El 2026-10-06 sumó `tests.md`, `contratos.md`, `datos.md`, `infraestructura.md`, `scope-js.md` y la tabla de equivalencias con las herramientas genéricas; se sacó una sección repetida de `apps-script-clasp.md`. Pasa del tope de 8-10 temas de su propia guía: por ahora se mantiene (sis-web tiene 11), con la descripción como lista de palabras clave |

El `convenciones-tecnicas` de sis-web no se copió: es de InSIS (Firestore,
`perm()`, portales). De sus temas genéricos, `scope-js` se rehízo con un caso
de acá; `render-y-foco` y `tablas-responsivas` son de pantallas de InSIS, y lo
útil de `polling-async` ya estaba en `red-y-archivos-cliente.md`.

## Datos (fuera de las skills desde 2026-09-27, ver DEC-001)

| Archivo | Lo escribe | Antes vivía en |
|---|---|---|
| `docs/backlog.md` | `hpaul-triage` | `skills/hpaul-backlog/BACKLOG.md` |
| `docs/decisiones.md` | `hpaul-decision-log` | `skills/hpaul-decisiones-producto/hpaul-decisiones-producto.md` (solo plantilla) |

| `docs/DESIGN.md` | Jay | (nuevo, 2026-09-27, BL-012) |
| `docs/modelo-datos.md` | `hgary-cambio-datos` (mapa de datos) y a mano | existía desde 2026-09 |
| `docs/infra/inventario.md` | `hroy-estado-infra` y `hroy-deploy` | nuevo, 2026-10-06 (DEC-021) |

Todavía no existe (ver backlog, BL-013) el documento de seguimiento de
seguridad que menciona la persona de Julia "si el proyecto tiene uno".

## Validación A/B (2026-09-27, BL-014)

Mismos 4 escenarios de Peroncitos para cada herramienta. Claude A: línea
base, con `CLAUDE.md` y `convenciones-tecnicas` pero sin la herramienta ni
su persona (prohibido abrirlas). Claude B: con la herramienta, contrastándola
contra el código. Los dos, solo lectura.

**`hjulia-revision-cambio`.** A y B llegaron a los mismos hallazgos reales
(BL-015, BL-016, BL-017, la URL de Drive del avatar), verificados a mano. La
herramienta aporta orden y formato (matriz, hallazgo contra hipótesis, la
celda que decide producto), no hallazgos nuevos: la línea base es fuerte,
igual que en sis-web. B encontró que asume reglas de base y emulador (BL-020).

**`hjay-verificacion-visual`.** A también trabajó bien (criterios,
anchos, alturas, no hacer click contra prod). B aportó alturas y teclado,
el reclamo desde un teléfono y el script de medición de solo lectura. Lo
más importante salió de contrastar: **los dos siguieron un consejo roto de
`verificacion-navegador.md`** (sembrar `cp_session`, reasignar
`SCRIPT_URL`, que es `const`). Se corrigió ese tema el mismo día.

**Conclusión:** las dos herramientas quedan. Los cuidados propios de
Peroncitos se corrigieron en `convenciones-tecnicas` (`seguridad.md`,
`verificacion-navegador.md`). Las mejoras genéricas a las herramientas
quedan en BL-020 (se editan acá, DEC-003).

## Mejoras de BL-020 (2026-09-27)

Cuatro rondas, todas con subagentes de solo lectura y hallazgos
verificados a mano antes de usarlos:

1. **Vieja contra nueva**, 3 escenarios reales por skill (Jay: reclamo
   desde el celular, buscador nuevo, pantalla de error; Julia: BL-015,
   `deleteArchivo`, BL-016). La vieja de Jay no tenía qué hacer con un
   reclamo vertical desde el teléfono y hablaba de un "SDK" que acá no
   existe; la nueva lo cubrió. La nueva de Julia armó sola la fila "dada
   de baja", entró por `doPost` y encontró que `probarBUGLOGIN001B` se
   rompería con el chequeo de BL-015 (anotado en BL-015).
2. **Faltas que marcaron las dos versiones** (se aplicaron solo las
   genéricas): cambio chico con comportamiento, datos que quedan en el
   cliente, cachés de sesión como variantes, el "muerde" de una acción
   nueva, caso denegado sin cuenta de prueba, `input type=file`, contar
   pedidos, dónde está el `DESIGN.md`.
3. **Escenarios nuevos** (Jay: tarjetas apretadas, botón "Quitar", color
   de un chip; Julia: `getMiniatura`, BL-005, BL-003). Encontró un error
   real: la skill decía que `scrollWidth` no ve lo recortado por
   `overflow:hidden`, y el del propio contenedor sí lo cuenta. También los
   cortes implícitos de `auto-fill`/`minmax`, los selectores compartidos,
   la minimización de logs, el manifiesto en el deploy. Hallazgos del
   proyecto a REQ-PERF-004 y BL-003.
4. **Solo errores y contradicciones**, sobre las versiones finales:
   "las reglas no filtran" y "tardan en propagarse" eran de Firestore
   presentados como generales; "por encima del ancho máximo da lo mismo"
   tenía excepciones; `tieneMouseReal` se calcula una vez al cargar y
   choca con "cambiá de ancho sin recargar" (aviso en la skill y en
   `verificacion-navegador.md`); quedaban "en este repo" y "portal".

Resultado: las dos siguen genéricas (grep sin nombres de este stack) y
por debajo de 500 líneas (198 y 225). Aprendizaje para la metodología:
cada ronda con escenarios nuevos siguió encontrando algo, pero la cuarta
(solo errores, sin pedir faltantes) es el corte que evita que la skill
crezca sin fin.

## Versiones 2.0 de sis-web y validación con Claude B (2026-10-06)

Se trajeron de sis-web las ocho herramientas de Duck, Bob, Gary y Roy y
las seis personas reescritas (DEC-021). Lo propio de este stack fue al
catálogo: `tests.md`, `contratos.md`, `datos.md`, `infraestructura.md`,
`scope-js.md` y la tabla de equivalencias. `hroy-estado-infra` tuvo su
primera pasada real (`docs/infra/inventario.md`).

Validación (Fase 6): un Claude B por dueño, de solo lectura, con 3
escenarios reales de Nuestros Planes cada uno (Duck: BL-039, un 41/43
"de los de siempre", un cambio de texto; Bob: campo "lugar", unificar
`getRecuerdos`/`getFotosPlan`, conteo de fotos distinto; Gary: sacar
`foto_url`, fotos colgadas de tareas borradas, volver a correr la
corrección de fechas; Roy: deployar un arreglo que no existe, "¿es lo que
probamos?", "Noelia ve la versión vieja"). Los cuatro resolvieron bien
los escenarios trampa (Roy frenó por diff vacío, Gary no volvió a correr
la corrección, Duck no aceptó "los de siempre").

Hallazgos, verificados a mano contra el código antes de aplicarlos:
- **Errores del catálogo nuevo:** `contratos.md` decía que las altas
  arman la fila por nombre (es por posición, `appendRow` en el orden de
  la constante) y que servir una foto mira la tarea (mira solo el estado
  de la foto); `datos.md` decía que al borrar se archiva la carpeta de
  Drive (no se toca), que solo se borran sesiones vencidas (también
  revocadas y bajas de usuario), y daba como buenos ejemplos dos
  funciones que no lo son (`corregirFechaContenidoArchivos` ya no es
  reusable; `archivarFotosDePlanesEliminados` escribe por defecto);
  `tests.md` tenía un ejemplo con totales que no cerraban.
- **Huecos de traducción** que fueron a la tabla de equivalencias o a los
  temas: cuarentena (no hay en el runner), correr "un test solo" (la
  unidad es el `probarXXX()`), carreras imposibles de reproducir con
  `clasp run`, `-P` obligatorio (sin `-P` va a prod), staging del front,
  vuelta atrás que deja `@HEAD` con el código nuevo, commit en el mensaje
  de `clasp version`, golden master → test de caracterización.
- **Hallazgos del proyecto** (no de las skills): BL-042 (el mapa de datos
  está desactualizado), BL-043 (`getRecentPlanPhotos` sin uso), BL-044
  (datos personales en el repo público), corrección de la nota de BL-039
  y `README.md` (`-u duck`, repo público).
- **Choque con `CLAUDE.md`, resuelto el mismo día (Franco):** las herramientas piden commit
  antes de probar y de deployar (el mismo commit que se probó), y
  `CLAUDE.md` permite commitear solo al cierre de la sesión. En la
  práctica el commit se hace al dar el OK del deploy (09789dd, un minuto
  después de la versión 35). `CLAUDE.md` suma la excepción: el OK de un
  paso a producción incluye el commit de lo que se publica.

Aprendizaje para la metodología: igual que en sis-web, los escenarios
encontraron errores en lo recién escrito, y esta vez en el catálogo
propio, no en las herramientas: escribir un tema "de memoria del código"
sin que lo contraste otro deja afirmaciones falsas con tono de seguras.

## Referencias cruzadas

- `CLAUDE.md` → los 7 ingenieros, `hjay-identidad-visual`,
  `hjay-verificacion-visual`, `convenciones-tecnicas`, `docs/backlog.md`,
  `docs/decisiones.md`.
- `paul-engineer-pm` → `hpaul-decision-log`, `hpaul-triage`.
- `jay-engineer-frontend` → `hjay-identidad-visual`,
  `hjay-verificacion-visual`, `convenciones-tecnicas`, `docs/DESIGN.md`.
- `julia-engineer-appsec` → `hjulia-revision-cambio`,
  `convenciones-tecnicas`, documento de seguimiento de seguridad (no
  existe todavía), comando `security-review`.
- `duck-engineer-qa-testing` → `hduck-prueba-cambio`, `hduck-test-en-rojo`,
  `hjay-verificacion-visual`, `hjulia-revision-cambio`.
- `hjay-verificacion-visual` → `convenciones-tecnicas/verificacion-navegador.md`.
- `hjulia-revision-cambio` → `convenciones-tecnicas/seguridad.md`.
- `CLAUDE.md` → `hroy-deploy` (deploy a prod), `hbob-impacto-cambio`,
  `hgary-cambio-datos` y `hduck-prueba-cambio` (roll-call de cambio de
  fondo), `hduck-test-en-rojo` (siempre), `hroy-estado-infra` y
  `hbob-salud-codigo` (revisión trimestral, DEC-022),
  `docs/infra/inventario.md`.
- Duck, Bob, Gary y Roy → sus dos herramientas y "el tema de tests /
  contratos / datos / infraestructura" del catálogo, sin ruta: acá
  `tests.md`, `contratos.md`, `datos.md` e `infraestructura.md`, que
  remiten de vuelta a las herramientas.
- `gary-engineer-dba` → `docs/modelo-datos.md`;
  `roy-engineer-devops-infraestructura` → `docs/infra/inventario.md`.
- `convenciones-tecnicas/SKILL.md` → tabla de equivalencias que traduce
  el vocabulario de las herramientas genéricas (reglas, emulador,
  staging, colección) a este stack.

## Fuera del repo

Las copias viejas con prefijo `anthropic-skills:` se desactivaron en la
cuenta de claude.ai el 2026-09-27 (verificado con la lista de skills de la
cuenta). El `skillOverrides` de `.claude/settings.local.json` que intentaba
apagarlas no funcionaba y quedó sin efecto.

## Relación con sis-web

Desde DEC-021 (reemplaza a DEC-003), sis-web es la fuente de las
herramientas genéricas: acá se mantiene la menor diferencia posible y lo
propio de Nuestros Planes va a `convenciones-tecnicas` (temas y tabla de
equivalencias) o a `CLAUDE.md`. Para traer una versión nueva: comparar
archivo por archivo, reemplazar lo que acá no se tocó, y en lo que figura
abajo reaplicar la diferencia. Franco decidió el 2026-10-06 que por ahora
cada repo mantenga su versión: las mejoras de acá no se llevan a sis-web.

### Diferencias con sis-web

| Skill | Diferencia | ¿Se lleva a sis-web? |
|---|---|---|
| `hjay-verificacion-visual` | Mejoras de BL-020 (reclamo desde el teléfono, alturas, `scrollWidth` con `overflow:hidden`, cortes implícitos de `auto-fill`, sin "SDK") | Son genéricas, pero no por ahora (Franco, 2026-10-06) |
| `hjulia-revision-cambio` | Mejoras de BL-020 (sin reglas de base ni emulador como supuesto, cachés de sesión como variantes, caso denegado sin cuenta de prueba) | Son genéricas, pero no por ahora (Franco, 2026-10-06) |
| `hgary-integridad`, `hgary-cambio-datos` | "emulador" → "ambiente de prueba (emulador, proyecto de test)"; ejemplo "volvió esta OS" → "este registro" | Son genéricas, pero no por ahora (Franco, 2026-10-06) |
| `gary-engineer-dba`, `roy-engineer-devops-infraestructura` | Ruta "en este repo" del mapa de datos y del inventario | No: es la ruta de cada repo |
