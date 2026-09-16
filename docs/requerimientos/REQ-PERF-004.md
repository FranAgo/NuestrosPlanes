# REQ-PERF-004 — Performance: miniatura real de fotos, generada al subir

> **Estado:** PROPUESTO por Paul. Sin implementar. Hay dos enfoques diagnosticados (ver abajo) — falta que Franco elija cuál seguir (o confirme el preferido) antes de diseñar en detalle. Prioridad a definir con Franco.
> **Dueño técnico:** por definir (Bob + Jay, con esquema de datos a cargo de Gary) · **QA:** Duck · **PM:** Paul
> **Depende de:** [REQ-PERF-003](REQ-PERF-003.md) (diagnóstico de por qué el enfoque de miniaturas de Drive no sirve).

## Objetivo

Franco pidió que las fotos de la card de "fotos recientes" del dashboard
carguen más rápido. REQ-PERF-003 resolvió que la card no aparezca de golpe,
pero no la velocidad de carga en sí: la card sigue bajando el binario
completo de cada foto desde Drive (varios cientos de KB en base64) para
mostrarla en un círculo de 38px.

El enfoque intentado en REQ-PERF-003 (`DriveApp.getThumbnail()`) no funciona
para imágenes subidas vía Apps Script — devuelve `null` de forma consistente
para fotos de tareas, confirmado contra el proyecto de test con una imagen
realista (no es un problema de timing ni de permisos). Ver el diagnóstico
completo en REQ-PERF-003, sección "Alcance — fuera de este REQ".

## Enfoque propuesto (a validar con el equipo antes de implementar)

**Actualización 2026-09-16 — diagnóstico de `thumbnailLink` (ver también
[BACKLOG.md, BL-011](../../skills/hpaul-backlog/BACKLOG.md)):** se probó,
contra el proyecto de test, el campo `thumbnailLink` de la API de Drive v3
(Servicio Avanzado) — a diferencia de `DriveApp.getThumbnail()` (descartado
en REQ-PERF-003, no sirve para fotos subidas), `thumbnailLink` **sí
funciona**: disponible de inmediato tras subir (`hasThumbnail:true` sin
esperar), y liviano — 594 bytes a 220px vs. 111.584 bytes del original
(~188x más chico). Probado también a 400px (1.103B), 800px (2.653B) y
1600px (= original, sin upscale). Corrido dos veces, mismo resultado.
Aplica solo a la card del dashboard (necesita el proxy de Apps Script para
no exponer la URL de Google al cliente, mismo criterio de privacidad de
REQ-MEDIA-001) — no al carrusel a pantalla completa, que necesita
resolución completa. Este enfoque es mucho menos invasivo que el de abajo:
no toca el flujo de subida ni agrega columnas a `Archivos`, solo cambia
cómo `getRecentPlanPhotos` sirve la miniatura. Falta: Bob lo implementa con
fallback al blob completo si Drive no devuelve `thumbnailLink` (fotos
viejas o error), y Julia confirma el criterio de privacidad del proxy.
**Candidato preferido sobre el enfoque original de abajo, a confirmar con
Franco antes de implementar.**

### Enfoque original (client-side, más invasivo — supersedido si el de arriba se aprueba)

Generar la miniatura del lado del cliente, en el mismo momento en que ya se
comprime la foto para subirla (`comprimirImagenPlan()`,
[index.html:2867](../../index.html:2867) redimensiona a máx. 1800px vía
canvas antes de mandarla al backend). Se le sumaría ahí mismo una segunda
pasada con un tamaño mucho menor (ej. 100-150px de lado, JPEG de baja
calidad — apuntando a pocos KB) y esa miniatura se guardaría como texto
(base64) en una columna nueva de la hoja `Archivos`, para que
`getRecentPlanPhotos` (o `getArchivos`) la devuelva directo de la hoja **sin
tocar Drive en absoluto** para el caso común del dashboard.

Esto es más invasivo que REQ-PERF-003: toca el flujo de subida completo
(cliente → Bob → hoja), no solo la lectura.

## Por qué no se implementó ya

Necesita, antes de tocar código:

1. **Gary** defina la columna nueva de `Archivos`: nombre, si guarda solo el
   base64 o también dimensiones/mimeType de la miniatura, y qué pasa con las
   fotos ya subidas antes de este REQ que no van a tener esa columna
   poblada (fallback esperable: comportarse como hoy, blob completo desde
   Drive, para esas filas viejas — sin necesidad de backfill retroactivo,
   mismo criterio de "no hace falta migrar lo viejo" que ya usó
   REQ-PERF-002 para el cache de `localStorage`).
2. Confirmar el límite de tamaño de celda de Google Sheets (50.000
   caracteres) deja margen cómodo para una miniatura de 100-150px en JPEG de
   baja calidad — a validar con una prueba real antes de comprometerse al
   enfoque, mismo criterio de "no asumir, medir" que dejó en evidencia
   REQ-PERF-003.
3. Decidir si esto amerita, además, revisar el flujo de `uploadPlanPhotos`
   para que una foto grande + su miniatura viajen en la misma subida sin
   duplicar el costo de comprimir dos veces del lado del cliente.

## Alcance — a definir cuando se retome

No tiene todavía Objetivo detallado, criterios de aceptación ni riesgos —
eso se escribe recién cuando Paul lo formalice para implementación, con
Gary ya habiendo definido el esquema.
