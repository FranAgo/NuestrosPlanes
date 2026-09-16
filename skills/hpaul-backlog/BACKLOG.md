---
name: hpaul-backlog
---


# Backlog — ideas sin formalizar

Etapa previa a un REQ. Ver skill backlog-triage para cuándo agregar,
actualizar o promover un ítem.

Formato por ítem:

## [ID] — [Título breve]
- Estado: Propuesto / Priorizado / En curso / Formalizado como REQ-XXX / Descartado
- Prioridad: Alta / Media / Baja / Sin definir
- Origen: sesión o contexto donde surgió (fecha)
- Nota: descripción breve — esto NO es un REQ, no necesita Objetivo/Alcance/Criterios todavía

---

Ítems consolidados el 2026-09-16 desde la bitácora de sesiones anteriores
(vivían dispersos en prosa, nunca se habían volcado acá). Cada uno se
verificó contra el código actual antes de agregarlo — varios ítems viejos
de la bitácora ya estaban resueltos y no se incluyen (nav-tab/filter-chip
ya son `<button>`, `confirm()` nativo ya se reemplazó por modal propio,
`errorEl.textContent` en `forceLogout()` ya se limpia, IDs de categoría/plan
ya usan `newId()`, trigger de `purgarSesiones()` ya verificado en prod,
carpeta de Drive ya compartida con Noelia, hallazgo de `revocarSesion()` en
ventana fría ya corregido, tests ya viven versionados en `Tests.gs`).

## BL-001 — Endpoint único de carga inicial
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-PERF-001 (2026-09-15), reconfirmado fuera de alcance en REQ-PERF-002
- Nota: juntar categorías + planes + usuarios + avatares + fotos recientes
  en una sola invocación de Apps Script, en vez de las ~3 etapas actuales.
  Descartado dos veces por no ser el cuello de botella dominante en ese
  momento — si el primer ingreso en un dispositivo nuevo (sin cache) vuelve
  a sentirse lento, retomar acá. Requiere diseño de Bob + revisión de costo
  del lado del servidor de Gary.

## BL-002 — Test automatizado permanente para getArchivos (batch)
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-PERF-001 (2026-09-15)
- Nota: hoy solo tiene el smoke que corrió Duck una vez; no quedó como test
  permanente en Tests.gs.

## BL-003 — REQ-ADMIN-001: rol admin + panel
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-DATA-001 (2026-09-08), repetido sin arrancar en varias sesiones
- Nota: rol admin + hoja Config + endpoint setDriveRootFolder + panel de
  administración. Nunca se empezó a implementar.

## BL-004 — Reemplazar los glifos de UI restantes por SVG
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-AUTH-001 (2026-09-05), mayormente resuelto en sesiones
  posteriores
- Nota: quedan 2 glifos sueltos violando la regla de identidad-visual (nada
  de glifos como iconos de UI): el "✦" del empty state y el "✕" del overlay
  de foto con error en la grilla de subida. El corazón "♡" del `<title>` es
  identidad de marca y no aplica acá.

## BL-005 — Enmascarar también el dominio en enmascararEmail()
- Estado: Propuesto
- Prioridad: Baja
- Origen: revisión de Julia en REQ-DATA-002 (2026-09-10)
- Nota: hoy `enmascararEmail` solo oculta el usuario (`f***@dominio.com`);
  el dominio completo queda expuesto en el log de Auditoria para
  `login_denegado`.

## BL-006 — Purga/retención del log de Auditoría
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-DATA-002 (2026-09-10), marcado como fuera de alcance
- Nota: la hoja Auditoria crece sin límite. Falta definir política de
  retención/purga — candidato a REQ futuro bajo Ley 25.326.

## BL-007 — REQ-MEDIA-003 candidato: navegación por época / "recuerdos"
- Estado: Propuesto
- Prioridad: Sin definir (pedido explícito de Franco, sin fecha)
- Origen: REQ-MEDIA-002 (2026-09-14), anotado explícitamente por Franco
- Nota: no mostrar solo lo más reciente en el carrusel, sino también fotos
  de otros momentos — tipo "En este día" de Google Fotos o "Recuerdos" de
  iOS Photos. Funcionalidad de descubrimiento con lógica propia (qué
  mostrar, con qué cadencia). Se retoma cuando REQ-MEDIA-001/002 estén
  asentados en producción (ya lo están).

## BL-008 — Límite de cantidad/tamaño de fotos por tarea
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: hoy no hay tope de cuántas fotos (ni cuánto peso total) se pueden
  subir a una misma tarea.

## BL-009 — Editar o borrar una foto individual ya subida
- Estado: Propuesto
- Prioridad: Sin definir
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: el modelo de datos ya soporta `estado='eliminado'` en Archivos,
  pero no hay UI para borrar (ni editar) una foto puntual una vez subida.

## BL-010 — Reordenar fotos dentro de una tarea
- Estado: Propuesto
- Prioridad: Baja
- Origen: REQ-MEDIA-002 (2026-09-14)
- Nota: las fotos se muestran en el orden en que se subieron, sin forma de
  reordenarlas.

## BL-011 — REQ-PERF-004: miniatura de Drive para la card de "fotos recientes"
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
