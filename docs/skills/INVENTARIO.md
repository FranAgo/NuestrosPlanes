# Inventario de skills

Fase 0 de `docs/skills/METODOLOGIA.md`. Se actualiza al cerrar cada pasada
o cada vez que se traen versiones nuevas desde sis-web. Última
actualización: 2026-09-27 (validación A/B de dos herramientas, BL-014).

## Skills del repo (`.claude/skills/`)

| Skill | Tipo | Dueño | Origen | Estado en Peroncitos |
|---|---|---|---|---|
| `paul-engineer-pm` | Persona | Paul | sis-web, tal cual | Sin pasada propia |
| `hpaul-decision-log` | Herramienta | Paul | sis-web, tal cual | Sin pasada propia |
| `hpaul-triage` | Herramienta | Paul | sis-web, tal cual | Sin pasada propia. Las reglas de Peroncitos "hallazgo sobre REQ existente → al REQ" y "BL que pasa a REQ queda `Pasó a REQ-XXX`" (DEC-016) viven en `CLAUDE.md`, no en la herramienta. En su pasada: evaluar si "Pasó a" entra como estado genérico (hoy la herramienta y `paul-engineer-pm` dicen "En curso" y "Formalizado") |
| `jay-engineer-frontend` | Persona | Jay | sis-web, tal cual | Sin pasada propia |
| `hjay-identidad-visual` | Herramienta | Jay | sis-web, tal cual | Sin pasada propia |
| `hjay-verificacion-visual` | Herramienta | Jay | sis-web, editada acá (DEC-003) | Validada A/B y mejorada el 2026-09-27 (BL-020, ver abajo) |
| `julia-engineer-appsec` | Persona | Julia | sis-web, tal cual | Sin pasada propia |
| `hjulia-revision-cambio` | Herramienta | Julia | sis-web, editada acá (DEC-003) | Validada A/B y mejorada el 2026-09-27 (BL-020, ver abajo) |
| `duck-engineer-qa-testing` | Persona | Duck | sis-web, tal cual | Sin pasada propia |
| `bob-engineer-backend` | Persona | Bob | sis-web (igual a la anterior de Peroncitos) | Sin pasada propia |
| `gary-engineer-dba` | Persona | Gary | sis-web, con el contexto de datos generalizado (ya no dice "facturación, clientes, empleados") | Sin pasada propia |
| `roy-engineer-devops-infraestructura` | Persona | Roy | sis-web (igual a la anterior de Peroncitos) | Sin pasada propia |
| `convenciones-tecnicas` | Catálogo (del proyecto) | compartido | **Propio de Peroncitos**: misma estructura que el de sis-web, contenido armado con la bitácora de 2026-09 y la memoria de Claude | 6 temas, nuevo |

El `convenciones-tecnicas` de sis-web no se copió: es de InSIS (Firestore,
`perm()`, portales).

## Datos (fuera de las skills desde 2026-09-27, ver DEC-001)

| Archivo | Lo escribe | Antes vivía en |
|---|---|---|
| `docs/backlog.md` | `hpaul-triage` | `skills/hpaul-backlog/BACKLOG.md` |
| `docs/decisiones.md` | `hpaul-decision-log` | `skills/hpaul-decisiones-producto/hpaul-decisiones-producto.md` (solo plantilla) |

| `docs/DESIGN.md` | Jay | (nuevo, 2026-09-27, BL-012) |

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
- `duck-engineer-qa-testing` → `hjay-verificacion-visual`,
  `hjulia-revision-cambio`.
- `hjay-verificacion-visual` → `convenciones-tecnicas/verificacion-navegador.md`.
- `hjulia-revision-cambio` → `convenciones-tecnicas/seguridad.md`.

## Fuera del repo

Las copias viejas con prefijo `anthropic-skills:` se desactivaron en la
cuenta de claude.ai el 2026-09-27 (verificado con la lista de skills de la
cuenta). El `skillOverrides` de `.claude/settings.local.json` que intentaba
apagarlas no funcionaba y quedó sin efecto.

## Relación con sis-web

Las skills genéricas salieron de sis-web (DEC-001), pero desde DEC-003
son de este repo: se mejoran acá y no se sincronizan con sis-web, salvo
que Franco lo pida. Lo propio de Peroncitos sigue sin ir adentro de una
skill genérica: va a `CLAUDE.md` o a `convenciones-tecnicas`.
