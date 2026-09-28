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
- Estado: Propuesto (diagnóstico técnico ya hecho, ver REQ-PERF-004.md)
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
- Estado: En curso (escrito el 2026-09-27 y commiteado en a4baa76; falta la revisión de Franco)
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
- Estado: Propuesto (se investiga al cerrar REQ-MEDIA-003, pedido de Franco)
- Prioridad: Media
- Origen: Franco (2026-09-28), después del fix de miniaturas de a 3 con reintento (2a1a038): "mejoró, al abrir una imagen carga la vista previa, pero sigue habiendo varias que no cargan".
- Nota: pasa en "Ya subidas" (modal de la tarea) **sin abrir el visor**, así que la hipótesis de que el visor cancela los pedidos (`abortFetchesExcepto`) no alcanza a explicarlo. Datos: `getArchivo` devuelve la foto entera en base64 (no hay miniatura, ver BL-011/REQ-PERF-004); cada miniatura se reintenta una sola vez a los 800 ms y después queda fija hasta reabrir la tarea; `api()` no tiene timeout propio. `clasp logs` de la sesión no mostró errores de lectura en la Web App (no concluyente: parecían corridas de test). Primer paso: reproducir en el navegador contra prod en modo solo lectura y mirar qué responde cada `getArchivo` que falla (status, error, tiempo).
