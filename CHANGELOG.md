# Cambios de Nuestros Planes

Qué cambió para Franco y Noelia en cada versión. El detalle técnico está en
`bitacora/` y en cada `docs/requerimientos/REQ-XXX.md`. Formato: [Keep a
Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según DEC-009
(la versión se ve en "Mi perfil").

## [1.2.3] - 2026-09-28

### Corregido
- Al tocar "Estoy de acuerdo" el botón muestra "Guardando…" hasta que se
  guarda, en vez de quedar apagado sin explicación. Los toques de más
  mientras guarda no hacen nada.
- Al reabrir una tarea, la tarjeta se pinta y dice "Reabriendo…" mientras
  espera, y tarda la mitad (antes, unos 6 segundos sin aviso).

## [1.2.2] - 2026-09-28

### Cambiado
- Al abrir una tarea que ya abriste antes, "Ya subidas" aparece al instante
  con lo último que viste y se actualiza sola si el otro subió algo. La
  primera vez sigue tardando unos segundos. (BL-032)

### Corregido
- Al completar varias tareas seguidas, alguna ya no vuelve a verse
  pendiente un momento después de ponerse gris. (BL-031)

## [1.2.1] - 2026-09-28

### Cambiado
- Las vistas previas de las fotos pesan la mitad: alcanzan igual para el
  tamaño en que se muestran. (REQ-PERF-004)

## [1.2.0] - 2026-09-28

### Cambiado
- Las vistas previas de las fotos ("Ya subidas" en cada tarea y la card de
  recuerdos) cargan mucho más rápido: se baja una miniatura de pocos KB en
  vez de la foto entera. Al tocar una foto se sigue viendo completa.
  (REQ-PERF-004, BL-030)

## [1.1.0] - 2026-09-28

### Agregado
- Recuerdos por grupos: la card de arriba muestra "En este día" (fotos de la
  misma fecha en otros años o meses), "Nuevas" (lo subido en la última
  semana) o "De otro momento" (una salida anterior, distinta cada día). En
  "Ver recuerdos" se puede pasar de un grupo a otro. (REQ-MEDIA-003)
- La versión de la app se ve abajo de todo en "Mi perfil".
- El visor de fotos dice en cuál vas ("2 de 5").

### Cambiado
- Los recuerdos se ordenan por el día en que se sacó cada foto, no por el día
  en que se subió.

### Corregido
- Las fotos de una tarea eliminada ya no aparecen en los recuerdos. (BL-017)

## [1.0.0] - 2026-09-28

Punto de partida del versionado: lo que estaba en producción ese día
(servidor en la Web App @27). Incluye tareas con acuerdo de los dos para
cerrarlas, tareas de varios días, fotos con la fecha en que se sacaron y el
carrusel de recuerdos.
