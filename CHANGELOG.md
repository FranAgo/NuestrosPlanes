# Cambios de Nuestros Planes

Qué cambió para Franco y Noelia en cada versión. El detalle técnico está en
`bitacora/` y en cada `docs/requerimientos/REQ-XXX.md`. Formato: [Keep a
Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según DEC-009
(la versión se ve en "Mi perfil").

## [1.10.0] - 2026-10-07

### Cambiado
- Toda foto se sube con fecha. Si alguna de las elegidas no la trae
  (capturas de pantalla, fotos reenviadas por WhatsApp), al tocar "Subir"
  queda marcada en rojo y no sube ninguna hasta ponérsela. Con "Ponerles
  la fecha de la tarea" se completan todas las que faltan de una vez. Las
  que traen la fecha de la cámara no piden nada. Antes quedaban con el día
  en que se subían. (REQ-MEDIA-009)
- En Drive las fotos quedan numeradas en el mismo orden en que se ven en la
  app: por día y hora. (REQ-MEDIA-009)

### Corregido
- "Por subir" muestra las fotos en el orden en que se eligieron. Antes
  podía quedar primero la que terminaba antes de prepararse (una más
  liviana). (BL-046)
- Si se cerraba una tarea mientras una foto elegida se estaba preparando,
  esa foto podía aparecer en "Por subir" de la próxima tarea que se abría.
  (BL-046)

## [1.9.0] - 2026-10-06

### Cambiado
- Subir varias fotos a una tarea es más rápido: van de a 3 a la vez en vez
  de una por una (16 fotos tardaban casi 2 minutos; ahora menos de la
  mitad). Cada foto sigue mostrando su estado y, si una falla, se reintenta
  a mano, como antes. (REQ-MEDIA-008)
- Las fotos de una tarea se ordenan por el día y la hora en que se sacaron,
  como en una galería. Las que no traen la hora (capturas, fotos reenviadas)
  van al final de su día. Las fotos ya subidas quedan en el orden de antes.

### Corregido
- Mientras uno subía muchas fotos, lo que hacía el otro al mismo tiempo
  (incluso iniciar sesión) podía fallar con "Error interno del servidor".
  (REQ-MEDIA-008)

## [1.8.1] - 2026-10-05

### Corregido
- Al borrar un plan, sus fotos también quedan archivadas (siguen en Drive,
  no se pierden). Antes quedaban como activas y el servidor las podía
  seguir entregando aunque la app no las mostrara. Lo mismo para los planes
  que ya se habían borrado. (BL-017)

### Seguridad
- Si alguien que no está autorizado intenta entrar, el registro de
  accesos ya no guarda nada de su email: solo un código que permite ver si
  es la misma persona que reintenta. (BL-005)
- Una prueba automática revisa que todo lo que atiende el servidor pida la
  sesión, también lo que se agregue más adelante. (BL-002)

## [1.8.0] - 2026-10-05

### Agregado
- "Algún día": ideas de planes que todavía no tienen día. Si guardás un
  plan sin "Empieza", queda como idea en el filtro "Algún día" (con la
  cantidad al lado), agrupada por categoría y de la más vieja a la más
  nueva. Cada idea dice hace cuánto se anotó y quién; si pasaron más de 3
  meses, en ámbar. Con "Ponerle fecha" elegís el día y pasa sola a Planes.
  (REQ-PLAN-003)

### Cambiado
- "Todos" muestra solo los planes con fecha: las ideas están en "Algún
  día". Una idea no se puede completar ni dar el acuerdo de cierre hasta
  que tenga fecha, y a un plan que ya tiene fecha no se le puede quitar.
  (REQ-PLAN-003)

### Corregido
- Una fecha de inicio imposible (por ejemplo, mes 13) ya no se guarda como
  1/1/1970: el servidor la rechaza.

## [1.7.0] - 2026-10-05

### Agregado
- Desde el formulario de un plan se puede crear una categoría nueva: al
  final del desplegable está "+ Nueva categoría". Al crearla volvés al plan
  con la categoría ya elegida y sin perder lo que escribiste; con la flecha
  o con Cancelar volvés sin crear nada. (REQ-PLAN-002)

### Cambiado
- Todo plan necesita una categoría. Si tocás Guardar sin elegirla, el campo
  se marca y avisa "Elegí una categoría para guardar". Los planes viejos
  sin categoría te la van a pedir la próxima vez que los edites.
  (REQ-PLAN-002)

## [1.6.2] - 2026-10-05

### Cambiado
- Cerrar sesión ahora pregunta antes ("¿Cerrar sesión?") y, mientras se
  cierra, la app queda difuminada con el aviso "Cerrando sesión…". El
  botón del encabezado pasó de una X a una puerta con flecha, para que no
  se confunda con "cerrar ventana". En el celular es más fácil de tocar.

## [1.6.1] - 2026-10-05

### Cambiado
- En la computadora, Mi perfil usa todo el ancho: tu foto, tu nombre y la
  versión a la izquierda, y "Fotos y datos" a la derecha. En el celular
  sigue todo en una columna. (REQ-MEDIA-007)

## [1.6.0] - 2026-10-05

### Cambiado
- En el visor, al pasar de foto aparece al instante una versión
  desenfocada mientras llega la foto completa, y las fotos siguientes se
  traen de antemano: si te quedás un momento en una foto, la próxima ya
  está lista. (REQ-MEDIA-007)
- Mi perfil está ordenado por secciones: tu foto y tu nombre, "Fotos y
  datos" y "Acerca de" (con la versión).

### Agregado
- En Mi perfil, "Fotos y datos" elige cuánto precarga el visor en cada
  dispositivo: Automático, Precargar siempre o Solo lo necesario. En
  Automático, con datos móviles o en el celular trae solo lo necesario, y
  con wifi o en la computadora precarga. En el iPhone el navegador no
  avisa si hay wifi: si estás con wifi y querés que precargue, elegí
  "Precargar siempre".

## [1.5.1] - 2026-10-05

### Cambiado
- En el teléfono, los botones de la tarjeta ("Estoy de acuerdo",
  "Completar", "Reabrir") se aciertan más fácil con el dedo: el área que
  responde al toque es más alta, aunque se ven igual. (BL-026)
- Los colores de una categoría se pueden elegir con el teclado y el lector
  de pantalla dice el nombre de cada uno. En el teléfono, cada círculo
  responde en un área más grande. (BL-022)

### Arreglado
- Al tocar otro color en "Nueva categoría" o "Editar categoría", el
  anillo de seleccionado no se movía (el color sí se guardaba bien).

## [1.5.0] - 2026-10-02

### Cambiado
- Tocar una foto la abre a pantalla completa, con fondo negro y de borde a
  borde. Abajo hay una tira con todas las fotos para saltar a cualquiera.
  Se pasa de foto deslizando de costado, se cierra deslizando hacia abajo,
  y un toque esconde todo para ver solo la foto. En la computadora siguen
  las flechas y también andan las teclas ← y →. (REQ-MEDIA-006)

### Agregado
- La fecha de una foto ahora también se puede corregir desde los
  recuerdos: botón (i) o deslizar hacia arriba, y "Cambiar fecha".

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
