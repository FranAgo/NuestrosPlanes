# Estado de requerimientos y backlog: cómo lo mantienen otros (2026-10-04)

Pedido de Franco: los estados de los REQ y del backlog quedan siempre
desactualizados ("falta el push" cuando ya está en prod, BL "En curso" con
el REQ cerrado). Antes de cambiar el proceso, ver cómo lo resuelven equipos
y proyectos serios, para no inventar algo propio.

## El problema, con casos de este repo

- 2026-09-16: REQ-MEDIA-002, REQ-PERF-002 y REQ-PERF-003 decían "pendiente
  de push" y ya estaban en `main` hacía varias sesiones.
- 2026-09-28: lo mismo con REQ-MEDIA-004.
- REQ-UX-003 necesitó un commit aparte solo para el estado (`7e010e6`).
- REQ-MEDIA-006 dice "falta el push a `main`" y está en prod desde el
  2026-10-02 (`bb85af3` = `origin/main`).
- BL-007, BL-017, BL-024, BL-027, BL-028 y BL-029 siguen "En curso" con su
  REQ ya en producción o cerrado.

Causas: (1) el estado se escribe antes del push y no hay ningún paso
después; (2) el mismo estado está copiado en el REQ, en el BL que lo
originó, en la bitácora y a veces en la memoria.

## Qué hacen otros

- **Gestores de tareas (Linear, GitHub, Jira): el estado lo mueve un
  evento, no una persona.** Linear pasa el issue a "In Progress" al crear la
  rama, a "In Review" al abrir el PR y a "Done" al mergear; se puede
  configurar otro estado por rama de destino (por ejemplo, mergear a `main`
  = "Deployed"). En GitHub, un PR o commit con `Closes #10` cierra el issue
  al mergear a la rama principal. Jira muestra los deploys hechos con la API
  de deployments de GitHub en cada issue (busca la clave del issue en los
  commits) y se puede armar una regla que lo pase de estado.
- **Proyectos con propuestas escritas en el repo (Rust, Python,
  Kubernetes): el documento no lleva el avance de la implementación.**
  - Rust: cada RFC aceptado tiene un issue de seguimiento en el repo de
    Rust; el avance se sigue ahí, no editando el RFC.
  - Python (PEP 1): una vez Accepted o Final, la PEP "no se modifica
    sustancialmente"; pasa a ser un documento histórico y la especificación
    viva va a otra parte (la referencia del lenguaje).
  - Kubernetes: cada KEP lleva el número de su issue de seguimiento, "donde
    se actualiza el estado actual". La ficha `kep.yaml` tiene un `status`
    de pocos valores (provisional, implementable, implemented, …) y campos
    de versión (`latest-milestone`, `milestone` por etapa).
- **ADR (Nygard): no se editan después de aceptados.** Si la decisión cambia
  se escribe otro ADR que la reemplaza y al viejo solo se le marca
  "Superseded by". Ya lo hacemos así en `docs/decisiones.md`.
- **Datos que no vencen en lugar de estados que vencen.** Jira usa el campo
  "Fix Version": en qué versión sale (o salió) cada issue. Cuando esa
  versión se marca como liberada, todo lo que tiene esa versión ya está
  entregado; no hay que tocar cada issue.
- **Chequeos automáticos contra docs viejos.** Existen, pero son
  herramientas nuevas y chicas, no una práctica establecida: Drift
  (Fiberplane) ata cada doc a archivos o símbolos del código y CI lo marca
  como viejo si ese código cambia; Doc Drift usa un LLM en cada PR. Lo
  establecido es lo de arriba (que el estado no se escriba a mano).

## Qué no se pudo confirmar

- No encontré un número serio de cuánto ahorra la automatización: el "73 %"
  que circula sobre Linear viene de un sitio de terceros sin fuente, no se
  usa.
- No verifiqué si Kubernetes valida el `kep.yaml` automáticamente.

## Qué se toma para Nuestros Planes

1. **Un solo lugar para el estado: el REQ.** Un BL que se formaliza queda
   "Formalizado → REQ-XXX" y no vuelve a llevar estado. Es el mismo
   principio de Rust y Kubernetes (el estado vive en un solo lugar, el
   resto apunta ahí).
2. **El REQ guarda datos que no vencen.** Un `Estado` de pocos valores
   (Propuesto, En desarrollo, Hecho, Cerrado) y una línea `Versión: 1.5.0`,
   como "Fix Version" o `milestone`. Si 1.5.0 está en producción se ve en el
   tag, en el `CHANGELOG.md` y en `APP_VERSION`, no en el REQ. Se dejan de
   escribir frases como "falta el push" o "servidor en @32" en el
   encabezado; el número de deployment y el rollback van a la bitácora.
3. **Un chequeo chico en `node check-sintaxis.js`** (o un script aparte) que
   falle si un BL dice "En curso" apuntando a un REQ Hecho o Cerrado, o si un
   REQ con versión ya publicada (tag en `origin/main`) sigue diciendo
   "En desarrollo". Reemplaza al evento automático de Linear o GitHub, que
   acá no tenemos.
4. **No migrar a GitHub Issues por ahora.** Sería la versión "de empresa"
   (estado movido por `Closes #N`), pero saca el estado de los archivos del
   repo, que es donde lo leen las skills y la bitácora. Se reabre si el
   chequeo del punto 3 no alcanza.

## Fuentes

- Linear, configuración del flujo con GitHub: https://linear.app/changelog/2019-07-11-github-workflow-configuration
- Linear en GitHub Marketplace: https://github.com/marketplace/linear
- GitHub Docs, vincular un PR a un issue: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
- GitHub for Jira, deployments: https://github.com/atlassian/github-for-jira/blob/332b5ae08042c631fdce6465386a6c338e819d99/docs/deployments.md
- Atlassian, transicionar un issue con automatización: https://confluence.atlassian.com/automation112/transition-an-issue-with-automation-1688902291.html
- Atlassian, versiones en Jira: https://www.atlassian.com/agile/tutorials/versions
- Rust RFCs, README: https://github.com/rust-lang/rfcs/blob/master/README.md
- PEP 1: https://peps.python.org/pep-0001/
- Kubernetes KEPs, README: https://github.com/kubernetes/enhancements/blob/master/keps/README.md
- Plantilla `kep.yaml`: https://github.com/kubernetes/enhancements/blob/master/keps/NNNN-kep-template/kep.yaml
- ADR (formato Nygard, apunte UQ): https://csse6400.uqcloud.net/handouts/adr.pdf
- Fiberplane, linter de docs viejos: https://fiberplane.com/blog/drift-documentation-linter/
- Doc Drift: https://github.com/jbrockSTL/doc-drift
