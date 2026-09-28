# REQ-UX-001 — Todo error explica qué pasó y qué hacer

> **Estado:** PROPUESTO (2026-09-27). Sin implementar.
> **Nivel:** cambio de fondo (toca varias pantallas y los mensajes del servidor), pero sin cambio de contrato: se suman `code` a respuestas que no lo tienen.
> **Dueño técnico:** Jay (front) + Bob (mensajes del servidor) · **AppSec:** Julia (que ningún mensaje filtre datos internos) · **QA:** Duck · **PM:** Paul
> **Datos sensibles:** ningún mensaje puede mostrar tokens, emails, IDs de planilla o de Drive, ni trazas.

## Problema

Franco pidió que cada error tenga su explicación clara. Hoy hay caminos que
fallan sin decir nada o con un genérico:

- `completarPlan` (`index.html`): si la respuesta no es 200 ni
  `FOTO_REQUERIDA`, no pasa nada visible.
- `eliminarPlan`: si falla, no pasa nada visible.
- Varios `catch` muestran solo "Error de conexión." o "Error al guardar.".
- El servidor responde "Error interno del servidor." con un código
  `[E-XXXXXX]`, pero el usuario no sabe si reintentar o avisar.

## Qué se pide

Cada error que ve el usuario tiene tres partes: **qué pasó**, en palabras
simples; **qué puede hacer** (reintentar, elegir otra foto, pedirle algo al
otro, esperar); y, si es un error interno, el código `E-XXXXXX` chiquito para
encontrarlo en los logs.

## Alcance

**Entra:**
- Relevar todos los caminos de error del front (cada `api(...)` y cada
  `catch`) y del servidor (cada `respond(4xx/5xx)`), y dejar un catálogo en
  este REQ: código, cuándo pasa, texto para el usuario y acción sugerida.
- Ningún camino queda en silencio.
- Ejemplos de textos esperados:
  - Sin conexión: "No hay conexión. Revisá el wifi o los datos y volvé a
    intentar."
  - Formato de foto no compatible: "Esta foto está en un formato que no
    podemos guardar (por ejemplo HEIC). Probá con JPG o PNG."
  - Falta el acuerdo (REQ-PLAN-001): "Todavía falta que Noelia esté de acuerdo
    con cerrar la tarea."
  - Sin fotos: "Para cerrar la tarea tiene que haber al menos una foto."
  - Error interno: "Algo falló de nuestro lado. Probá de nuevo en un rato. Si
    sigue, pasale este código a Franco: E-3F9A21."
- Los REQ nuevos (BUG-FECHA-001, REQ-SYNC-001, REQ-MEDIA-004, REQ-PLAN-001)
  cumplen esto desde el arranque.

**No entra:**
- Rediseñar el sistema de avisos (modal, toast). Se usa lo que ya existe
  según `docs/DESIGN.md`.

## Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | El catálogo de errores está escrito en este REQ y cubre cada `respond` de error de `Code.gs` y cada `catch` y rama no-200 de `index.html`. |
| 2 | Forzar cada error del catálogo (con `fetch` simulado) muestra su texto. Ninguno queda sin mensaje. |
| 3 | Fallar al completar o al eliminar una tarea muestra un mensaje (hoy no muestra nada). |
| 4 | Ningún mensaje muestra IDs internos, emails, tokens ni trazas. Solo el código `E-XXXXXX` en los errores internos. |
| 5 | Los mensajes se leen a 375 px y los anuncia un lector de pantalla (`role="alert"` o equivalente). |

## Cómo lo resuelven otros (2026-09-27)

Ver `docs/investigacion/2026-09-27-como-lo-resuelven-otros.md` (Nielsen Norman Group, heurística 9). Suma al alcance: el mensaje aparece junto al campo, la foto o el botón que falló, no en un aviso lejos de ahí, y nunca culpa al usuario.
