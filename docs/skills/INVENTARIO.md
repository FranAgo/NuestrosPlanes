# Inventario de skills

Fase 0 de `docs/skills/METODOLOGIA.md`. Se actualiza al cerrar cada pasada
o cada vez que se traen versiones nuevas desde sis-web. Última
actualización: 2026-09-27 (reemplazo por las skills de sis-web, DEC-001).

## Skills del repo (`.claude/skills/`)

| Skill | Tipo | Dueño | Origen | Estado en Peroncitos |
|---|---|---|---|---|
| `paul-engineer-pm` | Persona | Paul | sis-web, tal cual | Sin pasada propia |
| `hpaul-decision-log` | Herramienta | Paul | sis-web, tal cual | Sin pasada propia |
| `hpaul-triage` | Herramienta | Paul | sis-web, tal cual | Sin pasada propia. La regla de Peroncitos "hallazgo sobre REQ existente → al REQ" vive en `CLAUDE.md`, no en la herramienta |
| `jay-engineer-frontend` | Persona | Jay | sis-web, tal cual | Sin pasada propia |
| `hjay-identidad-visual` | Herramienta | Jay | sis-web, tal cual | Sin pasada propia |
| `hjay-verificacion-visual` | Herramienta | Jay | sis-web, tal cual | Nueva en Peroncitos |
| `julia-engineer-appsec` | Persona | Julia | sis-web, tal cual | Sin pasada propia |
| `hjulia-revision-cambio` | Herramienta | Julia | sis-web, tal cual | Nueva en Peroncitos |
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

Todavía no existen (ver backlog): un `docs/DESIGN.md` de Nuestros Planes
(lo mantendría Jay) y un documento de seguimiento de seguridad (Julia).
Las dos personas los mencionan como "si el proyecto tiene uno".

## Referencias cruzadas

- `CLAUDE.md` → los 7 ingenieros, `hjay-identidad-visual`,
  `hjay-verificacion-visual`, `convenciones-tecnicas`, `docs/backlog.md`,
  `docs/decisiones.md`.
- `paul-engineer-pm` → `hpaul-decision-log`, `hpaul-triage`.
- `jay-engineer-frontend` → `hjay-identidad-visual`,
  `hjay-verificacion-visual`, `convenciones-tecnicas`, `DESIGN.md` del
  proyecto (no existe todavía).
- `julia-engineer-appsec` → `hjulia-revision-cambio`,
  `convenciones-tecnicas`, documento de seguimiento de seguridad (no
  existe todavía), comando `security-review`.
- `duck-engineer-qa-testing` → `hjay-verificacion-visual`,
  `hjulia-revision-cambio`.
- `hjay-verificacion-visual` → `convenciones-tecnicas/verificacion-navegador.md`.
- `hjulia-revision-cambio` → `convenciones-tecnicas/seguridad.md`.

## Fuera del repo

Las copias con prefijo `anthropic-skills:` de la cuenta de claude.ai son
versiones viejas. En este proyecto están apagadas con `skillOverrides` en
`.claude/settings.local.json` (que no se versiona: en otra máquina hay que
repetirlo).

## Mantener en sincronía con sis-web

Las skills genéricas (todas menos `convenciones-tecnicas`) son copias. Si
sis-web las mejora, se traen de nuevo con un diff primero y se anota acá
qué cambió. Lo propio de Peroncitos nunca va adentro de una skill
genérica: va a `CLAUDE.md` o a `convenciones-tecnicas`.
