---
name: hjulia-revision-cambio
description: >
  Procedimiento para revisar la seguridad de un cambio concreto (una regla
  de la base, un permiso nuevo, una colección o tabla nueva, una pantalla
  que muestra datos cargados por usuarios, una integración) de punta a
  punta: matriz de quién puede qué, estado previo de los tests, tests del
  caso permitido y del denegado que se prueba que fallan contra la versión
  vieja, búsqueda de variantes, hallazgo o hipótesis con evidencia de cada
  eslabón, orden de deploy cuando se cierra un acceso y registro de lo que
  queda fuera del alcance. Usar al implementar o revisar cualquier cambio
  de quién ve o escribe qué, antes de decir "está seguro", "listo" o
  "cerrado", y ante pedidos como "revisá la seguridad de esto", "¿esto
  abre algo?", "¿alguien podría ver/borrar esto?", "cerrá esta regla".
  No es la forma de pensar de Julia (eso es la persona
  julia-engineer-appsec) ni el catálogo de cuidados del proyecto
  (convenciones-tecnicas).
---

# Revisión de seguridad de un cambio

Lo mantiene Julia; lo usa cualquiera que toque permisos, reglas, datos
sensibles o HTML armado con datos de usuarios. Es de uso general: lo
propio de cada proyecto (cómo se llaman sus funciones de permiso, cómo se
corren sus tests de reglas, a qué ambientes se deploya) vive en el
proyecto. Buscalo antes de empezar en el catálogo de convenciones del
proyecto, si tiene uno.

Qué revisar lo dice el protocolo de la persona de Julia. Esta herramienta
es el orden y la evidencia que tiene que quedar en cada paso, porque lo
que falla en la práctica no es conocer los riesgos, sino:
- tests de bloqueo que pasan igual con la regla vieja (no prueban nada);
- un test "positivo" que valida justo el hueco;
- afirmar que una cuenta "recibe" un dato mirando una sola capa;
- una regla que se cierra antes de que la interfaz deje de pedir el dato,
  y la pantalla queda rota en producción;
- hallazgos encontrados de paso que se pierden en el chat.

Contenido: Proporción · 1. Matriz · 2. Estado previo · 3. Tests en los
dos sentidos · 4. Variantes · 5. Hallazgo o hipótesis · 6. Deploy ·
7. Registro · 8. Qué decir al terminar.

## Proporción

Esto es la profundidad de la revisión, no el nivel de proceso: si el
cambio lleva el proceso completo o uno liviano lo decide el proyecto.

Un escape de salida que no cambia quién ve qué: el punto de escapes del
paso 3, y los pasos 4, 5 y 8. Cualquier cambio de reglas, permisos o de
qué descarga cada cuenta: todos los pasos, aunque el diff sea de una
línea.

## 1. Matriz de quién puede qué

Antes de escribir código, armá la matriz del cambio: filas = lo que
decide el acceso (los permisos configurables, si el proyecto los tiene, o
los roles; más las cuentas externas o de portal y "sin sesión"), columnas =
leer, crear, modificar, borrar. En cada celda: permitido o denegado, y
**qué capa lo decide** (regla de la base, servidor, o solo la interfaz).

```
| Cuenta              | Leer          | Crear              | Modificar | Borrar    |
| interno con permiso | sí (regla)    | sí (regla)         | sí        | sí        |
| interno sin permiso | sí (regla)    | NO (regla)         | NO        | NO        |
| portal externo      | NO (regla)    | NO                 | NO        | NO        |
| sin sesión          | NO            | NO                 | NO        | NO        |
```

- Una celda que solo decide la interfaz se marca así; si tiene que ser un
  control real, no está resuelta.
- Si el cambio saca una condición de una regla, una validación o un
  escape, mirá antes por qué estaba (el comentario al lado y el commit que
  la agregó, con `git log -S` o `git blame`). Puede ser el arreglo de un
  hallazgo viejo.
- Si una celda depende de una decisión de producto (¿quién puede dar de
  alta esto?), se pregunta antes de escribir la regla. No se elige un
  permiso por el usuario.
- "Leer" incluye lo que la cuenta **descarga** al entrar (suscripciones,
  consultas), no solo lo que ve en pantalla. Si la base no filtra campos,
  la cuenta recibe el documento entero.
- Si la interfaz consulta una colección entera y la regla restringe por
  documento, la consulta se rechaza completa (las reglas no filtran): la
  consulta tiene que estar acotada igual que la regla.

## 2. Estado previo

Antes de tocar nada, corré los tests de reglas o permisos del proyecto y
anotá el resultado (cuántos pasan y cuáles fallan ya). Un fallo que ya
estaba no es tuyo, pero hay que poder decirlo con el número de antes. Si
no se pueden correr (falta el emulador, faltan dependencias), resolvelo o
decilo; no sigas como si hubieran pasado.

## 3. Tests en los dos sentidos

- Un test por cada celda de la matriz que el cambio toca: el caso
  permitido pasa y el denegado se rechaza.
- **Probá que los tests de bloqueo muerden:** corrélos contra la versión
  vieja de la regla o del código, guardando solo los archivos del cambio
  (por ejemplo, `git stash push -- <archivo>`, nunca un `git stash` de todo
  el árbol, que se lleva cambios ajenos). Tienen que fallar. Si pasan con
  la versión vieja, no están probando el cambio.
- Revisá los tests positivos que ya existían: si alguno usa justo el caso
  que se está cerrando, está validando el hueco. Se corrige, no se borra.
- Si la interfaz lee con una consulta, probá la consulta tal cual la hace
  la interfaz, no solo la lectura de un documento suelto.
- Escapes: un dato de prueba inventado (`"><img src=x onerror=...>`,
  comillas, `</tag>`) en un test o en el navegador, mirando el DOM
  resultante: 0 elementos inyectados y el valor visible igual al original.

## 4. Variantes

Por cada problema que el cambio corrige o encuentra: nombrá la causa raíz,
buscá la misma familia en todo el código y **contá** antes de corregir
("5 `onclick` con el mismo patrón, no 1"). Separá cuáles entran en este
cambio y cuáles quedan registradas (paso 7). Si el patrón se arma en pasos
y un grep no lo encuentra, completá con una prueba real.

## 5. Hallazgo o hipótesis

Cada afirmación del tipo "X puede ver/escribir Y" necesita los cuatro
eslabones, con `archivo:línea` de cada uno:

1. quién controla el dato o la cuenta;
2. por dónde llega: la regla de la base lo permite a esa cuenta (alcanza:
   quien tiene sesión puede consultar la base desde su propio navegador,
   aunque la interfaz no lo pida), o la interfaz lo muestra a quien no
   debería verlo. Si solo la interfaz lo pide y la regla lo rechaza, no
   hay acceso: a lo sumo, una pantalla rota;
3. qué validación falta o falla;
4. qué daño produce.

Con los cuatro, es hallazgo, con gravedad. Si falta uno, es hipótesis, y
se dice qué prueba la confirmaría (un test de emulador, una cuenta de
prueba). Una hipótesis no se registra ni se arregla como hallazgo.

## 6. Deploy cuando cambia un acceso

- **Se cierra un acceso:** primero la interfaz que deja de pedir el dato,
  después la regla. Al revés, la pantalla queda rota entre los dos deploys.
- **Se abre un acceso:** primero la regla, después la interfaz que lo usa.
- **Cambia el modelo** (dato que se mueve a otro documento): código,
  migración de datos en cada ambiente, recién después la regla que cierra
  el lugar viejo.
- Las reglas se deployan en cada ambiente que tenga base propia; cada
  deploy a un ambiente compartido lleva su propia aprobación.
- Las reglas tardan unos minutos en propagarse: una verificación que
  falla justo después del deploy se repite antes de concluir nada.
- Después de cada deploy: el caso denegado que el cambio cierra, con una
  cuenta de prueba de ese ambiente (tiene que fallar), y el caso permitido
  con una sesión real (tiene que andar). Una lectura sin sesión no prueba
  el cambio: casi siempre ya estaba bloqueada.

## 7. Registro

- Lo que el cambio cierra se actualiza en el documento de seguimiento de
  seguridad del proyecto, si hay uno.
- Lo que se encontró de paso y queda fuera del alcance se anota como
  hallazgo abierto o como hipótesis (y en el backlog, si el proyecto
  tiene uno). No se arregla dentro del mismo cambio sin el OK del usuario.
- Nunca datos reales en un hallazgo: mecanismo y ubicación.

## 8. Qué decir al terminar

- La matriz final, con la capa que decide cada celda.
- Tests: número antes y después, cuáles fallan contra la versión vieja y
  cuáles fallaban ya.
- Variantes: cuántas se encontraron, cuántas se corrigieron y dónde quedó
  el resto.
- Hallazgos e hipótesis nuevos, registrados dónde.
- Qué no se pudo verificar (por ejemplo, sin una cuenta de portal real),
  dicho así, no omitido.
