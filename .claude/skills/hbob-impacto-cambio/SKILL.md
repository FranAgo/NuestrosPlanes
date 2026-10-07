---
name: hbob-impacto-cambio
description: >
  Procedimiento para medir el impacto de un cambio de lógica antes de
  tocarla y confirmarlo después: cuánta búsqueda según el tamaño, quién
  llama, hermanas y copias (buscadas por nombre y por lo que hacen), datos
  calculados que se guardan y quién los escribe y lee, lugares sueltos que
  van juntos, tests que conocen la función, la regla de la base y las
  piezas que se deployan aparte; después, la misma corrección en cada
  hermana y copia o su ítem en el backlog, datos ya guardados mal como
  cambio aparte, y un mapa corto. Usar al arreglar un bug de cálculo o de
  guardado, cambiar una función que otras usan, sumar un estado, un campo
  o una regla, y ante "¿qué más rompe esto?", "¿dónde más se usa?", "¿por
  qué este número sale distinto en otra pantalla?". No es reorganizar u
  optimizar (eso es hbob-salud-codigo), ni probar el cambio
  (hduck-prueba-cambio), ni la revisión de seguridad
  (hjulia-revision-cambio).
---

# Impacto de un cambio

Lo mantiene Bob; lo usa cualquiera que cambie lógica de cálculo, de
guardado o de reglas. Es de uso general: las hermanas, copias, datos
calculados y lugares sueltos ya conocidos viven en el proyecto. Buscalos
antes de empezar en el catálogo de convenciones del proyecto (tema de
contratos), si tiene uno.

Lo que falla en la práctica no es no saber buscar, sino: arreglar el
lugar que mostraron y no los otros que hacen lo mismo; buscar solo por el
nombre, cuando la copia se llama distinto; dar por completa una lista de
lugares que no lo es; escribir una fórmula al lado de una ya validada;
dejar código muerto sin decir cómo sacarlo; y buscar lo mismo en un
ajuste de una línea que en un cambio de fondo.

Contenido: Proporción · 1. Qué cambia · 2. Quién depende · 3. Datos
calculados · 4. Lugares sueltos · 5. Fuera del archivo · 6. Después ·
7. Mapa.

## Proporción

El nivel de proceso (completo o liviano) lo decide el proyecto; esto es
cuánta búsqueda lleva cada nivel. Si el proyecto no define niveles: es de
fondo si cambia un contrato, un campo guardado, permisos, o toca varios
módulos.

| | Ajuste puntual | Cambio de fondo |
|---|---|---|
| Quién llama | por nombre | por nombre, y cada camino hasta la acción del usuario |
| Hermanas y copias | por prefijo y una línea del cuerpo | además, por el campo que escribe y la fórmula |
| Catálogo | la sección del tema que toca | todo el tema de contratos |
| Mapa (paso 7) | 2 o 3 líneas | el formato completo |

Un cambio de una línea en un texto o un estilo no lleva este
procedimiento. Cambia un contrato si cambia lo que reciben los demás: la
fórmula o el significado de un campo que otros leen, o el comportamiento
de otros llamadores. No lo cambia un arreglo que devuelve un campo a su
fórmula de siempre, ni un parámetro opcional que los demás no usan. Si la
búsqueda muestra un contrato que cambia, se avisa y se sube de nivel.

## 1. Qué cambia

Antes de buscar, una línea: qué entra, qué sale y qué se guarda hoy, y qué
cambia de eso. Si no cambia nada de los tres, se busca menos.

## 2. Quién depende

- **Llamadores:** por nombre, incluidas las llamadas que no son código
  directo (texto de un `onclick`, `window[nombre]`, un nombre en una
  lista de un helper de tests). Para cada uno: ¿le sirve el cambio, o
  espera lo de antes?
- **Argumentos ya modificados:** si la función recibe algo que quien la
  llama acaba de filtrar, borrar o reemplazar, lo que se sacó ya no está
  adentro. Pasarlo aparte, con el patrón que el proyecto ya use para eso.
- **Hermanas:** funciones vecinas que hacen la misma operación (mismo
  prefijo, misma familia de agregar/editar/borrar). Se comparan en lo que
  guardan, cómo redibujan y qué validan.
- **Copias:** se buscan por una línea característica del cuerpo o por la
  fórmula, no por el nombre.
- **Nombres reasignados:** una función que se reemplaza más adelante
  (`f = function(){...}`) corre en su versión nueva; el cambio va ahí.
- **Tests:** qué tests la ejercitan, y si el proyecto extrae funciones por
  nombre para probarlas, en qué listas tiene que estar un nombre nuevo.

Que una búsqueda no encuentre nada vale si se buscó por nombre **y** por lo
que hace. Si se buscó solo por nombre, se dice.

## 3. Datos calculados que se guardan

Si el cambio toca un total, un estado o una marca que se calcula y se
guarda para que otros lo lean sin recalcular:
- **quién lo escribe** (la función que asigna, no solo la que la llama),
  con qué datos, y si dependen de quién guarda (permisos, cachés);
- **quién lo lee**, y si recalcula o confía en lo guardado;
- **qué otros caminos lo dejan viejo**: agregar, borrar o editar algo de
  lo que depende, por cualquier pantalla.

Nunca una segunda fórmula: se reusa la que ya está validada, o se
corrige esa. Si hay dos que dan distinto, eso es un hallazgo en sí.

Lo que no se pudo correr con datos reales (por qué un total salió
distinto en un caso puntual) queda como **hipótesis**, con el dato que la
confirmaría. Lo que se leyó en el código y se vio pasar, como hallazgo.

## 4. Lugares sueltos

Si el cambio es "sumar uno más" de algo que vive en varias listas (un
estado, un tipo, una categoría):
- partir de la lista del catálogo, si existe, y **buscar igual**: por el
  nombre de un elemento vecino ya existente (el texto de otro estado, otro
  tipo), porque la lista del catálogo puede haber quedado corta;
- separar lo que vive en el código de lo que vive en la base
  (configuración guardada que pisa al código en ejecución): lo segundo
  necesita un cambio de datos en cada ambiente, con su aprobación;
- clasificar cada aparición (va / no va); se para cuando un término de
  búsqueda nuevo ya no suma lugares, y se dice qué quedó sin clasificar.

## 5. Fuera del archivo

- **Regla de la base:** ¿acepta lo que el cambio va a guardar (campos
  nuevos, otro tipo, otro documento)? ¿cambia el costo de evaluarla? Quién
  puede qué es de la revisión de seguridad.
- **Piezas con deploy propio** (funciones en la nube, scripts de
  integración): el cambio va en los dos lados, y se dice en qué orden se
  deploya cada uno. Si la pieza no está en el repo, se pide el código.

## 6. Después del cambio

- **Cada hermana y copia** del paso 2 tiene el mismo arreglo, o un ítem
  en el backlog con el motivo y el `archivo:línea` (si ya existe, una
  nota en ese ítem). Ninguna queda sin nombrar.
- **Datos ya guardados mal** por el bug: no se arreglan dentro del cambio
  de código; son un cambio de datos aparte (`hgary-cambio-datos`).
- **Código que queda muerto** por el cambio: no se borra en el mismo
  cambio. Va al backlog con la prueba que hará falta (sin llamadores por
  nombre ni por texto); el borrado sigue `hbob-salud-codigo`.
- Lo demás que encontró la búsqueda va al backlog con evidencia.

## 7. Mapa

```
Cambia: <qué entra/sale/se guarda, antes → después>.
Llamadores: <N, cuáles; los que cambian de comportamiento>.
Hermanas y copias: <cuáles; arregladas / al backlog (BL-…)>.
Datos calculados: <campo: quién escribe / quién lee / otros caminos>.
Lugares sueltos: <lista; lo que no se pudo confirmar>.
Fuera del archivo: <regla, funciones, scripts; orden de deploy>.
Datos ya guardados: <cambio aparte / no aplica>.
Búsqueda: <por nombre / por nombre y por lo que hace>.
Hipótesis: <lo que no se pudo correr, y qué la confirmaría>.
```

En un ajuste puntual, las mismas cosas en 2 o 3 líneas.
