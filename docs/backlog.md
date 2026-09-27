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
  permanente en Tests.gs.

### BL-003 — REQ-ADMIN-001: rol admin + panel
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-DATA-001 (2026-09-08), repetido sin arrancar en varias sesiones
- Nota: rol admin + hoja Config + endpoint setDriveRootFolder + panel de
  administración. Nunca se empezó a implementar.

### BL-004 — Reemplazar los glifos de UI restantes por SVG
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-AUTH-001 (2026-09-05), mayormente resuelto en sesiones
  posteriores
- Nota: quedan 2 glifos sueltos violando la regla de identidad-visual (nada
  de glifos como iconos de UI): el "✦" del empty state y el "✕" del overlay
  de foto con error en la grilla de subida. El corazón "♡" del `<title>` es
  identidad de marca y no aplica acá.

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
- Estado: Propuesto
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
- Estado: Propuesto
- Prioridad: Media
- Origen: reemplazo de skills por las de sis-web (DEC-001). Jay y `hjay-identidad-visual` usan el `DESIGN.md` del proyecto "si tiene uno"; en sis-web salió de extraer del código colores, tipografía y componentes.
- Nota: extraer de `index.html` el sistema de diseño real (tokens de color, radios, tipografía, botones, modales, excepciones) para que los cambios visuales tengan una referencia escrita. Lo mantiene Jay.

### BL-013 — Documento de seguimiento de seguridad
- Estado: Propuesto
- Prioridad: Baja
- Origen: reemplazo de skills por las de sis-web (DEC-001). La persona de Julia lee y actualiza "el documento de seguimiento de seguridad del proyecto" si existe (en sis-web, `docs/seguridad/revision-insis.md`).
- Nota: juntar en un solo archivo las superficies ya revisadas (REQ-SEC-001/002, REQ-DATA-002, BUG-LOGIN-001), los hallazgos abiertos (BL-005, BL-006) y el criterio acordado. Hoy está repartido entre los REQ.

### BL-014 — Validar las skills traídas de sis-web con escenarios de Peroncitos
- Estado: Propuesto
- Prioridad: Media
- Origen: reemplazo de skills por las de sis-web (DEC-001). La metodología pide probar cada skill con un subagente limpio ("Claude B") y al menos 3 escenarios; las copias no se probaron sobre este proyecto.
- Nota: sobre todo `hjulia-revision-cambio` (piensa en reglas de base de datos; acá la capa que decide es `Code.gs`) y `hjay-verificacion-visual` (con el preview local que pega a prod). Registrar el resultado en `docs/skills/INVENTARIO.md`.
