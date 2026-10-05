# Visor: por qué tarda ~4 s la foto siguiente y cómo lo resuelven otros

Fecha: 2026-10-05. Pedido de Franco después de cerrar REQ-MEDIA-006: "tarda
como 4 segundos con cada desliz en cargar la siguiente foto. ¿Cómo
solucionan esto empresas grandes?". Backlog: BL-036.

## Qué pasa hoy (leído en el código, `index.html` 1.5.1)

1. **Cada foto completa es un viaje entero a Apps Script.** El visor la pide con
   `getArchivo` (`fetchArchivoDataUrl`). Ese viaje tiene un piso de la
   plataforma de 1,5 a 4,5 s (medido en BL-032), más la foto en base64
   (150 KB a 1 MB; mediana de 5,6 s por foto en BL-030). Los ~4 s que ve
   Franco son eso.
2. **La precarga va un solo paso adelante y arranca tarde.** `renderCarruselFoto`
   precarga la anterior y la siguiente, pero **después** de que llegó la
   foto actual (el `forEach` va después del `await`). Si se desliza cada
   2 o 3 s, se le gana a la precarga y cada foto paga su viaje entero.
3. **Mientras espera, no se ve nada de la foto nueva.** Queda la anterior con el
   loader encima, aunque la miniatura de la foto nueva **ya está en memoria**
   (la tira de abajo la usa, `miniCache`).
4. **Las fotos completas viven solo en memoria.** Al volver a abrir la app se
   vuelven a bajar todas (a `localStorage` no entran por cuota, REQ-PERF-005).
5. Detalle menor: la foto completa mide hasta 1800 px de lado. En un teléfono
   de 375 px (≈1125 px reales) alcanza con ~1200.

## Cómo lo resuelven los grandes

- **Meta (Facebook), 2015: vista previa instantánea.** Junto con los datos
  mandan una versión mínima de la foto (~200 bytes, ~42 px), la agrandan con
  desenfoque y después la cambian por la foto real. Con conexión lenta,
  las pantallas cargaron un 30 % más rápido, y con conexión buena nunca se ve
  un hueco vacío.
  [The technology behind preview photos](https://engineering.fb.com/2015/08/06/android/the-technology-behind-preview-photos/)
- **Google Fotos (web): carga progresiva y precarga.** Primero muestra una
  versión de ~20 px agrandada y desenfocada, pide la buena al mismo tiempo y
  la reemplaza cuando llega. Precarga varias pantallas antes de que hagan
  falta y solo en la dirección en la que se mueve el usuario.
  [Building the Google Photos Web UI](https://medium.com/google-design/google-photos-45b714dfbed1)
- **Visores de galería (patrón común, p. ej. Glide en Android y visores
  web):** precargan las vecinas con el mismo pedido que va a usar el visor,
  así llegan desde la caché. La foto actual sigue en pantalla hasta que la
  nueva está decodificada, y la miniatura hace de lugar provisorio.
  [valbum2 #101](https://github.com/haumacher/valbum2/issues/101),
  [valbum2 #148](https://github.com/haumacher/valbum2/issues/148),
  [Glide #2523](https://github.com/bumptech/glide/issues/2523)
- **Tamaños según la pantalla y caché en disco:** no mandan el original sino
  una versión del tamaño de la pantalla, servida desde un CDN y guardada en
  el disco del dispositivo. Acá no hay CDN (el proxy de Apps Script es
  obligatorio por privacidad: nunca exponer la URL de Drive), pero la caché
  en disco sí se puede tener en el navegador (IndexedDB).
  [Blurry image placeholders](https://www.mux.com/blog/blurry-image-placeholders-on-the-web)

Lo que tienen en común: **no se puede hacer que el servidor responda en
0 s, así que la foto ya tiene que estar cuando el usuario llega, o hay que
mostrar algo de ella al instante.**

## Qué se puede aplicar acá, de menos a más alcance

**A. Solo front, sin tocar el servidor (lo que más se nota):**
1. Miniatura al instante: al deslizar, mostrar la miniatura de la foto nueva
   (ya está en `miniCache`) agrandada y apenas desenfocada, y reemplazarla
   por la completa cuando llega. Es lo de Meta y Google Fotos, sin costo: la
   miniatura ya se bajó.
2. Precarga antes y más lejos: arrancar la precarga de las vecinas apenas se
   desliza, sin esperar la foto actual, y 2 o 3 fotos hacia donde se viene
   deslizando (1 hacia atrás). Respetar el tope de pedidos simultáneos para
   no volver al problema de cola que corrigió REQ-PERF-005.
3. Al abrir el visor, precargar ya las 2 siguientes.

**B. Solo front: caché en disco (IndexedDB).** Las fotos completas ya vistas
quedan guardadas en el dispositivo, con un tope (~100 MB o 200 fotos, las
más viejas se van) y se borran al cerrar sesión, igual que hoy
`cp_image_cache` (BL-016). La segunda vez que se abre una tarea o un
recuerdo, todo aparece al instante. Julia: mismo criterio que la caché
actual, pero con más volumen en el dispositivo.

**C. Servidor (Code.gs, deploy a prod):** una versión "pantalla" de cada foto
(Drive `thumbnailLink` con `=s1280`, que ya se usa con `=s200` para las
miniaturas) en vez del original: menos bytes por foto. Ayuda poco, porque lo
que más pesa es el piso de ~2 s de cada viaje, y suma un deploy.

## Recomendación

A primero (solo `index.html`, ajuste acotado, se verifica en 127.0.0.1 con
`fetch` simulado a 4 s por foto). Si después de A se sigue notando al volver a
abrir la app, B. C no por ahora.

## Segunda parte: precargar distinto con wifi y con datos móviles

Pedido de Franco (2026-10-05): un modo que ahorre datos en el celular y otro
que precargue con wifi. Preguntó cómo detectan las apps si están con wifi o
con datos y cómo lo manejan.

### Cómo lo detectan las apps nativas

Se lo pregunta el sistema operativo, con interfaces que solo tiene una app
instalada:
- **iOS:** `NWPathMonitor` dice si la conexión es "cara" (`isExpensive`: datos
  móviles o punto de acceso) y si el usuario activó "Modo de datos
  reducidos" (`isConstrained`).
  [Supporting Low Data Mode in your app](https://www.donnywals.com/supporting-low-data-mode-in-your-app/),
  [Network Path Monitoring](https://useyourloaf.com/blog/network-path-monitoring/)
- **Android:** `ConnectivityManager` dice si la red se cobra por uso
  ("metered").

### Cómo lo manejan

No deciden solas: el sistema dice qué red hay y **el usuario elige qué hacer
con cada una**.
- **WhatsApp:** "Descarga automática" con tres listas: con datos móviles, con
  wifi y en roaming. En el iPhone, por tipo de archivo: "Nunca", "Wi-Fi" o
  "Wi-Fi y celular".
  [NewsBytes](https://www.newsbytesapp.com/news/science/how-to-manage-whatsapp-auto-download-settings-for-efficient-storage-use/story)
- **Instagram:** "Ahorro de datos" no precarga videos con datos móviles y baja
  la calidad de las imágenes; con wifi precarga normal. La alta resolución se
  elige: Nunca, Solo wifi, o Wifi y datos.
  [SlashGear](https://www.slashgear.com/1389820/how-to-use-less-data-instagram-tiktok/)

### Qué puede saber Nuestros Planes (página web, no app instalada)

- **Chrome en Android:** sí, con `navigator.connection` (`type`: `wifi` o
  `cellular`; `saveData`: ahorro de datos activado).
- **Safari en iPhone (todas las versiones, hasta 26.5):** no. No existe
  `navigator.connection`, y una página web no tiene acceso a `NWPathMonitor`.
  Agregarla a la pantalla de inicio no cambia nada: usa el mismo motor.
  [Can I use: Network Information API](https://caniuse.com/netinfo),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- **Computadora:** Chrome y Edge dan una estimación de velocidad
  (`effectiveType`) pero no el tipo de red; Safari y Firefox, nada.
- **Lo que sí se puede medir en cualquier navegador:** cuánto tardó y cuánto
  pesó cada foto que ya bajó. Eso da la velocidad, no el costo: un 4G rápido
  se ve igual que un wifi.

Para tener lo mismo que WhatsApp en el iPhone habría que hacer una app
nativa (o meter la web dentro de una, con Capacitor). Eso implica
publicarla en la App Store o firmarla cada año: es otro proyecto.

### Opciones para el web

1. **Automático donde se puede y una regla fija donde no:** Android con
   `navigator.connection`; en iPhone y computadora, celular = ahorro y
   computadora = wifi.
2. **Como WhatsApp, a mano:** en Mi perfil, "Precargar fotos: Siempre / Solo
   lo necesario", guardado en cada dispositivo. En Android, además, una
   opción "Solo con wifi" que funciona sola.
3. **Las dos:** 1 como valor por defecto y 2 para cambiarlo.
