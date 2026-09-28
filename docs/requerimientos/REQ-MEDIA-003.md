# REQ-MEDIA-003 — Recuerdos: nuevas, "en este día" y "de otro momento"

> **Estado:** EN PRODUCCIÓN (2026-09-28, versión 1.1.0, tag `v1.1.0`, commit 518e9c3). Alcance y ubicación aprobados por Franco (opción A del mockup). Servidor hecho y probado en test (`getRecuerdos` + `probarMEDIA003` 33/33). Front hecho y verificado en 127.0.0.1 con `fetch` simulado a 375 y 1366 (card, chips, teclado, vacío, falla, visor de tarea sin chips). Servidor en producción desde el 2026-09-28 (Web App @28, "v1.1.0"; rollback `-V 27`). Front en `main` (GitHub Pages sirve 1.1.0). Sale como versión `1.1.0` (DEC-009).
> **Nivel:** cambio de fondo (endpoint nuevo + card del dashboard + modal de recuerdos).
> **Dueño técnico:** Bob (selección en el servidor) + Jay (card y modal) · **DBA:** Gary · **AppSec:** Julia · **DevOps:** Roy · **QA:** Duck · **PM:** Paul
> **Depende de:** REQ-MEDIA-005 (la fecha de cada foto es la de captura, ya en prod).
> **Datos sensibles:** sí, fotos personales (Ley 25.326). Mismo criterio que REQ-MEDIA-001: ninguna URL ni `drive_file_id` al cliente; las imágenes siguen pasando por `getArchivos`/`getArchivo` con sesión.
> Sale de BL-007 y cierra BL-017. Investigación en `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`.

## Problema

La card "N fotos nuevas → Ver recuerdos" y el modal "Nuestros recuerdos"
muestran siempre las últimas fotos subidas:

- Ordenan por **fecha de subida** (`handleGetRecentPlanPhotos`, `Code.gs:1977`),
  no por la fecha de la foto que agregó REQ-MEDIA-005. Una foto de 2024 subida
  hoy aparece como la más nueva.
- La card dice "5 fotos nuevas" aunque sean de hace un mes: siempre son las
  últimas 5, sin importar cuándo se subieron.
- No aparece nunca una foto vieja: los recuerdos son solo "lo último".
- Las fotos de una tarea eliminada siguen apareciendo (BL-017).

## Decisiones de Franco (2026-09-28)

1. Tres grupos en la primera versión: **Nuevas**, **En este día** y **De otro
   momento**. "Esta tarea hace un año" queda afuera.
2. Las fotos de una tarea eliminada **no** se muestran en recuerdos. No se
   borra nada: siguen en `Archivos` y en Drive.
3. Ubicación **opción A**: una sola card en el dashboard, del mismo tamaño que
   hoy, que muestra el grupo que más aporta ese día. El modal muestra los tres
   grupos con chips para cambiar entre ellos.

## Alcance

### Grupos (los arma el servidor)

"Fecha de la foto" es `fecha_contenido` (captura, o subida si no había, o la
corregida a mano). "Hoy" es el día en hora Argentina (`TZ_APP`).

| Grupo | Qué fotos | Orden |
|---|---|---|
| **Nuevas** | subidas (`fecha_subida`) en los últimos 7 días | fecha de la foto, más nueva primero |
| **En este día** | fecha de la foto = mismo día y mes de hoy en un año anterior. Si no hay ninguna, mismo día del mes en un mes anterior (mientras la app es joven casi siempre va a ser este caso) | más reciente primero; se muestra "Hace 1 año", "Hace 2 meses" |
| **De otro momento** | las fotos de **una** tarea elegida entre las que tienen fotos con fecha de hace más de 14 días | fecha de la foto, más vieja primero (se cuenta como pasó) |

- Solo fotos `owner_tipo='plan'`, `proposito='adjunto'`, `estado='activo'` y
  cuya tarea exista y no esté `eliminado` en `Planes`.
- **De otro momento cambia una vez por día y es la misma para los dos.** La
  tarea se elige con una semilla del día (`AAAA-MM-DD` de hoy en hora
  Argentina), no al azar en cada pedido. Si en "En este día" ya aparece esa
  tarea, se elige otra.
- Una misma foto no aparece en dos grupos: prioridad En este día → Nuevas → De
  otro momento.
- Tope de 20 fotos por grupo.
- Un grupo sin fotos no viaja (o viaja vacío) y no se muestra.

### Card del dashboard (opción A)

- Muestra **un** grupo: En este día si tiene fotos; si no, Nuevas; si no, De
  otro momento. Sin fotos en ningún grupo, la card no aparece (como hoy).
- Arriba, el nombre del grupo en mayúsculas chicas (`En este día` en cobre).
  Abajo, una línea:
  - En este día: "Hace 1 mes · <título de la tarea>" (el de la foto más
    reciente del grupo).
  - Nuevas: "4 fotos nuevas".
  - De otro momento: "Hace 3 semanas · <título de la tarea>".
- Hasta 3 miniaturas superpuestas, como hoy, y "Ver recuerdos →".
- Títulos largos se cortan con `…` sin romper la card (`min-width: 0`).
- Tocar la card abre el modal en el grupo que mostraba la card.

### Modal "Nuestros recuerdos"

- Debajo del título, un chip por grupo con fotos ("En este día · 3",
  "Nuevas · 4", "De otro momento · 2"), en el orden de prioridad. Son
  `<button type="button" aria-pressed>` con el estilo de `.filter-chip`.
- El visor es el de hoy (flechas, carga on-demand y prefetch de REQ-PERF-005)
  y recorre solo las fotos del grupo elegido. Cambiar de chip vuelve a la
  primera foto de ese grupo.
- Debajo de la foto: título de la tarea y "Hace 1 mes · dom 28/08 ·
  Categoría" ("Hoy", "Ayer" y "Hace N días/semanas/meses/años", redondeado
  hacia abajo).
- "Cambiar fecha" sigue sin estar en el visor de recuerdos (BL-028, aparte).

### Fuera de alcance

- "Esta tarea hace un año" (necesita saber qué tareas "son la misma").
- Aprender qué recuerdos se miran, notificaciones, visión artificial.
- Visor a pantalla completa (BL-027).
- Borrar o archivar fotos cuando se elimina una tarea: el filtro es solo de
  lectura. Lo que dice `docs/modelo-datos.md` ("borrar una tarea pasa sus
  fotos a `archivado`") sigue sin implementar; queda en BL-017 como nota.

## Contrato (Bob)

- **Endpoint nuevo `getRecuerdos`** (lectura, con sesión, ambos usuarios ven
  todo). Respuesta:
  ```json
  { "hoy": "2026-09-28",
    "grupos": [
      { "tipo": "en_este_dia", "fotos": [ { "archivoId", "planId", "tituloPlan", "categoriaNombre", "fecha" } ] },
      { "tipo": "nuevas", "fotos": [...] },
      { "tipo": "de_otro_momento", "fotos": [...] } ] }
  ```
  Mismos campos por foto que hoy devuelve `getRecentPlanPhotos`. Nunca
  `drive_file_id`. El "Hace …" lo calcula el front con `hoy` del servidor, para
  que no dependa del reloj del teléfono.
- **`getRecentPlanPhotos` no se toca** hasta que el front nuevo esté en `main`
  (GitHub Pages y Apps Script se publican por separado; si el servidor sale
  primero, el front viejo sigue andando). Después se evalúa quitarlo.
- Un solo pase por `Archivos`, `Planes` y `Categorias` por pedido, como el
  handler actual.

## Criterios de aceptación

1. Una foto subida hoy con fecha de captura de hace 1 año aparece en **En este
   día** (si coincide día y mes) y no en Nuevas.
2. Una foto subida hace 10 días no aparece en Nuevas.
3. Con fotos del mismo día y mes de un año anterior, En este día muestra esas
   y no las del mes anterior. Sin ninguna de años anteriores, muestra las del
   mismo día del mes en meses anteriores.
4. El 31 de un mes, "mismo día del mes anterior" no inventa fechas: los meses
   sin día 31 no aportan. El 29/02 solo coincide con 29/02.
5. De otro momento: dos pedidos del mismo día devuelven la misma tarea; al día
   siguiente puede cambiar. Solo tareas con fotos de hace más de 14 días. No
   repite la tarea de En este día.
6. Ninguna foto aparece en dos grupos.
7. Las fotos de una tarea `eliminado` no aparecen en ningún grupo (BL-017), y
   las fotos con `estado='eliminado'` tampoco.
8. Sin sesión válida, `getRecuerdos` responde 401 (por `doPost`, como el resto).
9. La card muestra el grupo según la prioridad, con el texto de la tabla, y
   abre el modal en ese grupo.
10. En el modal, los chips cambian el grupo, el contador del visor y las
    flechas respetan el grupo, y se usan con el teclado.
11. A 375 px y a 1366 px la card no desborda con un título largo, y el
    dashboard no se corre respecto de hoy.
12. `node check-sintaxis.js` en verde y `probarMEDIA003()` en verde contra
    el proyecto de test.

## Pruebas (Duck)

`probarMEDIA003()` en `Tests.gs`, con planilla scratch y "hoy" inyectable
(el handler recibe la fecha de hoy por parámetro interno, no del reloj, para
poder probar el 31, el 29/02 y el cambio de día). Casos: 1–8 de arriba.

## Orden de trabajo (Paul)

1. Bob: `getRecuerdos` + test, contra test. Julia revisa el endpoint
   (`hjulia-revision-cambio`); Gary confirma que no cambia hojas ni columnas.
2. Duck revisa el paso 1.
3. Jay: card y modal. Verificación visual (`hjay-verificacion-visual`) con
   `fetch` simulado, sin escribir en prod.
4. Duck revisa el paso 3 y todo junto.
5. Roy: deploy con OK explícito en cada paso — primero Apps Script prod
   (`getRecuerdos` es aditivo), después el push a `main`.

## Después del deploy (2026-09-28)

- `getRecentPlanPhotos` ya no lo usa el front 1.1.0 (la card y el modal
  usan `getRecuerdos`). Se deja en el servidor por si queda algún teléfono
  con la versión vieja en caché; se puede quitar en una versión siguiente,
  junto con su test en `probarMEDIA002`/`probarMEDIA005`.
- Fuera de lo pedido, el contador "N de M" también aparece en el visor de
  fotos de una tarea (mismo elemento). Los chips no.
- En prod solo se probó sin sesión (401). El caso con datos reales quedó
  cubierto por `probarMEDIA003` en test y por el uso de Franco en 1.1.0.
