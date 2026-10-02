# Cambios de Nuestros Planes

Qué cambió para Franco y Noelia en cada versión. El detalle técnico está en
`bitacora/` y en cada `docs/requerimientos/REQ-XXX.md`. Formato: [Keep a
Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según DEC-009
(la versión se ve en "Mi perfil").

## [1.4.0] - 2026-10-02

### Cambiado
- Tocando una tarea se abre con sus fotos arriba de todo, para verlas o
  agregar más sin pasar por "Editar". La tarjeta quedó más limpia: editar
  y eliminar están en el menú "⋯" de adentro. (REQ-UX-003)

### Agregado
- Las tareas completadas también se abren: se ven sus fotos y se pueden
  sumar las que faltaban, sin reabrirlas.

## [1.3.2] - 2026-10-02

### Cambiado
- La lista abre en "Planes": solo lo que falta hacer, con lo vencido arriba
  de todo (sigue en rojo y con la etiqueta "Vencido") y después lo más
  próximo primero. "Completados" muestra lo último que hicieron primero, y
  "Todos" quedó al final. Ya no están los filtros "Pendientes" ni "Vencidos".

## [1.3.1] - 2026-09-28

### Corregido
- En el iPhone, los campos de fecha de "Editar plan" ya no se enciman
  ("Empieza" quedaba debajo de "Termina") ni se salen del recuadro, y la
  fecha se lee alineada a la izquierda como el resto.

## [1.3.0] - 2026-09-28

### Cambiado
- La app se ve más cuidada y se lee mejor: los textos apagados, los bordes
  y los contornos tienen más contraste (también en la PC, donde las líneas
  finas casi no se veían), con el mismo tono oscuro y cobre de siempre.
  (REQ-UX-002)
- Las tareas completadas ya no se ven transparentes: van sobre un fondo
  verde muy oscuro, con una línea verde arriba y un sello con tilde.
- El botón principal, el de Google y "De acuerdo" son de cobre metálico, y
  el corazón del logo también.
- Confirmar "Eliminar" o "Descartar y cerrar" se ve en rojo, para que se
  note que borra algo.
- Las animaciones son más cortas y suaves, y los modales se cierran más
  rápido. Si el teléfono o la PC tienen activado "reducir movimiento", se
  apagan.

## [1.2.4] - 2026-09-28

### Corregido
- Una tarea que acabás de completar, reabrir o marcar "de acuerdo" ya no
  puede volver a verse como estaba antes si la app estaba releyendo la
  lista en ese momento, o si la relectura falla por la conexión. (BL-033)

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
