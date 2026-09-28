# Cómo se logra un look "premium" en una interfaz oscura (2026-09-28)

Pedido de Franco: pasar Nuestros Planes de "buenas bases" a algo más
premium, sin perder el efecto actual, y "con criterio" (no aplicar todo lo
que aparezca). Origen: BL-034 (contraste). Lo usa REQ-UX-002.

## Qué hacen las marcas y apps de referencia

- **Capas de oscuridad, no un negro plano.** Los temas oscuros cuidados
  usan varios casi-negros con temperatura (cálidos o fríos) y marcan la
  altura de cada superficie aclarándola, no con sombras. Material Design lo
  formaliza: en oscuro, una superficie más alta es más clara, porque las
  sombras no se ven sobre fondo oscuro. Apple usa dos juegos de fondo
  ("base" y "elevated") por lo mismo.
- **Bordes que se ven, pero apenas.** Linear, Vercel, Raycast y similares
  separan superficies con bordes finos semitransparentes claros (blanco a
  baja opacidad) en vez de sombras, y suman un "filo de luz": 1 px
  iluminado en el borde de arriba de tarjetas y diálogos (`inset`), que
  hace que la superficie se lea como un objeto físico.
- **Un solo acento, metálico y escaso.** El lujo oscuro usa dorado, ámbar
  o cobre apagado como acento, en pocos lugares. Paleta de dos o tres
  colores como mucho. Los colores saturados se bajan (70-80 %) para no
  vibrar sobre el oscuro.
- **Texto que no es blanco puro, pero con contraste de verdad.** Blancos
  rotos para el texto principal. Apple pide 4,5:1 como mínimo y apuntar a
  7:1 en texto chico con colores propios.
- **Tipografía editorial y aire.** Serif con contraste para títulos,
  sans sobria para la interfaz, mayúsculas con letras espaciadas, pocas
  familias y pesos. El espacio generoso y un ritmo parejo "hacen más por
  lo premium que cualquier efecto".
- **Textura mínima.** Un grano muy suave (opacidad baja) sobre fondos con
  degradé evita el escalonado ("banding") de los degradés oscuros y le
  saca el aspecto de "vacío" al negro.
- **Movimiento corto y con salida suave.** Micro-interacciones de 100 a
  150 ms, menús 150-250 ms, modales 200-300 ms; nunca más de 300 ms. Curva
  `ease-out` para lo que entra; `ease-in` nunca en interfaz. Todo con
  `transform`/`opacity` y apagado con `prefers-reduced-motion`.
- **Las fotos son las protagonistas.** Airbnb (2026) se ve como una
  revista: la interfaz se corre para que respiren las fotos. En una app de
  recuerdos de pareja, eso es lo más valioso que tiene la pantalla.

## Criterio de Jay: qué entra y qué no

Entra (encaja con la app y no cambia su carácter):
1. Tres niveles de superficie cálidos (fondo, tarjeta, elevado para
   modales) en vez de dos.
2. Bordes de 1 px semitransparentes cálidos (se ven en la PC de Franco,
   donde los de 0,5 px desaparecen) más el filo de luz arriba de tarjetas
   y modales.
3. El cobre como metal: un degradé muy sutil y un brillo interno solo en
   la acción principal y en lo activo. En el resto, cobre plano.
4. Tres niveles de texto que pasan 4,5:1 (principal, secundario, apagado).
5. Atmósfera de fondo: un resplandor cobre muy tenue arriba y grano
   suave, solo en el fondo de la app, nunca en tarjetas ni texto.
6. Tipografía: se quedan DM Serif Display y Jost. Más aire y ritmo;
   etiquetas en mayúscula no más chicas que ~11 px.
7. Movimiento: presión de botón (`scale(0.98)`), entradas `ease-out` de
   150-250 ms.
8. Fotos: borde interno y sombreado suave donde haya texto encima.
9. Tarjeta completada: en vez de transparentarla al 55 % (hoy ilegible),
   desaturarla y bajarle el brillo con contraste suficiente.

No entra (y por qué):
- **Glassmorphism / `backdrop-filter` en todos lados:** caro en el
  celular de Noelia sobre listas largas y baja la legibilidad. Como mucho,
  el header al hacer scroll, y solo si se mide.
- **Bordes con degradé animado, brillos que siguen al mouse, neón:** es el
  lenguaje de las landing de productos SaaS, no el de algo íntimo; además
  en el celular no hay mouse.
- **Cambiar las fuentes:** las actuales ya son editoriales y funcionan.
- **Sombras grandes:** sobre fondo oscuro no se ven y ensucian.
- **Más colores:** DESIGN.md ya fija cobre/verde/rojo; no hace falta más.

## Fuentes

- Material Design, Dark theme: https://m2.material.io/design/color/dark-theme.html
- Apple HIG, Dark Mode: https://developers.apple.com/design/human-interface-guidelines/foundations/dark-mode/
- Apple HIG, Materials: https://developers.apple.com/design/human-interface-guidelines/foundations/materials/
- Linear design (LogRocket): https://blog.logrocket.com/ux-design/linear-design/
- Linear DESIGN.md (VoltAgent): https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
- Dark luxury UI (Skills UI): https://www.skillsui.app/blog/dark-luxury-ui-design
- Dark UIs, dos and don'ts (Toptal): https://www.toptal.com/designers/ui/dark-ui
- Dark mode best practices (LogRocket): https://blog.logrocket.com/ux-design/dark-mode-ui-design-best-practices-and-examples/
- Editorial UI para marcas de lujo (Techelix): https://studio.techelix.co/the-art-of-editorial-ui-leveraging-typography-and-whitespace-for-luxury-brands-ui/
- Tipografía de lujo (Fontfabric): https://www.fontfabric.com/blog/fonts-for-luxury-branding/
- Grainy gradients (CSS-Tricks): https://css-tricks.com/grainy-gradients/
- Tarjetas con borde degradé (CodeFronts, lo que se descartó): https://codefronts.com/components/css-cards/gradient-border-glow-card/
- Animación, estándares de Emil Kowalski: https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md
- Airbnb, diseño guiado por fotos: https://getdesign.md/airbnb/design-md
