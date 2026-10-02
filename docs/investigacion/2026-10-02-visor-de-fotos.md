# Visor de fotos a pantalla completa: cómo lo resuelven otros (2026-10-02)

Pedido de Franco: antes de implementar BL-027 (visor a pantalla completa),
confirmar que la variante B del mockup (foto de borde a borde con tira de
miniaturas abajo) tiene sentido de diseño, que así lo hacen las apps grandes
y que es cómoda. También cómo se resuelve cambiar la fecha sin que el editor
se encime con la tira (BL-028 entra en el mismo REQ).

## Qué hacen las apps de referencia

- **Fotos de Apple (iPhone).** Al abrir una foto se ve a pantalla completa
  con una tira de miniaturas muy chicas abajo para pasar de foto. Tocar la
  foto esconde la tira y los controles, y otro toque los vuelve a mostrar.
  La tira existe desde iOS 9 y sigue en iOS 18. Para cambiar la fecha:
  botón (i) o deslizar hacia arriba sobre la foto. Aparece un panel de
  información abajo (la foto se corre hacia arriba) con la fecha y un botón
  "Ajustar", que abre un editor con calendario. Deslizar hacia abajo cierra
  el visor.
- **Google Fotos.** Pantalla completa, un toque muestra u oculta los
  controles, deslizar hacia abajo cierra. Para la fecha: deslizar hacia
  arriba o el menú ⋮ abre los detalles, y desde ahí se edita la fecha (con
  un lápiz en Android, o tocando la fecha en iPhone). No hay tira de
  miniaturas en el teléfono.
- **Tiendas (Baymard Institute).** En galerías de producto, los usuarios
  que solo tienen puntitos o deslizar no se dan cuenta de cuántas fotos hay,
  pasan de largo o tocan mal los puntitos. Las miniaturas anticipan qué hay
  en cada foto y son un blanco más grande. Recomiendan miniaturas también en
  el teléfono, aunque ocupen lugar.

## Qué se toma para Nuestros Planes

1. La variante B es el patrón de Fotos de Apple: tira abajo, que se esconde
   con un toque. Que Noelia y Franco usen iPhone lo hace más familiar.
2. El editor de fecha abajo, con la foto corrida hacia arriba, es el mismo
   esquema que Apple y Google: la fecha vive en un panel de detalles, no
   encima de la foto ni de la tira. Mientras se edita, la tira se esconde.
3. Abrir los detalles con un botón (i) y también deslizando hacia arriba,
   como en las dos apps, en vez de esconder "Cambiar fecha" en un menú ⋯.
4. Deslizar hacia abajo para cerrar. La X queda arriba, que en un teléfono
   grande es difícil de alcanzar con el pulgar: el gesto lo compensa.
5. Comodidad: Apple usa miniaturas chiquitas porque se arrastran
   (scrubbing), no se tocan de a una. Las nuestras se tocan, así que van de
   44 px como mínimo (la regla de `hjay-verificacion-visual`). Con una sola
   foto, la tira no aparece.
6. En la computadora: las mismas flechas a los costados que hoy, más las
   teclas ←, → y Esc.

## Fuentes

- Apple Community, "Change Location, Date and Time of Photos Using Photos
  App For iOS": https://discussions.apple.com/docs/DOC-250007042
- Gadget Hacks, iOS 15 y el ajuste de fecha:
  https://ios.gadgethacks.com/how-to/ios-15-makes-really-easy-change-location-datetime-for-any-photo-video-0384723/
- iDownloadBlog, la tira de iOS 9:
  https://www.idownloadblog.com/2015/10/13/ios-9-scrub-photos/
- Eileen's Lounge, la tira en iOS 18 y cómo se esconde con un toque:
  https://eileenslounge.com/viewtopic.php?t=40184
- XDA, editar fecha en Google Fotos:
  https://www.xda-developers.com/edit-date-and-time-google-photos/
- Baymard Institute, miniaturas en galerías:
  https://baymard.com/blog/always-use-thumbnails-additional-images
