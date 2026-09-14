# REQ-MEDIA-002 — Fotos de tareas obligatorias al completar + carrusel de recuerdos

> **Estado:** DEFINIDO (2026-09-11) — sin implementar. Ver [Alcance](#alcance--entra).
> **Dueño técnico:** Bob (back) + Jay (front) · **AppSec:** Julia · **DBA:** Gary · **QA:** Duck · **PM:** Paul
> **Depende de:** [REQ-MEDIA-001](REQ-MEDIA-001.md) — **debe estar CERRADO y desplegado** antes de que Bob empiece este REQ (ver [Por qué depende de REQ-MEDIA-001](#por-qué-depende-de-req-media-001)).
> Definido junto a Franco en sesión de producto, 2026-09-11. Ver ejemplo visual (mockup interactivo, Drive + carrusel) discutido en esa sesión.

## Objetivo

Cerrar el hueco que REQ-MEDIA-001 dejó abierto a propósito ("fotos de planes […] la
separaría en su propio REQ una vez que este cierre"): permitir adjuntar fotos a una
tarea (plan) en cualquier momento de su ciclo de vida, exigir al menos una foto para
poder marcarla como completada, y mostrar esas fotos en un carrusel post-login.

## Por qué depende de REQ-MEDIA-001

Cada foto nueva de tarea es un archivo más en la hoja `Archivos`. Si MEDIA-001 no
cerró todavía, esas fotos nacen con `ANYONE_WITH_LINK` (público por link) —
construir un carrusel encima de eso *multiplica* la exposición en vez de resolverla.
Bob no arranca este REQ hasta que MEDIA-001 esté **CERRADO y desplegado a
producción**.

## Alcance — entra

### 1. Foto(s) en cualquier momento del ciclo de vida de la tarea

- Botón "Agregar foto" en el modal de plan (Jay), disponible mientras la tarea está
  `pendiente` o `completado` (no en `eliminado`).
- Reutiliza `insertArchivo` / `newId('arc')` / hoja `Archivos` ya existentes:
  `owner_tipo='plan'`, `owner_id=plan_id`, `proposito='adjunto'`, `estado='activo'`.
- Una tarea puede tener varias fotos. Sin límite superior fijo en este REQ — a
  revisar si se vuelve un problema práctico (escala: 2 usuarios).

### 2. Foto obligatoria para completar

- `handleCompletePlan` ([Code.gs:1073](../../Code.gs:1073)) devuelve `400` si el
  plan no tiene ninguna fila en `Archivos` con `estado='activo'`,
  `owner_tipo='plan'`, `owner_id=plan_id`.
- Frontend (`completarPlan`, [index.html:2380](../../index.html:2380)): si el
  backend devuelve ese 400, abre directo el flujo de subida de foto en vez de un
  error genérico — el usuario nunca queda frente a un cartel sin salida.

### 3. Estructura de Drive — carpetas legibles (Opción B, confirmada por Franco)

Para fotos de tareas, esta estructura **reemplaza** el árbol
`media/planes/<plan_id>/...` de [../modelo-datos.md](../modelo-datos.md) §5 (ese
árbol sigue vigente para avatares y fotos sueltas — no aplica a fotos de tarea).

```
media/
└── planes-fotos/
    └── <AAAA>/                                     ej: 2026
        └── <NombreMes>/                            ej: Enero
            └── <DD-MM-AAAA>-<categoria>-<titulo>/  ej: 20-01-2026-mantenimiento-arreglar-el-techo
                ├── 0001-<DD-MM-AAAA>-<titulo>.<ext>
                ├── 0002-<DD-MM-AAAA>-<titulo>.<ext>
                └── ...
```

Reglas:

- `<AAAA>` / `<NombreMes>` / `<DD-MM-AAAA>` salen de la **fecha de la primera foto
  subida a esa tarea** (`fecha_contenido` de la primera fila `Archivos` con
  `owner_id=plan_id`), no de `fecha_vencimiento` ni de una fecha de completado.
  Motivo: una tarea puede recibir fotos antes de estar completada, así que "fecha
  de completado" no siempre existe todavía cuando hay que crear la carpeta.
- **La carpeta de la tarea se crea recién con la primera foto, nunca antes**
  (confirmado por Franco, es de diseño). Crear una tarea, o incluso dejarla
  `completada`, no genera ninguna carpeta en `planes-fotos/` por sí solo — el
  `getOrCreateFolderPath` de [../modelo-datos.md](../modelo-datos.md) §5 solo se
  invoca desde el flujo de subida de foto (`handleUploadPhoto`/equivalente para
  fotos de tarea), nunca desde `handleCreatePlan` ni `handleCompletePlan`. Una
  tarea completada sin fotos (si en algún momento existiera una vía para eso) no
  deja rastro en Drive.
- **Congelado** (confirmado por Franco): una vez creada la carpeta de la tarea, su
  nombre no se vuelve a tocar aunque después se edite el título o la categoría del
  plan. Fotos subidas después de una edición caen igual en la carpeta original.
- `<categoria>` y `<titulo>` se **normalizan** para nombre de carpeta/archivo:
  minúsculas, sin tildes/ñ→n, espacios→guiones, se descarta todo carácter fuera de
  `[a-z0-9-]`, truncado a ~60 caracteres. Ej.: "Arreglar el techo" →
  `arreglar-el-techo`.
- `<NombreMes>`: **confirmado por Franco** — capitalizado, primera letra en
  mayúscula (`Enero`, `Febrero`, …), no minúsculas. Es la única excepción a la
  regla de "sin mayúsculas" de [../modelo-datos.md](../modelo-datos.md) §3 —
  se acepta porque es un segmento de ruta pensado para lectura humana en Drive,
  no un identificador del modelo de datos.
- Numeración `0001`, `0002`... es correlativa **por tarea** (no global), asignada
  por orden de subida.
- Se mantiene la regla de [../modelo-datos.md](../modelo-datos.md) §5 de escribir
  el JSON de recuperación en la Descripción del archivo de Drive (`{archivo_id,
  owner_tipo, owner_id, proposito, subido_por, fecha_subida}`).
- **Pendiente de Gary**: revisar colisión de nombres (dos tareas con mismo título
  el mismo día → misma carpeta; dos fotos subidas en el mismo segundo → mismo
  número de secuencia) y decidir si hace falta un sufijo anti-colisión. Gary
  actualiza [../modelo-datos.md](../modelo-datos.md) §5 con este árbol una vez
  cerrado el REQ.

### 4. Carrusel post-login — "Preview + modal" (confirmado por Franco)

- Card compacta en el dashboard, enganchada después de `initApp()` termina de
  cargar ([index.html:2001](../../index.html:2001)): tira de miniaturas (las
  últimas ~5 fotos, más reciente primero) + texto tipo "N fotos nuevas".
- Click abre un modal a pantalla completa con carrusel navegable: cada foto con
  caption de **título, categoría y fecha** de la tarea (confirmado).
- Fuente de datos: fotos `proposito='adjunto'`, `owner_tipo='plan'`,
  `estado='activo'` — de cualquiera de los dos usuarios (visibilidad confirmada:
  cualquier usuario logueado ve todo, mismo criterio que se usa para el resto de
  la app).
- Las imágenes se piden por `getArchivo` (REQ-MEDIA-001), nunca por URL directa.

## Alcance — fuera de este REQ (anotado para el futuro)

- **Navegación por época / "recuerdos"** (anotado explícitamente por Franco): no
  mostrar solo lo más reciente, sino también fotos de otros momentos — tipo "En
  este día" de Google Fotos o "Recuerdos" de iOS Photos. Es una funcionalidad de
  descubrimiento con lógica propia (qué mostrar, con qué cadencia, quizás
  "misma fecha, año anterior"). Queda anotada como candidata a **REQ-MEDIA-003**,
  sin diseñar todavía — se retoma cuando este REQ y MEDIA-001 estén en producción.
- Límite de cantidad/tamaño de fotos por tarea.
- Editar o borrar una foto individual ya subida (el modelo soporta
  `estado='eliminado'`, pero no hay UI para eso en este REQ).
- Reordenar fotos dentro de una tarea.

## Criterios de aceptación (verificables por Duck)

| # | Criterio |
|---|---|
| 1 | Con 0 fotos activas en una tarea, `completePlan` devuelve `400` y no cambia `estado`. |
| 1b | Crear una tarea nueva (con o sin completarla después) sin subirle ninguna foto → no aparece ninguna carpeta nueva bajo `planes-fotos/` en Drive. |
| 2 | Subir una foto a una tarea `pendiente` (sin completarla) → la tarea sigue `pendiente`, la foto queda activa y visible en el carrusel, y recién ahí aparece la carpeta de la tarea en Drive. |
| 3 | Con al menos 1 foto activa, `completePlan` funciona igual que hoy. |
| 4 | La carpeta de Drive de una tarea se crea con la fecha de la **primera** foto subida; subir una segunda foto no crea carpeta nueva ni renombra la existente. |
| 5 | Editar el título o la categoría de una tarea que ya tiene fotos no mueve ni renombra su carpeta de Drive. |
| 6 | El carrusel muestra fotos de ambos usuarios, ordenadas de más reciente a más antigua, con título/categoría/fecha correctos por foto. |
| 7 | El preview del dashboard abre el modal al click; el modal cierra con el botón de cerrar. |
| 8 | Ninguna foto de tarea se sirve por URL pública — todas pasan por `getArchivo` con sesión válida. |
| 9 | Sin regresión: todo lo cubierto por REQ-MEDIA-001 sigue funcionando igual. |

## Datos sensibles

Fotos de tareas (`owner_tipo='plan'`) son contenido personal (Ley 25.326), mismo
marco que REQ-DATA-001 / REQ-MEDIA-001.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Colisión de nombres de carpeta/archivo (mismo título, mismo día) | Pendiente de definición con Gary antes de que Bob empiece — ver nota en la sección de estructura de Drive. |
| Título con caracteres raros rompe el nombre de carpeta | Normalización estricta (allowlist `[a-z0-9-]`) antes de crear la carpeta. |
| Bloquear "completar" sin foto frustra al usuario si no tiene una a mano en el momento | El flujo de completar abre directo la subida en vez de un error seco — ver punto 2 del alcance. |

## Plan de pruebas (Duck)

1. Completar tarea sin fotos → `400`, no cambia estado (criterio 1).
2. Subir foto a tarea pendiente, sin completar → aparece en el carrusel, tarea
   sigue pendiente (criterios 2, 6).
3. Completar tarea con 1+ foto → funciona (criterio 3).
4. Subir 2 fotos a la misma tarea en momentos distintos → 1 sola carpeta,
   numeración `0001`/`0002` (criterio 4).
5. Editar el título de una tarea con fotos, subir una foto más → cae en la
   carpeta vieja (criterio 5).
6. Abrir el preview del dashboard → modal con captions correctos, fotos de ambos
   usuarios (criterios 6, 7).
7. Inspeccionar Network mientras se ve el carrusel → 0 URLs públicas de Drive
   (criterio 8).
8. Regresión completa de los criterios de REQ-MEDIA-001 (criterio 9).
