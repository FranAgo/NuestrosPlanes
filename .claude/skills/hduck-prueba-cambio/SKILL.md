---
name: hduck-prueba-cambio
description: >
  Procedimiento para probar un cambio de código en dos momentos: antes de
  programar, notas de prueba con el resultado esperado sacado del pedido
  (no del código) y qué se automatiza o va a un guion; después, estado
  previo de la suite, tests que se ven fallar contra la versión vieja o un
  mutante (cuántos según el tamaño del cambio), 3 corridas, diff de golden
  master o snapshots revisado contra lo pedido, choques con las reglas de
  tests del proyecto y un reporte corto. Usar al arreglar un bug, sumar una
  función o cambiar algo que tiene tests, y antes de decir "listo",
  "probado", "anda" o "lo paso a staging"; también ante "¿esto está
  probado?", "escribí los tests de esto", "¿qué hay que probar?". No es el
  diagnóstico de un test que ya está en rojo (eso es hduck-test-en-rojo),
  ni la revisión de seguridad (hjulia-revision-cambio), ni la verificación
  en el navegador (hjay-verificacion-visual).
---

# Probar un cambio

Lo mantiene Duck; lo usa cualquiera que cambie código con tests. Es de uso
general: cómo se corre la suite, qué tan fiel es el entorno de prueba y
qué trampas ya se pisaron viven en el proyecto. Buscalo antes de empezar
en el catálogo de convenciones del proyecto (tema de tests), si tiene uno.

Lo que falla en la práctica no es saber qué probar, sino:
- escribir como "esperado" lo que el código ya hace;
- un test que nunca se vio fallar, y que puede pasar en falso;
- aceptar una foto regenerada (golden master, snapshot) sin leer su diff;
- hacer el proceso grande en un cambio chico, o el chico en uno grande;
- ver que algo choca con una regla de tests del proyecto y aceptarlo igual.

Contenido: Proporción · 1. Notas de prueba · 2. Estado previo · 3. Tests
que muerden · 4. Estables · 5. Fotos del resultado · 6. Reglas del
proyecto · 7. Guion · 8. Reporte.

## Proporción

El nivel de proceso (completo o liviano) lo decide el proyecto; esto es
cuánta prueba lleva cada nivel. Si el proyecto no define niveles: es de
fondo si cambia un contrato, permisos o datos, o toca varios módulos.

| | Ajuste puntual | Cambio de fondo |
|---|---|---|
| Notas de prueba | 2 o 3 líneas | antes de escribir código, con riesgos |
| Tests nuevos | los del caso pedido y su borde obvio | cada caso del resultado esperado |
| Mutantes | 1, en la línea que cubre el test nuevo o cambiado | 2 o 3 por función con lógica cambiada |
| Reporte | 3 a 5 líneas | el formato del paso 8 |

Hacer de más también es un error: cuesta tiempo y entierra lo importante
en un reporte largo. Si al probar aparece algo que cambia el nivel (un
contrato roto, un permiso), se avisa y se sube, no se sigue en silencio.
Si hay duda entre los dos, se pregunta antes de escribir los tests; las
notas del paso 1 se pueden preparar mientras tanto.

## 1. Notas de prueba (antes de leer la implementación o el arreglo propuesto)

- **Resultado esperado de cada caso, sacado del pedido.** Escrito antes de
  abrir el código que se va a cambiar. Si el pedido no alcanza para
  saberlo, es una pregunta para quien pidió, no algo que se deduce del
  código. Si se avanza con un supuesto, queda escrito como supuesto.
  Lo que el pedido nombra pero no define ("visita programada", "cobrada")
  se busca en cómo lo define el sistema hoy (el modelo de datos, otra
  pantalla que ya lo usa), no en la función que se va a cambiar.
- **Riesgos:** qué puede romper este cambio (dato vacío o viejo, otro
  camino que llama a la misma función, el reloj, permisos, dos pestañas o
  usuarios a la vez) y qué ya se rompió antes en esa zona (bitácora,
  backlog, `git log` del archivo).
- **Qué se automatiza y qué no:** la condición o el cálculo van a un test;
  lo que depende de un click, del foco o de varios pasos en pantalla va al
  guion del paso 7.

## 2. Estado previo

Antes de tocar nada, corré la suite y anotá el resumen y los **nombres** de
los que fallan. Si hay rojos, no se diagnostican acá: con el nombre alcanza
para decir después cuáles no son de este cambio (y, si no tienen ítem en
el backlog, es trabajo de `hduck-test-en-rojo`).

## 3. Tests que muerden

- Cada test nuevo se ve **fallar** contra la versión vieja (si el cambio
  arregla o agrega algo) o contra un mutante (si cubre lógica que ya
  existía). Un test que pasa con la versión vieja no prueba el cambio, y
  uno que falla porque la función no existe (`ReferenceError`) tampoco:
  en ese caso, mutante.
- Mutantes, según la tabla: condición invertida, `<` por `<=`, `&&` por
  `||`, un guard o una llamada quitados, un retorno fijo. Se saltean las
  líneas sin lógica (textos, estilos, logs).
- Se aplican de a uno y se deshacen sin llevarse el cambio real (edición
  inversa o una copia del archivo; nunca un `checkout` o un `stash` de
  todo el árbol). Al final, el diff muestra solo el cambio.
- Un mutante que sobrevive pide un test más, o una línea que explique por
  qué es equivalente (no cambia ningún resultado observable).
- Un test que por diseño no puede fallar contra la versión vieja (protege
  contra un falso positivo, no contra la vuelta atrás) se dice así.

## 4. Estables

Cada test nuevo se corre 3 veces, solo (sin la suite entera). Si da
distinto, no está terminado: casi siempre es reloj, orden o estado
compartido.

## 5. Fotos del resultado

Regenerar un golden master o un snapshot convierte en "esperado" lo que el
código hace hoy, error incluido. Antes de aceptarlo:
- cada línea del diff se compara contra lo pedido: qué tenía que cambiar
  y qué no. Si cambian fotos que no tenían por qué, el cambio todavía no
  está bien hecho (por ejemplo, una línea de más en cada tarjeta);
- si ninguna foto cambia, se mira que algún escenario recorra el código
  tocado; si ninguno lo recorre, un test puntual.

## 6. Reglas de tests del proyecto

Antes del reporte, repasá el tema de tests del catálogo del proyecto
contra lo que escribiste. Si algo lo contradice (por ejemplo, una foto
que depende del día cuando la regla dice que no), se corrige. Si de
verdad no se puede cumplir, se dice en el reporte cuál regla, por qué, y
se pregunta: no se acepta en silencio porque "el riesgo es bajo".

## 7. Guion de lo que no se automatiza

Corto: qué se prueba, con qué datos, qué se busca, y qué se vio. Si es
algo que se ve en la interfaz, la evidencia sale de la herramienta de
verificación visual del equipo, no de una captura mirada a ojo. Si no se
pudo recorrer, queda como pendiente con el guion escrito, no omitido.

## 8. Reporte

```
Suite: antes N/M (rojos: <nombres o "ninguno">) → después N/M.
Tests nuevos: <cuántos, dónde>. Vistos fallar contra: <versión vieja / mutante>.
Mutantes: N aplicados, N detectados (<sobreviviente y por qué, si hay>).
Fotos: <qué cambió y que coincide con lo pedido / no cambió ninguna>.
A mano: <guion recorrido y qué se vio / pendiente>.
Sin cubrir: <lo que queda, dicho>.
Supuestos: <los del paso 1 que el usuario tiene que confirmar>.
```

En un ajuste puntual, las mismas cosas en 3 a 5 líneas.
