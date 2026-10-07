# Vínculo entre un ítem del backlog y su REQ: cómo lo mantienen otros (2026-10-07)

Pedido de Franco: BL-045 quedó en `Propuesto` aunque REQ-MEDIA-008 salió de
él ("desde BL-045") y ya está en producción, y eso pasó después de
endurecer los estados el 2026-10-04 (ver
`2026-10-04-estado-de-requerimientos.md`). Antes de tocar el chequeo, ver
cómo lo resuelven las herramientas serias.

## El problema, con este caso

- El vínculo BL ↔ REQ se escribe dos veces y a mano: en el REQ (texto
  libre en la Historia: "desde BL-045") y en el backlog
  (`- Estado: Pasó a REQ-MEDIA-008`).
- `chequearEstados()` (`check-sintaxis.js`) solo mira una dirección: si el
  BL dice `Pasó a REQ-X`, que REQ-X exista. Si el BL se olvida, no hay nada
  que comparar, porque el REQ no dice su origen en un campo fijo: los
  encabezados nombran BL de cuatro formas ("desde", "Incluye", "queda
  como", "Motivo de la prioridad") y solo una es el origen.
- La bitácora del 2026-10-07 00:39 dice que BL-045 "pasó a REQ-MEDIA-008":
  se dio por hecho un paso que nadie hizo.

## Qué hacen otros

- **Jira y Azure DevOps: el vínculo se carga una vez y la otra punta la
  pone el sistema.** En Jira, al crear un vínculo "blocks" de A a B, el
  sistema guarda también el inverso "is blocked by" en B. En Azure DevOps,
  los tipos de vínculo de dos vías tienen nombre de ida y de vuelta
  (Parent/Child, Duplicate/Duplicate Of): al poner Parent en un ítem, el
  otro recibe Child. Nadie escribe las dos puntas.
- **GitHub: lo mismo.** Un issue referenciado en una lista de tareas
  muestra solo "Tracked by" hacia el issue que lo sigue; hoy eso lo hacen
  los sub-issues, con la relación padre/hijo guardada una vez.
- **Herramientas de requerimientos en el repo (docs-as-code), lo más
  parecido a lo nuestro:**
  - Sphinx-Needs: cada pedido declara sus vínculos de salida y los de
    entrada se calculan solos al armar la documentación. Un vínculo a un
    ID que no existe ("dead link") da una advertencia, que con el modo
    estricto corta el build.
  - Doorstop (requerimientos en YAML dentro de git): el vínculo vive solo
    en el hijo, que apunta al padre. `doorstop` valida y marca como ERROR
    un vínculo a un ID desconocido o a un ítem inactivo; además avisa si un
    padre cambió después de vincularlo ("suspect link").
- **Jira Product Discovery: el estado de la idea no se escribe, se
  calcula.** Una idea se conecta a sus tickets de entrega y muestra una
  barra de avance y un "Delivery status" calculados a partir del estado de
  esos tickets.

Los tres principios que se repiten:

1. **El vínculo se guarda en un solo lugar**, normalmente en el hijo
   apuntando al padre. La otra punta la calcula o la escribe la
   herramienta, en el mismo acto.
2. **Un validador corta el proceso** si un vínculo apunta a algo que no
   existe o si las dos puntas no coinciden (ERROR en Doorstop, modo
   estricto en Sphinx-Needs).
3. **El estado del padre se deriva del hijo**, no se tipea dos veces.

## Qué no se pudo confirmar

- No revisé el código de Doorstop ni de Sphinx-Needs: lo de arriba sale de
  su documentación.

## Qué se toma para Nuestros Planes

Acá no hay base de datos que escriba la otra punta: el backlog y los REQ son
archivos de texto. Lo más cercano es el modelo de Doorstop, con el chequeo
haciendo de "sistema":

1. **Una sola fuente del vínculo: el REQ.** Campo fijo en el encabezado,
   `> **Origen:** BL-045` (o `BL-027, BL-028`), como el Parent de Azure
   DevOps o el vínculo del hijo en Doorstop. El texto de la Historia puede
   seguir contando la historia, pero el chequeo solo lee `Origen`.
2. **La línea del backlog es derivada.** `- Estado: Pasó a REQ-X (fecha)`
   tiene que coincidir con lo que dice el `Origen` de REQ-X. Si no
   coincide, `node check-sintaxis.js` falla y el hook `pre-commit` frena el
   commit, e imprime la línea exacta que corresponde.
   `node check-sintaxis.js --arreglar` la escribe sola (como un archivo
   generado que se verifica en CI: el humano no la tipea).
3. **Las dos direcciones son error**, como en Doorstop:
   - un REQ con `Origen: BL-N` y BL-N sin `Pasó a` ese REQ;
   - un BL con `Pasó a REQ-X` y REQ-X sin ese BL en su `Origen`;
   - un `Origen` que nombra un BL que no existe.
4. **El estado sigue viviendo solo en el REQ** (DEC-016): el BL no se
   vuelve a tocar después del `Pasó a`. No se agrega una barra de avance
   como la de Jira Product Discovery: con el `Pasó a` alcanza para saber
   dónde mirar.
5. **No se migra a GitHub Issues.** Sigue valiendo lo del 2026-10-04: el
   estado tiene que estar en los archivos que leen las skills.

## Fuentes

- Atlassian, modelo de vínculos entre issues: https://developer.atlassian.com/cloud/jira/platform/issue-linking-model/
- Kintosoft, direcciones de los vínculos de Jira: https://kintosoft.atlassian.net/wiki/x/C48SAw
- Microsoft, tipos de vínculo de Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/boards/queries/link-type-reference
- GitHub Docs, tasklists ("Tracked by"): https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-tasklists
- GitHub changelog, sub-issues reemplazan a las tasklists: https://github.blog/changelog/2025-02-18-github-issues-projects-february-18th-update/
- Sphinx-Needs, configuración de vínculos: https://sphinx-needs.readthedocs.io/en/latest/configuration.html
- Doorstop, chequeos de integridad: https://doorstop.readthedocs.io/en/v3.1/cli/validation.html
- Jira Product Discovery, entrega: https://www.atlassian.com/software/jira/product-discovery/guides/delivery/overview
