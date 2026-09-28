# Backlog — ideas sin formalizar

Lo que falta decidir o construir y todavía no es un REQ. Datos del proyecto
que mantiene la skill `hpaul-triage` (ahí están el formato, los estados y
cuándo escribir). Hasta el 2026-09-27 este archivo vivía en
`skills/hpaul-backlog/BACKLOG.md` (ver DEC-001).

Regla propia de Peroncitos: un hallazgo sobre un REQ que ya existe en
`docs/requerimientos/REQ-XXX.md` se escribe en ese REQ, no acá. Acá, como
mucho, una referencia cruzada (ver `CLAUDE.md`).

---

## Sesión 2026-09-16

Ítems consolidados ese día desde la bitácora de sesiones anteriores
(vivían dispersos en prosa, nunca se habían volcado acá). Cada uno se
verificó contra el código actual antes de agregarlo — varios ítems viejos
de la bitácora ya estaban resueltos y no se incluyen (nav-tab/filter-chip
ya son `<button>`, `confirm()` nativo ya se reemplazó por modal propio,
`errorEl.textContent` en `forceLogout()` ya se limpia, IDs de categoría/plan
ya usan `newId()`, trigger de `purgarSesiones()` ya verificado en prod,
carpeta de Drive ya compartida con Noelia, hallazgo de `revocarSesion()` en
ventana fría ya corregido, tests ya viven versionados en `Tests.gs`).
Migrados el 2026-09-27 al formato por sesión de `hpaul-triage` (solo cambió
el nivel de los encabezados; el contenido de cada ítem es el original).

### BL-001 — Endpoint único de carga inicial
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-PERF-001 (2026-09-15), reconfirmado fuera de alcance en REQ-PERF-002
- Nota: juntar categorías + planes + usuarios + avatares + fotos recientes
  en una sola invocación de Apps Script, en vez de las ~3 etapas actuales.
  Descartado dos veces por no ser el cuello de botella dominante en ese
  momento — si el primer ingreso en un dispositivo nuevo (sin cache) vuelve
  a sentirse lento, retomar acá. Requiere diseño de Bob + revisión de costo
  del lado del servidor de Gary.

### BL-002 — Test automatizado permanente para getArchivos (batch)
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-PERF-001 (2026-09-15)
- Nota: hoy solo tiene el smoke que corrió Duck una vez; no quedó como test
  permanente en Tests.gs. *(2026-09-27, validación de skills: tampoco hay
  test de 401 por `doPost` para `getArchivos` ni `getRecentPlanPhotos`;
  `getArchivo` sí lo tiene. Sumarlos acá.)*

### BL-003 — REQ-ADMIN-001: rol admin + panel
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-DATA-001 (2026-09-08), repetido sin arrancar en varias sesiones
- Nota: rol admin + hoja Config + endpoint setDriveRootFolder + panel de
  administración. Nunca se empezó a implementar. *(2026-09-27, A/B de
  BL-020: `docs/modelo-datos.md` mueve `DRIVE_FOLDER_ID` de Script
  Properties a la hoja `Config`, y `convenciones-tecnicas/seguridad.md`
  dice que los IDs viven en Script Properties. Decidirlo con un ADR al
  retomar. El rol se lee en el handler en cada pedido: el caché de sesión
  solo guarda el `userId`.)*

### BL-004 — Reemplazar los glifos de UI restantes por SVG
- Estado: Hecho — en `main` (GitHub Pages) desde el 2026-09-27 (commit a95c10d)
- Prioridad: Baja
- Origen: REQ-AUTH-001 (2026-09-05), mayormente resuelto en sesiones
  posteriores
- Nota: quedan 2 glifos sueltos violando la regla de identidad-visual (nada
  de glifos como iconos de UI): el "✦" del empty state y el "✕" del overlay
  de foto con error en la grilla de subida. El corazón "♡" del `<title>` es
  identidad de marca y no aplica acá. *(2026-09-27: son 3; falta también el
  "◇" del vacío de categorías, `index.html:3353`. Ver `docs/DESIGN.md`,
  "Iconos".)*

### BL-005 — Enmascarar también el dominio en enmascararEmail()
- Estado: Propuesto
- Prioridad: Baja
- Origen: revisión de Julia en REQ-DATA-002 (2026-09-10)
- Nota: hoy `enmascararEmail` solo oculta el usuario (`f***@dominio.com`);
  el dominio completo queda expuesto en el log de Auditoria para
  `login_denegado`.

### BL-006 — Purga/retención del log de Auditoría
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-DATA-002 (2026-09-10), marcado como fuera de alcance
- Nota: la hoja Auditoria crece sin límite. Falta definir política de
  retención/purga — candidato a REQ futuro bajo Ley 25.326.

### BL-007 — REQ-MEDIA-003 candidato: navegación por época / "recuerdos"
- Estado: En curso — formalizado como REQ-MEDIA-003 (2026-09-28), con alcance y ubicación (opción A) aprobados por Franco
- Prioridad: Sin definir (pedido explícito de Franco, sin fecha)
- Origen: REQ-MEDIA-002 (2026-09-14), anotado explícitamente por Franco
- Nota: no mostrar solo lo más reciente en el carrusel, sino también fotos
  de otros momentos — tipo "En este día" de Google Fotos o "Recuerdos" de
  iOS Photos. Funcionalidad de descubrimiento con lógica propia (qué
  mostrar, con qué cadencia). Se retoma cuando REQ-MEDIA-001/002 estén
  asentados en producción (ya lo están).

### BL-008 — Límite de cantidad/tamaño de fotos por tarea
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: hoy no hay tope de cuántas fotos (ni cuánto peso total) se pueden
  subir a una misma tarea.

### BL-009 — Editar o borrar una foto individual ya subida
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: el modelo de datos ya soporta `estado='eliminado'` en Archivos,
  pero no hay UI para borrar (ni editar) una foto puntual una vez subida.

### BL-010 — Reordenar fotos dentro de una tarea
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: las fotos se muestran en el orden en que se subieron, sin forma de
  reordenarlas.

### BL-011 — REQ-PERF-004: miniatura de Drive para la card de "fotos recientes"
- Estado: Hecho — REQ-PERF-004 en producción desde el 2026-09-28 11:11 (1.2.0, Web App @29); `getMiniaturas` sirve también a "Ya subidas", no solo a la card
- Prioridad: Sin definir
- Origen: REQ-PERF-003 (2026-09-15); diagnóstico de `thumbnailLink` corrido
  el 2026-09-16
- Nota: `DriveApp.getThumbnail()` (probado en REQ-PERF-003) no sirve para
  fotos subidas. El campo `thumbnailLink` de la API de Drive v3 (Servicio
  Avanzado) sí — probado dos veces contra el proyecto de test, confiable e
  inmediato (594 bytes a 220px vs. el original completo). Falta: Bob lo
  implementa con fallback al blob completo, Julia confirma el criterio de
  privacidad del proxy (nunca exponer la URL de Google al cliente).

## Sesión 2026-09-27

### BL-012 — `docs/DESIGN.md` de Nuestros Planes
- Estado: En curso (escrito el 2026-09-27 y commiteado en a4baa76; puesto al día con REQ-UX-002 el 2026-09-28, fase 4; falta la revisión de Franco, que se pide junto con la fase 5)
- Prioridad: Media
- Origen: reemplazo de skills por las de sis-web (DEC-001). Jay y `hjay-identidad-visual` usan el `DESIGN.md` del proyecto "si tiene uno"; en sis-web salió de extraer del código colores, tipografía y componentes.
- Nota: extraer de `index.html` el sistema de diseño real (tokens de color, radios, tipografía, botones, modales, excepciones) para que los cambios visuales tengan una referencia escrita. Lo mantiene Jay.

### BL-013 — Documento de seguimiento de seguridad
- Estado: Propuesto
- Prioridad: Baja
- Origen: reemplazo de skills por las de sis-web (DEC-001). La persona de Julia lee y actualiza "el documento de seguimiento de seguridad del proyecto" si existe (en sis-web, `docs/seguridad/revision-insis.md`).
- Nota: juntar en un solo archivo las superficies ya revisadas (REQ-SEC-001/002, REQ-DATA-002, BUG-LOGIN-001), los hallazgos abiertos (BL-005, BL-006) y el criterio acordado. Hoy está repartido entre los REQ.

### BL-014 — Validar las skills traídas de sis-web con escenarios de Peroncitos
- Estado: Hecho para `hjulia-revision-cambio` y `hjay-verificacion-visual` (2026-09-27, cerrado con BL-020). Las demás skills traídas de sis-web siguen sin pasada propia (ver `docs/skills/INVENTARIO.md`); se validan cuando les toque su pasada.
- Prioridad: Media
- Origen: reemplazo de skills por las de sis-web (DEC-001). La metodología pide probar cada skill con un subagente limpio ("Claude B") y al menos 3 escenarios; las copias no se probaron sobre este proyecto.
- Nota: sobre todo `hjulia-revision-cambio` (piensa en reglas de base de datos; acá la capa que decide es `Code.gs`) y `hjay-verificacion-visual` (con el preview local que pega a prod). Registrar el resultado en `docs/skills/INVENTARIO.md`.

## Sesión 2026-09-27 (2)

### BL-015 — Sacar a alguien de `Usuarios` no corta sus sesiones
- Estado: Hecho — en producción desde el 2026-09-27 (Web App @23)
- Prioridad: Alta (seguridad)
- Origen: validación A/B de `hjulia-revision-cambio` (2026-09-27), verificado a mano en el código
- Nota: `validarSesion` (`Code.gs`) consulta `Sesiones` y nunca `Usuarios`. Una cuenta dada de baja sigue entrando hasta que vence su sesión (15 días) o se revoca a mano. Hoy, con dos personas, lo mitiga marcar sus filas de `Sesiones` como `revocada`. Opciones: chequear la lista blanca en cada pedido (cuesta una lectura de hoja) o una función "revocar todas las sesiones de X" (REQ-SEC-001 lo dejó fuera de alcance). *(2026-09-27, A/B de BL-020, verificado a mano: el chequeo va en el router de `doPost`, después de `validarSesion`, porque el camino rápido de 90 s y el puente devuelven `userId` sin pasar por la hoja; `Usuarios` tiene caché de 30 s, que es la demora aceptada. Ojo: `probarBUGLOGIN001B` crea sesiones de `usr_fran` sin fila en `Usuarios`; sus casos positivos por `doPost` se rompen con el chequeo y hay que sembrar la fila.)* *(2026-09-27, implementado: `usuarioHabilitado()` en el router de `doPost` — fila presente y con email. Test `probarBL015` (12 checks) falla 6/12 contra el `Code.gs` viejo y pasa 12/12 con el nuevo. La advertencia sobre `probarBUGLOGIN001B` no aplicaba: sus casos llaman a `validarSesion` directo, no a `doPost`, y siguió 38/38. Fuera de alcance: si la fila vuelve a aparecer, una sesión que no venció vuelve a andar (no se revoca en `Sesiones`); lo documenta el caso N1 del test.)*

### BL-016 — Las fotos quedan en el navegador después de cerrar sesión
- Estado: Hecho — en `main` (GitHub Pages) desde el 2026-09-27 (commit afe9cbf)
- Prioridad: Baja
- Origen: validación A/B de `hjulia-revision-cambio` (2026-09-27), verificado a mano
- Nota: `clearSession()` borra `cp_session` pero no `cp_image_cache` (hasta 150 fotos como data URL en `localStorage`) ni `avatarCache`. En un dispositivo compartido se pueden leer desde DevTools sin sesión (Ley 25.326).

### BL-017 — ¿Las fotos de un plan eliminado siguen en "recuerdos"?
- Estado: En curso — Franco decidió el 2026-09-28 que no se muestran; entra en REQ-MEDIA-003 (solo el filtro de lectura; pasar las fotos a `archivado` al borrar la tarea, como dice `docs/modelo-datos.md`, sigue pendiente)
- Prioridad: Sin definir
- Origen: validación A/B de `hjulia-revision-cambio` (2026-09-27), verificado a mano
- Nota: `handleGetRecentPlanPhotos` filtra por el estado de la foto, no del plan, y borrar un plan no toca `Archivos`. Las fotos de planes eliminados siguen en el carrusel. Decisión de producto (¿un recuerdo sobrevive al plan?). Se cruza con BL-007 y BL-009.

### BL-018 — Deudas de UI que dejó a la vista `docs/DESIGN.md`
- Estado: Hecho — en `main` (GitHub Pages) desde el 2026-09-27 (commits a95c10d y 717653a)
- Prioridad: Baja
- Origen: armado de `docs/DESIGN.md` (BL-012), 2026-09-27
- Nota: falta `color-scheme: dark` (el calendario nativo de `<input type="date">` puede salir claro); no hay bloque `prefers-reduced-motion`; `--transition` es `all`; los `<label>` no tienen `for`; los botones de la tarjeta de plan no tienen `aria-label` ni `type="button"`. Detalle en DESIGN.md, "Deudas conocidas". *(2026-09-27: primera parte en `main` (a95c10d): `color-scheme`, `type="button"`, `aria-label`. Segunda: `--transition` con propiedades nombradas; bloque `prefers-reduced-motion` (spinners siguen) y `menosMovimiento()` en JS (estrellas fijas, sin chispas, halo sin demora); `for` en los 5 labels de campo y `aria-label` en el zoom; `:focus-visible` en campos y zoom. Lo que quedó afuera va a BL-022.)*
### BL-019 — Nada avisa si la autorización del Apps Script vuelve a vencer
- Estado: Propuesto
- Prioridad: Baja
- Origen: causa raíz de BUG-CARGA-001 (2026-09-27)
- Nota: del 20 al 25/09 la Web App respondió 500 por permisos y nadie se enteró hasta que Franco vio la pantalla vacía. Con la app OAuth en "En producción" no debería repetirse, pero hoy solo se detecta mirando `clasp logs`. Evaluar una alerta de Cloud Logging por "No tienes permiso".

### BL-020 — Mejoras genéricas a dos skills traídas de sis-web
- Estado: Hecho (2026-09-27, segunda sesión del día: cambios aplicados y validados en 4 rondas de Claude B, detalle en `docs/skills/INVENTARIO.md`)
- Prioridad: Media
- Origen: validación A/B de BL-014 (2026-09-27)
- Nota: `hjay-verificacion-visual` y `hjulia-revision-cambio` asumen una base con SDK y reglas (Firestore). Cambios mínimos propuestos, todos genéricos: "la capa que decide (regla de la base o handler del servidor)", anular escrituras "en la capa más baja por la que salen todas (el SDK, o `fetch`)", la fila "cuenta dada de baja con sesión válida" en la matriz, alturas bajas y teclado virtual cuando el síntoma es vertical, reclamos desde un teléfono (sin F12), y que "anda" en el servidor lo prueban los tests. Decidido (DEC-003): se editan acá y no se lleva nada a sis-web. Queda para otra sesión: aplicar los cambios con el proceso de `docs/skills/METODOLOGIA.md` y volver a correr A/B.

## Sesión 2026-09-27 (3)

### BL-021 — Después del logout, el DOM de la app sigue con los datos
- Estado: Hecho — en `main` (GitHub Pages) desde el 2026-09-27 (commit a95c10d)
- Prioridad: Baja
- Origen: búsqueda de variantes de BL-016 (2026-09-27)
- Nota: `forceLogout()` oculta `#app-screen` pero no vacía lo que ya se pintó (planes, categorías, miniaturas de fotos recientes, carrusel) ni `state.planes`/`state.categorias`/`fotosRecientes`/`carruselFotos`. Dura mientras la pestaña siga abierta (cerrarla lo borra, a diferencia de `localStorage`). Opción simple: recargar la página después del logout, pasando el mensaje de "sesión expirada" por `sessionStorage`.
  *(2026-09-27, implementado: si había sesión, `forceLogout()` guarda el
  mensaje en `sessionStorage` (`cp_logout_msg`) y hace
  `location.replace(pathname + search)`; el arranque lo muestra una vez y
  lo borra. Una bandera evita recargas repetidas con varios 401 juntos.
  Verificado en 127.0.0.1 con `fetch` simulado: logout manual, 3 pedidos
  con 401 a la vez (1 sola descarga de página, mensaje visible) y
  `sessionStorage` bloqueado (recarga igual, sin mensaje).)*

## Sesión 2026-09-27 (4)

### BL-022 — Los colores de categoría no se eligen con el teclado
- Estado: Propuesto
- Prioridad: Baja
- Origen: cierre de BL-018 (2026-09-27)
- Nota: `renderColorOptions` pinta cada color como `<div class="color-option" onclick>`: sin foco, sin rol ni nombre para un lector de pantalla, y de 26px (menos de 44 de área táctil en el teléfono). Pasarlos a `<button type="button" aria-label="Color …" aria-pressed>` (o radios) dentro de un grupo con nombre ("Color"), con área táctil de 44. Ojo: `.color-option` está en `CLICKABLE_SEL` del cursor propio y `selectColor` recorre los `.color-option` por clase.

## Sesión 2026-09-27 (5)

Pedidos de Franco después de un caso real: completó una tarea, la reabrió a
mano en la planilla para que Noelia subiera sus fotos, y esas fotos quedaron
con fecha del día siguiente. Los que tienen alcance claro ya son REQ:
BUG-FECHA-001, REQ-SYNC-001, REQ-MEDIA-004, REQ-PLAN-001 y REQ-UX-001. Acá
queda solo lo que falta decidir.

Investigación de mercado de todos los pendientes (2026-09-27): `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md`.
Lo que cambia algo de un REQ quedó escrito en ese REQ.

### BL-023 — Videos en las tareas
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: Franco (2026-09-27), al pedir el conteo "fotos / videos" y "mínimo una foto o video" para cerrar
- Nota: hoy no se pueden subir videos: `MIME_EXT` solo acepta JPG, PNG y WEBP. Un video pesa mucho más que una foto y hoy se manda en base64 dentro de un `doPost`, que tiene límite de tamaño y de tiempo. Necesita diseño propio (subida por partes o directo a Drive, miniatura, reproducción a través del proxy sin exponer la URL). REQ-MEDIA-004 y REQ-PLAN-001 dejan el conteo preparado para sumar videos.

### BL-024 — Reabrir una tarea completada desde la app
- Estado: En curso (Franco dijo que sí el 2026-09-27; entra en REQ-PLAN-001, punto 6)
- Prioridad: Media
- Origen: Franco (2026-09-27): tuvo que cambiar `completado` → `pendiente` a mano en la hoja `Planes`
- Nota: hoy no hay forma de reabrirla desde la app. Con REQ-PLAN-001 se cruza así: reabrir borra los acuerdos. Pregunta abierta en REQ-PLAN-001.

### BL-025 — Qué fecha lleva una foto (captura, programada o subida) y tareas de varios días
- Estado: Hecho — REQ-MEDIA-005 en producción desde el 2026-09-28 (Web App @27 y front en `main`)
- Prioridad: Media
- Origen: Franco (2026-09-27), después de BUG-FECHA-001
- Nota: hoy `fecha_contenido` es el día de la subida. Opciones: la fecha en que se sacó la foto (EXIF), la fecha programada de la tarea o la de subida. Además, una tarea puede durar varios días y cada foto debería mostrar a qué día corresponde. BUG-FECHA-001 arregla solo el corrimiento UTC, no esta decisión.
  *(2026-09-27, investigación de Paul: Google Fotos ordena por la fecha de captura del EXIF (`DateTimeOriginal`). Si el archivo no la trae, usa la de subida, y el usuario la puede corregir a mano. Esa corrección vive en la base de Google Fotos, no en el archivo. Las apps de viaje (Polarsteps) agrupan las fotos por día o por "paso" dentro de un viaje de varios días. Hallazgo propio: la app recomprime cada foto con `canvas` antes de subirla (`index.html:3191`), y eso borra el EXIF. Por eso la fecha de captura hay que leerla en el navegador antes de comprimir, con un lector chico tipo ExifReader. Además, iOS a veces la saca al compartir. Propuesta: la fecha de la foto es la de captura; si no hay, la del día de subida en hora Argentina; en los dos casos se puede editar. La fecha programada no se usa como fecha de foto. Para tareas de varios días: una fecha de fin opcional en la tarea (la programada pasa a ser el inicio) y las fotos agrupadas por día ("Día 1 · sáb 27/09"). Falta que Franco decida; después se formaliza como REQ.)*

## Sesión 2026-09-27 (6)

### BL-026 — Área táctil de los botones de la tarjeta de tarea
- Estado: Propuesto
- Prioridad: Baja
- Origen: verificación visual de REQ-PLAN-001 (2026-09-27)
- Nota: "Estoy de acuerdo", "Completar", "Reabrir" y los íconos de editar y eliminar miden unos 29 px de alto a 375 px, menos que los 44 px que pide `hjay-verificacion-visual` para el dedo. Ya pasaba con "Marcar completado"; se dejó igual que los vecinos. Agrandar el área táctil (padding o `min-height: 44px` en móvil) sin cambiar cómo se ve en escritorio. Se cruza con BL-022.

## Sesión 2026-09-28

### BL-027 — Visor de fotos a pantalla completa en el teléfono
- Estado: Propuesto
- Prioridad: Media
- Origen: pedido de Franco durante REQ-MEDIA-004 (2026-09-28): "cuando pulsemos la foto, que se agrande y la veamos en el centro de la pantalla".
- Nota: hoy tocar una foto (en "Ya subidas" o en el carrusel de recuerdos) la abre en el visor del carrusel, centrado, pero a 375 px la foto ocupa unos 212 px de ancho: las flechas y los márgenes del recuadro se comen el resto. La idea es un visor a pantalla completa (fondo negro, foto de borde a borde, deslizar para pasar, cerrar con la X o bajando). Cambia también el carrusel de recuerdos: va con mockup antes. Postergado porque la sesión ya venía cargada.

## Sesión 2026-09-28 (2)

### BL-028 — Corregir la fecha de una foto desde el carrusel de recuerdos
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-MEDIA-005 (2026-09-28)
- Nota: "Cambiar fecha" está solo en el visor que se abre desde las fotos de una tarea. En el carrusel de recuerdos (la card de fotos recientes) no aparece. Si se quiere ahí también, el endpoint `setFechaFoto` ya sirve; falta que `getRecentPlanPhotos` devuelva `fechaOrigen` y mostrar el control. Se cruza con BL-027 (visor a pantalla completa).

## Sesión 2026-09-28 (3)

### BL-029 — Versionado de la app
- Estado: En curso — criterio aprobado por Franco el 2026-09-28 (DEC-009); se aplica por primera vez con REQ-MEDIA-003 (`1.1.0`)
- Prioridad: Sin definir
- Origen: pregunta de Franco durante REQ-MEDIA-003 (2026-09-28): "¿estamos llevando un versionado de la app?"
- Nota: hoy no hay número de versión. El servidor tiene las versiones de deploy de Apps Script (@27) y el front solo tiene commits en `main`: no hay forma de saber qué versión tiene abierta cada teléfono. Propuesta de Roy y Paul, basada en lo que se usa en la industria: (1) SemVer `MAYOR.MENOR.PARCHE` para la app entera (front y servidor juntos): MENOR = un REQ nuevo, PARCHE = un bug o un ajuste, MAYOR = un cambio incompatible (migración de hojas que obliga a actualizar los dos lados). Arranca en `1.0.0` = lo que está hoy en prod. (2) Una constante `APP_VERSION` en `index.html` y en `Code.gs`, visible en el perfil. (3) Un tag anotado de git `vX.Y.Z` en cada salida a prod, y la misma versión en la descripción del deploy de Apps Script, para que se correspondan. (4) Un `CHANGELOG.md` en formato Keep a Changelog, en castellano y para Franco y Noelia (qué cambió para ellos); la bitácora sigue siendo el registro técnico. Etapa 2, aparte: que el servidor devuelva su versión y el front avise "hay una versión nueva, recargá" si no coincide (se cruza con REQ-SYNC-001 y BL-001).

### BL-030 — Miniaturas de "Ya subidas" que siguen quedando en "Sin vista previa"
- Estado: Hecho: Franco confirmó el 2026-09-28 (~15:15, 1.2.2, computadora con wifi parecida a la de su casa) que las miniaturas de "Ya subidas" aparecen ya listas. Queda mirarlo en el teléfono cuando se pruebe BL-032 ahí
- Prioridad: Media
- Origen: Franco (2026-09-28), después del fix de miniaturas de a 3 con reintento (2a1a038): "mejoró, al abrir una imagen carga la vista previa, pero sigue habiendo varias que no cargan".
- Nota: pasa en "Ya subidas" (modal de la tarea) **sin abrir el visor**, así que la hipótesis de que el visor cancela los pedidos (`abortFetchesExcepto`) no alcanza a explicarlo. Datos: `getArchivo` devuelve la foto entera en base64 (no hay miniatura, ver BL-011/REQ-PERF-004); cada miniatura se reintenta una sola vez a los 800 ms y después queda fija hasta reabrir la tarea; `api()` no tiene timeout propio. `clasp logs` de la sesión no mostró errores de lectura en la Web App (no concluyente: parecían corridas de test). Primer paso: reproducir en el navegador contra prod en modo solo lectura y mirar qué responde cada `getArchivo` que falla (status, error, tiempo).
  *(2026-09-28, reproducción en el Chrome de Franco sobre la app publicada (1.1.0), solo lectura, con un registro de cada `getArchivo`: la tarea de 16 fotos cargó 16/16 dos veces, la segunda sin caché, sin ninguna respuesta de error. Pero cada miniatura baja la foto entera: 150 KB a 1 MB en base64 (7,6 MB en total), de 3,3 a 10,2 s por foto (mediana 5,6 s) y 33 s hasta la última. En el teléfono, con peor red y menos memoria, eso es lo que más probablemente termina en "Sin vista previa". Los "Error al leer archivo" con `fake-drive-id-sim-plan001` que aparecen en `clasp logs` son del Web App de test (simulación de PLAN-001), no de prod. El navegador integrado de Claude no sirve para esto: Google no deja iniciar sesión (anotado en `convenciones-tecnicas`). Arreglo de fondo: REQ-PERF-004, miniatura con `thumbnailLink` (~600 bytes contra ~500 KB), que ya estaba diagnosticado. Falta saber si Franco lo ve en el teléfono y con qué versión (ahora se ve en Mi perfil).)*
  *(2026-09-28, Franco: lo ve **en la computadora**, no en el teléfono. La red del teléfono no lo explica; sigue siendo candidato el peso de cada miniatura (7,6 MB y 33 s para 16). Próxima sesión: REQ-PERF-004, y si después de eso sigue pasando, registrar en su navegador qué responde el `getArchivo` que falla.)*

### BL-031 — Completar varias tareas seguidas: la tarjeta vuelve a verse pendiente
- Estado: Hecho — en producción con 1.2.2 (2026-09-28; GitHub Pages lo publicó recién con el commit vacío c63f2a1, porque el push de 32d55e6 no disparó el build)
- Prioridad: Media
- Origen: Franco (2026-09-28, cierre de sesión, versión 1.1.0 en la computadora): "puse completar en todas, se puso gris pero después se puso de color de nuevo cuando se actualizó". Tuvo que pasar el filtro de "Todos" a "Pendientes" y volver a "Todos" para que se viera bien.
- Nota: sin investigar todavía. Hipótesis de Jay, leyendo el código: `completarPlan` (`index.html:4843`) hace `refreshPlanes()` después de cada cierre, y `loadPlanes` (`index.html:3711`) pisa `state.planes` con lo que llegue, sin ningún token de orden. Con varios cierres seguidos, un `getPlanes` que salió antes (con las otras tareas todavía pendientes en el servidor) puede llegar último y dejar el estado o la pantalla viejos. El mismo patrón de `planFotosYaToken`/`carruselRenderToken` lo resolvería: descartar las respuestas de `getPlanes` que no son la última pedida. Reproducir primero con `fetch` simulado y respuestas en desorden, sin tocar prod. Se cruza con REQ-SYNC-001.
  *(2026-09-28, reproducido en localhost con `fetch` simulado: completar A, a los 400 ms B, con el `getPlanes` de A tardando 2 s → B se pone gris y 1,4 s después vuelve a pendiente, en el estado y en la pantalla. La hipótesis de Jay era correcta. Arreglo: `loadPlanes` numera cada pedido (`planesPedido`) y aplica una respuesta solo si salió después de la última aplicada (`planesAplicado`). No se descarta todo lo que no sea el último pedido: si el más nuevo falla, uno anterior que llega bien igual se aplica. Verificado con 3 casos: el del bug (queda A y B completadas), tres cierres en orden (quedan las tres) y el `getPlanes` más nuevo con 500 dos veces (se aplica el anterior). Consola limpia. Una duda que quedó abierta: según el reporte, pasar de "Todos" a "Pendientes" lo arreglaba, pero el filtro solo vuelve a pintar el estado, y en la reproducción el estado también quedaba viejo. Lo más probable es que para entonces ya hubiera llegado otra respuesta. El caso del 500 dejó a la vista BL-033.)*

## Sesión 2026-09-28 (4)

### BL-032 — `getFotosPlan` tarda unos 4 s en traer la lista de fotos de una tarea
- Estado: En curso: la opción (a) y la lectura única de Script Properties están en producción con 1.2.2 (servidor Web App @31, front en Pages con c63f2a1); falta medirlo con Franco (computadora y teléfono)
- Prioridad: Media
- Origen: medición de REQ-PERF-004 en producción (2026-09-28 11:20, hora Argentina, en el Chrome de Franco): con la tarea de 16 fotos, `getFotosPlan` tardó 3,6 s y 4,0 s, y devuelve apenas 2 KB. Con las miniaturas en caché, esos 4 s son todo lo que tarda en aparecer la grilla de "Ya subidas".
- Nota: sin investigar. Candidatos: el costo fijo de cada invocación de Apps Script más `validarSesion` y `usuarioHabilitado`, y las hojas que lee el handler (`Archivos` completa, `Planes`). Habría que medirlo en el servidor (`console.time` en test) antes de tocar nada. Se cruza con BL-001 (endpoint único de carga) y con REQ-SYNC-001.
  *(2026-09-28, medido en el proyecto de test (`medirBL032` y `medirBL032_arranque` en `Tests.gs`, planilla scratch con 400 filas en Archivos, 80 en Planes, 150 en Sesiones y una tarea de 16 fotos):*
  *- **Piso de la plataforma: 1,5 a 4,5 s (mediana ~2,2 s).** Son 8 POST al Web App de test sin sesión: responden 401 sin leer ninguna hoja. De eso, ~1,2 a 4,2 s es la ejecución y ~0,25 s el redirect a `googleusercontent` que trae la respuesta. No depende de nuestro código.*
  *- **Trabajo del servidor: 0,4 a 1,2 s por `doPost` completo.** Por etapa: `usuarioHabilitado` sin caché 780 ms (la caché de `Usuarios` dura 30 s, así que después de medio minuto sin uso se vuelve a pagar); `validarSesion` por la hoja 300 ms (con la caché de 90 s, 36 ms); leer `Planes` para el 404 ~235 ms; leer `Archivos` ~215 ms.*
  *- **Arranque del script: ~150 ms por pedido.** Son las 4 `getProperty` de arriba de `Code.gs`; con una sola `getProperties()` bajaría a ~45 ms.*
  *Conclusión: los ~4 s son sobre todo el piso de Apps Script, más ~1 s de hojas. Achicar el handler gana como mucho 1 s. Lo que de verdad cambia la sensación es no hacer el viaje al abrir la tarea. Opciones, de menor a mayor alcance: (a) guardar en el front la lista de cada tarea y mostrarla al instante mientras se relee de fondo (solo front, las aperturas siguientes se ven al toque); (b) pedir `getFotosPlan` apenas se ven las tarjetas, o al pasar el mouse o tocar; (c) que `getPlanes` traiga los `archivoId` de cada tarea (ya cuenta las fotos) y abrir el modal sin pedir nada (cambia el contrato: Bob y Julia). Ajustes chicos que suman en todos los endpoints: `getProperties()` una vez (−100 ms) y revisar con Julia si el veredicto de `usuarioHabilitado` puede entrar en la caché de sesión de 90 s (−780 ms en frío, pero alarga la demora de BL-015 de 30 a 90 s). Falta que Franco elija.)*
  *(2026-09-28, opción (a) implementada: `fotosPlanCache` en memoria y en `localStorage` (`cp_fotos_plan`), con un tope de 60 tareas y solo ids y fechas. Se borra en `borrarImageCache` (logout, BL-016) y se actualiza al cambiar la fecha de una foto. Al abrir una tarea ya vista se muestra la lista guardada y se relee de fondo: si llega igual no se repinta, si cambió se actualiza, y si falla queda la guardada. Verificado en localhost con `fetch` simulado (`getFotosPlan` de 2 s), 6 casos: primera apertura con "Cargando", segunda al instante, sin repintar cuando no cambió, foto nueva del otro que aparece sola, relectura fallida con la lista guardada, tarea sin caché y falla (error como antes), y logout que borra la caché. También la carga desde `localStorage` con entradas adulteradas o JSON roto. Consola limpia. Falta medirlo en el teléfono de Franco.)*
  *(2026-09-28, lectura única de Script Properties: arriba de `Code.gs`, una `getProperties()` en vez de cuatro `getProperty`. En test las cuatro constantes dan igual que antes y el arranque baja de ~100 ms a ~20 ms. Regresión en test: `probarBUGLOGIN001B` 38/38, `probarBL015` 12/12 y `probarMEDIA004` APTO. `APP_VERSION` de `Code.gs` pasa a 1.2.2: ahora sí cambia el servidor.)*
  *(2026-09-28, pendientes: (1) el piso se midió contra el Web App de **test**; el de prod no se midió aparte, aunque es la misma plataforma. (2) Detalle menor aceptado: si se cierra la tarea antes de que llegue la relectura, esa respuesta se descarta y no actualiza la caché; la próxima apertura muestra la lista anterior y se corrige sola. (3) Medir en el teléfono de Franco cuando 1.2.2 esté en prod.)*

## Sesión 2026-09-28 (5)

### BL-033 — Una tarea completada puede verse pendiente si falla la relectura
- Estado: Hecho — en producción con 1.2.4 (2026-09-28, commit 44ce889; Pages ya la sirve)
- Prioridad: Baja
- Origen: verificación de BL-031 (2026-09-28)
- Nota: `completarPlan` no marca la tarea como completada en el estado local cuando `completePlan` responde 200: espera a que `getPlanes` la traiga. Si esa relectura falla (500 dos veces o sin red), la tarjeta sigue pendiente aunque en el servidor ya esté cerrada, hasta la próxima carga. Opción: poner `plan.estado = 'completado'` apenas llega el 200. Ojo: un `getPlanes` que salió antes del cierre y todavía no llegó no queda descartado por BL-031 (es más nuevo que el último aplicado), así que ese pedido pisaría el cambio local. Para que no pase, los pedidos que salieron antes del cierre tienen que quedar invalidados (por ejemplo, subiendo `planesAplicado` hasta `planesPedido` cuando llega el 200). Lo mismo para `reabrirPlan`.
  *(2026-09-28, implementado en 1.2.4: `descartarLecturasDePlanesEnVuelo()` sube `planesAplicado` hasta `planesPedido` cuando `completePlan`, `reopenPlan` o `setAcuerdoCierre` responden 200 y el cambio ya se aplicó en el estado local. `completarPlan` ahora marca la tarea como completada apenas llega el 200 (con fecha y quién, como el servidor) y relee después. `toggleAcuerdo` busca de nuevo el plan en `state.planes` al aplicar o revertir, porque si en el medio se releyó la lista, el objeto que guardó al empezar ya no es el que está en pantalla. Hallazgo: 1.2.3 (reabrir sin releer) había abierto la misma ventana para reabrir, y el acuerdo ya la tenía. Verificado en 127.0.0.1 con `fetch` simulado: completar con una relectura vieja en vuelo y la relectura posterior fallando, reabrir y acuerdo con una relectura vieja en vuelo. Con el arreglo, los tres quedan bien; sin el arreglo (la función anulada), los tres muestran el estado de antes aunque el servidor ya cambió. Consola limpia. Costo aceptado: una relectura en vuelo que traía un cambio del otro también se descarta; lo trae la próxima.)*

## Sesión 2026-09-28 (6)

### BL-034 — Contraste: fondos y letras que a veces cuestan leer
- Estado: En curso — pasa a REQ-UX-002 (rediseño premium, 2026-09-28): Franco pidió no perder el efecto premium y rediseñar en vez de solo subir el contraste
- Prioridad: Media (pedido explícito de Franco)
- Origen: Franco (2026-09-28, después de probar 1.2.4): "los colores de fondo, letra etc etc, son difíciles de ver a veces, si podemos mejorarlo de alguna forma". Aclaró enseguida: "letras, contornos, todo en general", o sea que no es una pantalla puntual sino la paleta entera. Franco usa más la PC y Noelia el celular.
- Nota: sin investigar. Primer paso: medir el contraste (WCAG AA: 4,5:1 texto normal, 3:1 texto grande y bordes de controles) de cada par texto/fondo de los tokens de `:root` en `index.html` (`--text-soft`, `--text-muted`, `--copper-dim` sobre `--bg` y el fondo de las tarjetas), más casos que bajan contraste a propósito: `.plan-card.completado` (opacidad 0,55), botones `:disabled` (0,45) y las etiquetas en mayúsculas a 0,65-0,7 rem. Como es general, revisar la paleta completa (textos, bordes de 0,5px, íconos, placeholders) y no pantalla por pantalla; preguntarle si lo nota más en el teléfono o en la computadora, y mostrarle un mockup antes/después, respetando `docs/DESIGN.md` y `hjay-identidad-visual`. Se cruza con BL-012 (revisión de `docs/DESIGN.md`).
  *(2026-09-28, medición WCAG contra el fondo de tarjeta `#161310` (y `--bg`): `--text-main` 14,2; `--text-soft` 6,2; `--text-muted` 3,0 (30 usos, no pasa 4,5); `--text-faint` 2,1; `--red-venc` 4,0; `--copper` 5,1; `--green-ok` 6,8; `--border` 1,2 y `--border-soft` 1,3 (lejos de 3:1); `--copper-dim` como borde 2,0; texto secundario en `.plan-card.completado` (opacidad 0,55) 2,7 y `--text-muted` ahí 1,7. Además, 37 bordes son de `0.5px`: en una pantalla de densidad 1 (la PC de Franco) se dibujan como 1 px más tenue y casi desaparecen; en el celular de Noelia (2x o 3x) se ven como una línea fina. Candidatos que mantienen el tono: `--text-muted` `#877C72` (4,5), `--text-faint` `#6B6056` (3,0), `--red-venc` `#B26969` (4,5), `--border` `#47413A` (1,8) o `#575048` (2,3) o `#686157` (3,0), `--copper-dim` con alfa 0,7 (3,1), completada con opacidad 0,8 (texto secundario 4,4).)*

## Sesión 2026-09-28 (7)

### BL-035 — Overlays de modal con `backdrop-filter` aun cerrados
- Estado: Propuesto (hipótesis, sin medir)
- Prioridad: Baja
- Origen: Duck, verificación de la fase 5 de REQ-UX-002 (2026-09-28). Los seis `.modal-overlay` llevan `backdrop-filter: blur(4px)` siempre, también con `opacity: 0` (cerrados). Viene de antes del rediseño: no es algo nuevo de 1.3.0 (criterio 4 de REQ-UX-002).
- Nota: hipótesis: capas a pantalla completa con desenfoque, aunque invisibles, pueden costarle al celular al hacer scroll. Primero medir (Performance de Chrome con emulación de CPU 4x, scroll de la lista con y sin la regla). Si cuesta, pasar el `backdrop-filter` a `.modal-overlay.visible` y mirar que al cerrar no "salte" el desenfoque.
