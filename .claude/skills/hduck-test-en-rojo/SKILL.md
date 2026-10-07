---
name: hduck-test-en-rojo
description: >
  Procedimiento ante un test que falla, falla a veces o "ya fallaba antes":
  chequeo corto de rojos conocidos (por nombre, con ítem y plazo) para no
  frenar otra tarea, y diagnóstico completo de un rojo nuevo o sin ítem
  (correrlo solo y 3 veces, clasificar, causa con evidencia, buscar la
  misma causa en otros tests y verdes que pasan por la razón equivocada),
  y después arreglarlo o ponerlo en cuarentena visible ligada a un ítem
  del backlog con fecha. Usar cuando la suite no da todo en verde, ante
  "falla este test", "¿por qué da rojo?", "falla a veces", "son los de
  siempre", "es preexistente, seguí", y antes de reportar un resultado con
  rojos. No es probar un cambio nuevo (eso es hduck-prueba-cambio) ni la
  revisión de seguridad (hjulia-revision-cambio).
---

# Test en rojo

Lo mantiene Duck; lo usa cualquiera que corra la suite. Es de uso
general: cómo se corre cada test, qué marca de cuarentena tiene el runner
y qué trampas de entorno ya se conocen viven en el proyecto (catálogo de
convenciones, tema de tests, si tiene uno).

"Preexistente" o "sin relación" no es un diagnóstico. Un rojo aceptado
sin causa tapa el siguiente: con el número siempre igual, nadie ve
cuándo cambian los nombres.

Contenido: A. Chequeo corto · B. Diagnóstico · C. Decisión · D. Reporte.

## A. Chequeo corto (en medio de otra tarea)

Si el pedido es seguir con otra cosa y los rojos "son los de siempre":
1. Comparar los rojos **por nombre** con el backlog, no por número.
2. Cada uno tiene que tener ítem en el backlog con causa y, si está en
   cuarentena, fecha de entrada.
3. Si se cumplen, se sigue con la tarea, con una línea:
   "Rojos: <nombres>, los de <ítem>; sin rojos nuevos."
4. Si hay un rojo nuevo, uno sin ítem, uno identificado que sigue en rojo
   sin cuarentena, o una cuarentena que pasó el plazo, se dice en esa
   línea y se propone la parte B o C para el cierre de la tarea en curso
   (antes, si puede tener que ver con lo que se está tocando). No se frena
   la tarea por un rojo ajeno ya identificado.

## B. Diagnóstico

1. **Solo y 3 veces.** El test solo (filtro por nombre o archivo), tres
   corridas. Mismo resultado las tres: determinista. Distinto: inestable.
2. **Clasificar:**
   - error real de la aplicación (el test tiene razón);
   - test o entorno de prueba roto (stub infiel, extracción, dato de
     prueba viejo);
   - dependiente de la máquina o del momento (finales de línea, zona
     horaria, reloj, rutas);
   - inestable (orden, estado compartido, tiempos);
   - límite de la plataforma (tope de evaluación, timeout del emulador).
3. **Causa con evidencia:** el mensaje real del error, no solo el nombre;
   y una prueba que la confirme (el texto que busca sí aparece después de
   normalizar, el mismo error en la versión anterior, un sondeo que aísla
   la condición). Sin evidencia, es hipótesis y se dice así.
4. **La misma causa en otros lados:** buscar otros tests con el mismo
   patrón (misma lectura de archivo, mismo stub, misma regla) y contarlos,
   aunque hoy pasen.
5. **Verdes que pasan por la razón equivocada:** si la causa es un límite
   o un stub, los tests vecinos que esperan un rechazo o un vacío pueden
   estar pasando por esa misma causa y no por la lógica. Los helpers de
   "tiene que fallar" no dicen por qué falló: se comprueba capturando el
   error y leyendo el mensaje. Se nombran.

Si el rojo es de reglas o permisos, el diagnóstico es este; el arreglo
sigue la herramienta de revisión de seguridad del equipo.

## C. Decisión

- **Se arregla en el momento** si es el test o el entorno y el arreglo es
  chico. Si el rojo es el pedido, se arregla; si apareció en medio de otra
  tarea, se propone y se arregla con el OK. Después, 3 corridas y un
  mutante en el código que cubre: tiene que seguir detectándolo (un test
  que deja de fallar puede haber dejado de probar).
- **Error real de la aplicación** (el test tiene razón): va al backlog con
  su propia prioridad y la evidencia del paso B. Si el arreglo es grande
  o toca permisos, lleva su propio proceso; no se mete dentro de la tarea
  en curso. Mientras no se arregla, también va a cuarentena (abajo), con
  el texto empezando por "error de la app": el defecto queda a la vista en
  el ítem y en el resumen de la suite, y un rojo nuevo no se confunde con
  este.
- **Cuarentena,** si no se arregla en la sesión: una marca que lo sigue
  corriendo y no tiñe la suite (en `node:test`, `{ todo: '...' }`), con
  el ítem, la fecha de entrada y la causa en el texto:
  `{ todo: 'BL-xxx (desde AAAA-MM-DD): causa en pocas palabras' }`.
  En el ítem del backlog, una línea de nota con la misma fecha y hasta
  cuándo: el plazo del proyecto, o 3 meses si no fija uno. Las
  cuarentenas se repasan cuando el proyecto lo indique (si no dice nada,
  al cerrar cada mes).
- **Nunca** saltear (`skip`) ni borrar el test, ni bajar lo que verifica
  para que pase, sin una decisión registrada.

## D. Reporte

```
Rojo: <nombre> (<archivo:línea>). 3 corridas: <determinista / inestable>.
Clase: <una de las de B.2>. Causa: <qué>, evidencia: <cómo se confirmó>.
Misma causa en: <N tests / ninguno>. Verdes sospechosos: <cuáles / ninguno>.
Decisión: <arreglado (3 corridas, mutante detectado) / backlog BL-xxx con
prioridad / cuarentena BL-xxx desde AAAA-MM-DD>.
```
