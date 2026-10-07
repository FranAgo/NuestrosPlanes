---
name: hbob-salud-codigo
description: >
  Procedimiento para reorganizar, unificar copias, borrar código muerto u
  optimizar sin cambiar lo que el sistema hace: un sombrero por vez
  (reorganizar o cambiar comportamiento, nunca juntos), alcance acotado a
  lo que el cambio toca, prueba de que el resultado no cambió (suite y
  golden master idénticos antes y después, o un test de caracterización
  si nadie cubre ese código), cuándo unificar copias, cómo probar que algo
  está muerto antes de borrarlo, rendimiento solo con medición antes y
  después, lo que no entra al backlog con evidencia, y la pasada periódica
  de salud del código. Usar ante "ordená este código", "unificá esto",
  "esto está duplicado", "borrá lo que no se usa", "optimizalo", "anda
  lento", "de paso ordená…", y en la pasada periódica de salud del código.
  No es medir el impacto de un cambio de comportamiento (eso es
  hbob-impacto-cambio) ni probar un cambio nuevo (hduck-prueba-cambio).
---

# Salud del código

Lo mantiene Bob; lo usa cualquiera que reorganice u optimice. Es de uso
general: las copias y el código muerto ya conocidos, cómo se regeneran las
fotos de la suite y cada cuánto se hace la pasada viven en el proyecto
(catálogo de convenciones, tema de contratos; backlog; reglas del
proyecto).

Lo que falla en la práctica: reorganizar y arreglar en el mismo paso (y
no saber cuál de los dos rompió algo); ordenar "de paso" mucho más de lo
necesario; optimizar a ciegas; borrar algo "que no se usa" que se llamaba
por un texto; y probar una reorganización chica como un cambio de fondo.

Contenido: 1. Un sombrero por vez · 2. Alcance · 3. Prueba de que no
cambió · 4. Copias · 5. Código muerto · 6. Rendimiento · 7. Lo que no
entra · 8. Pasada periódica · 9. Reporte.

## 1. Un sombrero por vez

Reorganizar (mover, renombrar, unificar, borrar lo muerto) y cambiar
comportamiento (arreglar, agregar) nunca van en el mismo paso ni en el
mismo commit.

Si un pedido trae los dos ("arreglá X y de paso ordená Y"):
- se reorganiza primero **solo si el arreglo lo necesita** (por ejemplo,
  unificar dos copias para que el arreglo vaya una sola vez), en su
  commit, con la prueba del paso 3;
- después, el arreglo, con la herramienta de impacto y la de prueba;
- lo que el arreglo no necesita no se toca: va al backlog (paso 7), y se
  le dice al usuario por qué no se hizo en el momento.

## 2. Alcance

Solo lo que el cambio toca o el pedido nombra; antes de mover, una línea
con qué se mueve y qué no. Un bug que aparece al reorganizar no se arregla
ahí: se anota, y va después con su propio test.

Si la reorganización toca varios módulos, es cambio de fondo según el
proyecto, aunque no cambie comportamiento.

## 3. Prueba de que no cambió

Una reorganización pura tiene que dejar todo igual. La prueba es:
- **estado previo de la suite** (resumen y nombres de los rojos);
- después: **los mismos rojos, por nombre**, y las fotos (golden master,
  snapshots) **sin diff**. Si alguna cambia, no es reorganización pura: se
  para y se busca por qué. Una foto sin diff solo prueba algo si algún
  escenario recorre el código movido; si no, no cuenta;
- **¿los tests muerden el código movido?** Uno o dos mutantes sobre la
  versión vieja (un borde, un guard). Si sobreviven, o nada lo recorre:
  **tests de caracterización** (fijan lo que hace hoy, con los bordes que
  el mutante mostró), en verde **antes** de mover y en su propio commit;
- el cambio de versión del proyecto, si cambia fotos, va en otro commit;
- si el proyecto extrae funciones por nombre para probarlas, los nombres
  nuevos en sus listas.

Proporción: en una reorganización chica alcanza con eso. Comparar miles
de casos o mutar todo lo movido es para lógica que no se puede
caracterizar con pocos casos.

## 4. Copias

- Por iniciativa propia, una segunda copia idéntica se anota y no se
  unifica; si el usuario lo pide, se unifica.
- Se unifica sin pedido cuando ya divergieron (un arreglo llegó a una y
  no a la otra) o cuando aparece la tercera. Un arreglo que vale para dos
  copias idénticas va en las dos; no hace falta unificar antes.
- Antes de unificar copias que divergieron: decidir cuál comportamiento
  es el correcto. Eso es un cambio de comportamiento para la otra, y va
  aparte (sombrero de arreglo), no escondido en la unificación.
- Lo que difiere entre las copias pasa a ser parámetro; no se agrega
  lógica nueva.

## 5. Código muerto

Antes de borrar, prueba de que no se usa:
- sin llamadores por nombre, ni por texto (atributos `on*`, nombres
  armados con strings, `window[...]`, listas de helpers de tests);
- si es una función que se reasigna: cuál de las dos corre de verdad;
- si es una variable: que nadie la lea, incluida una con el mismo nombre
  en otro alcance (no confundir una local con la global).

Si hay forma de comprobarlo corriendo (un `throw` o un contador temporal
en una copia, y la suite en verde), se hace y se deshace. El borrado va
en su propio commit, con la prueba del paso 3.

## 6. Rendimiento

Sin medición no hay optimización, hay una opinión.
- **Antes:** qué acción es lenta, en qué equipo y con cuántos datos (se
  pregunta si no se sabe), y una medida reproducible: tiempo de la acción,
  cantidad de lecturas a la base, tamaño de lo que se descarga.
- **Después:** la misma medida, en las mismas condiciones.
- Lo que no se puede medir queda como **hipótesis**, con qué medida la
  confirmaría. Una medición con datos inventados ordena las hipótesis
  pero no autoriza el cambio: falta la del usuario, o su OK.
- Una optimización que cambia el resultado (orden, redondeo, datos
  cacheados que pueden quedar viejos) no es pura: lleva el sombrero de
  cambio de comportamiento.

## 7. Lo que no entra

Todo lo que se vio y no se tocó va al backlog del proyecto, marcado como
salud de código si es reorganización pura (si cambia comportamiento, sin
esa marca), con evidencia: `archivo:línea`, qué está duplicado o
muerto y cómo se comprobó, y qué riesgo trae dejarlo (por ejemplo, "un
arreglo en una copia no llega a la otra").

## 8. Pasada periódica

Si el proyecto define una pasada periódica de salud del código: se
propone en el momento que el proyecto diga, sobre los ítems marcados del
backlog; arranca solo con el OK del usuario y nunca desde una tarea
automática sin supervisión. Cada ítem es una reorganización pura, en su
commit, con la prueba del paso 3, y sigue el flujo normal de ambientes y
aprobaciones del proyecto. Si un ítem resulta necesitar un cambio de
comportamiento, sale de la pasada y vuelve al backlog así descrito.

## 9. Reporte

```
Sombrero: reorganización pura / medición / (si hubo arreglo: commits separados).
Alcance: <qué se movió, unificó o borró; qué no y por qué>.
Prueba: suite antes N/M → después N/M; fotos sin diff; caracterización <sí, cuál / no hizo falta>.
Muerto: <qué se borró y cómo se comprobó que no se usaba>.
Medición: <antes → después, en qué condiciones / hipótesis sin medir>.
Al backlog: <ítems, marcados salud de código>.
```

En una reorganización chica, las mismas cosas en 3 a 5 líneas.
