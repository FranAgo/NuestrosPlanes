# REQ-MEDIA-008 — Subir varias fotos a la vez, numeradas en orden y ordenadas por hora de captura

> **Estado:** HECHO (2026-10-07)
> **Historia:** PROPUESTO (2026-10-06), desde BL-045. Franco eligió la opción A (bloqueo corto y 3 subidas a la vez), con reserva de números por grupo y orden por hora de captura (b), después de la medición del paso 0. EN DESARROLLO el 2026-10-06. HECHO el 2026-10-07: implementado y verificado en test (ver Verificación).
> **Versión:** 1.9.0
> **Nivel:** cambio de fondo (toca `Code.gs` e `index.html`, un lock que comparten todas las escrituras y una columna nueva en `Archivos`).
> **Dueño técnico:** Bob (servidor) + Jay (front) · **DBA:** Gary · **AppSec:** Julia · **Infra:** Roy · **QA:** Duck · **PM:** Paul

## Problema

Franco (2026-10-06): "si quiero subir 16 fotos que se suban de a una por una
es algo lento".

Medición del 2026-10-06 (paso 0, proyecto de test, desde la PC de Franco,
16 fotos de ~550 KB, funciones `medirBL045_*` de `Tests.gs`):

| Cómo | Total | Por pedido |
|---|---|---|
| De a una (como hoy) | 113 s | 5 a 10 s |
| 3 a la vez, servidor sin cambios | 69 s | 10 a 15 s, y 1 de 16 con 500 |

Adentro del servidor cada foto tarda ~4,3 s, todo con el `ScriptLock`
tomado: `createFile` ~1,8 s, `setDescription` ~0,8 s, `insertArchivo`
~0,3 s, leer la fila, `getFolderById` y `contarArchivosEnCarpeta` ~0,6 s.
Con 3 a la vez el total da 16 × 4,3 s: el lock las serializa igual.

Hallazgo de Julia: el `ScriptLock` es uno solo para todo el script. Lo usan
también `crearSesion` (login), completar, reabrir, acuerdos, cambiar la
fecha de una foto y otras escrituras, con `waitLock(10000)`. Una subida
larga de una persona puede hacer fallar con 500 lo que hace la otra al
mismo tiempo, aunque sea iniciar sesión. Pasa hoy en prod.

## Qué se pide (Franco, 2026-10-06)

1. **Subir de a 3 a la vez.** Cada foto sigue mostrando su estado y se
   reintenta a mano, como hoy (sin reintento automático: una escritura
   repetida duplica la foto).
2. **Bloqueo corto en el servidor.** Bajo el lock queda solo lo que evita
   choques: leer la fila de la tarea, resolver o crear su carpeta, reservar
   los números de archivo y anotar la fila en `Archivos`. Crear el archivo
   en Drive y escribir su descripción van afuera.
3. **Reserva de números por grupo.** Las fotos de una misma subida quedan
   numeradas en Drive en el orden de la selección, lleguen en el orden que
   lleguen. Dos subidas a la vez a la misma tarea (los dos subiendo) nunca
   repiten un número.
4. **Orden por hora de captura.** La app guarda la hora en que se sacó cada
   foto (EXIF, leída en el navegador como ya se lee el día) y ordena "Ya
   subidas" y el visor por día y, dentro del día, por hora. Las fotos sin
   hora van después, en orden de subida.

## Aportes

- **Bob (contratos):** `uploadPlanPhotos` suma campos opcionales: por pedido
  `loteId`, `posicion` y `totalLote`; por archivo `horaContenido`. Un front
  viejo que no los manda sigue andando (un número por archivo, como hoy). Si
  vienen mal formados, 400 sin escribir nada. `getFotosPlan` devuelve
  `horaContenido` (o `null`). Ninguna acción nueva. El número sale de un
  contador por carpeta en Script Properties (`fotos-sig:<carpetaId>`),
  tomado bajo el lock como `max(contador, archivos en la carpeta + 1)`: así
  dos subidas que todavía no crearon sus archivos no calculan el mismo. La
  reserva del grupo vive en `CacheService` (6 h); si se perdiera a mitad de
  grupo, la foto toma un número nuevo (queda fuera de orden, no repetida).
  Otros lectores del criterio "fotos de la tarea" (`contratos.md` §6) no
  cambian. `getRecuerdos` sigue ordenando como hoy (fuera de alcance).
- **Gary (datos):** columna nueva `hora_contenido` al final de `Archivos`
  (`ARCHIVOS_HEADERS` + `ensureColumn` en `setupSheets`), texto `HH:MM:SS` o
  vacío. Se escribe con apóstrofo para que Sheets no la convierta en hora
  (las horas de 1899 traen corrimientos de zona). La escribe solo
  `insertArchivo`; la lee `getFotosPlan`. Las filas viejas quedan vacías: no
  hay migración. Orden de deploy: `clasp push`, `setupSheets`, recién
  después `version` + `redeploy` (`datos.md` §1). `docs/modelo-datos.md`
  suma la columna.
- **Julia (seguridad):** la hora sale del mismo bloque EXIF que ya se lee
  (`DateTimeOriginal`/`DateTimeDigitized`); no se lee GPS ni nada más. El
  servidor valida el formato y la descarta si la fecha no quedó como
  `captura`. `loteId` se valida con un patrón corto y entra en la clave de
  caché junto con el `planId` y el id de la planilla. El lock corto cierra el
  500 cruzado del login. Matriz sin cambios: la acción ya exige sesión.
- **Jay (front):** `subirFotosPlan` con 3 trabajadores; cada foto lleva su
  posición en el grupo. `leerFechaCaptura` devuelve también la hora. La hora
  se manda solo si la fecha es de captura (si se corrigió a mano antes de
  subir, no). Orden de "Ya subidas": día, hora (las que tienen primero),
  fecha de subida. Sin pantalla nueva: se ven hasta 3 filas "Subiendo…" a la
  vez.
- **Roy (deploy):** servidor primero (con `setupSheets` antes del
  `redeploy`) y después el front. El front viejo funciona con el servidor
  nuevo. Vuelta atrás: `redeploy` a la versión 35 y revert del front; la
  columna nueva puede quedar.

## Criterios de aceptación

1. 16 fotos de ~550 KB contra el Web App de test, de a 3, en menos de 45 s,
   sin errores.
2. Dentro del servidor, el lock se tiene menos de ~1,5 s por foto (sin
   `createFile` ni `setDescription` adentro).
3. Las fotos de un grupo quedan numeradas en Drive en el orden de su
   posición aunque lleguen desordenadas. Dos grupos intercalados sobre la
   misma tarea no repiten números.
4. Un pedido sin `loteId` (front viejo) sube como hoy, con número único.
   `loteId`, `posicion` o `totalLote` mal formados: 400 y nada escrito.
5. `hora_contenido` se guarda como texto `HH:MM:SS` y `getFotosPlan` la
   devuelve igual. Una hora inválida, o una foto cuya fecha quedó `subida`,
   se guarda vacía.
6. "Ya subidas" y el visor ordenan por día, hora y fecha de subida.
7. Front: cada foto muestra su estado; cerrar el modal a mitad corta las que
   faltan; un error de una no frena a las otras; reintentar sube solo las
   fallidas. 375 y 1366 sin desborde, consola limpia.
8. Regresión de `Tests.gs` en verde; el test nuevo falla contra el
   `Code.gs` de 1.8.1.

## Cambios durante el desarrollo (2026-10-06/07)

- **Fotos inválidas sin número.** La regresión dio rojo en
  `probarMEDIA002` C10 (`0001,0003` en vez de `0001,0002`): la reserva le
  daba número a un archivo inválido en el medio de un pedido. Bob: tipo y
  contenido se validan antes de reservar, y solo las válidas toman número.
  En una subida en grupo, una posición que falla deja un hueco (no repite).
- **Tarea borrada a mitad de la subida (Duck).** Con Drive fuera del lock,
  la ventana en que el otro borra la tarea mientras se suben sus fotos pasó
  de milisegundos a ~3 s por foto (BL-039). Bob: en el segundo tramo, bajo
  el lock, se vuelve a mirar la tarea; si se borró, las filas se anotan
  `archivado` y la respuesta lo informa como error. Queda la ventana mínima
  de BL-039 (borrar no toma el lock). Seam de test:
  `ANTES_DE_REGISTRAR_FOTOS_OVERRIDE` (en la app, siempre `null`).
- Franco (2026-10-07) aceptó que, entre las fotos sin hora del mismo día,
  el orden sea el de llegada al servidor (una que tarda más puede quedar
  después).
- Script Properties suma una clave `fotos-sig:<carpetaId>` por tarea con
  fotos subidas desde 1.9.0 (~60 bytes cada una; el tope es 500 KB).

## Verificación (2026-10-07, proyecto de test, sin pedidos a prod)

- `probarMEDIA008` (33 casos): contra el `Code.gs` de 1.8.1, 25/29 FAIL (el
  test muerde); los 4 casos de tarea borrada a mitad (D1) fallan 4/4 con el
  chequeo anulado (mutante); con el código nuevo, 33/33 en 3 corridas.
- Regresión en test: DATA002 70/70, MEDIA001 22/22, MEDIA002 43/43, BL015
  12/12, BUGLOGIN001B 38/38, PLAN001 44/44, PLAN002 26/26, PLAN003 39/39,
  MEDIA003 36/36, MEDIA004 21/21, MEDIA005 59/59, PERF004 22/22,
  BUGCARGA001 9/9, BUGFECHA001 21/21, Parche181 43/43.
- De punta a punta contra el Web App de test (@11), desde la PC de Franco,
  16 fotos de ~550 KB de a 3 con grupo: 40,1 s y 41,3 s, sin errores (antes
  113 s de a una). Cada tarea quedó con 0001 a 0016 sin repetidos aunque
  las filas llegaron desordenadas. Durante la segunda corrida, 6
  `updatePlan` sobre otra tarea tardaron 2,0 a 3,6 s y dieron 200 (antes, un
  500 por espera del lock).
- Front en 127.0.0.1 con `fetch` simulado: nunca más de 3 subidas a la vez;
  7 fotos en ~6 s contra ~13 s de a una con la misma demora; una con 500 no
  frena a las demás y el reintento sube solo esa, en un grupo nuevo; cerrar
  a mitad corta las 4 que esperaban y deja terminar las 3 en curso; la hora
  se lee del EXIF (5 casos: con hora, con cero adelante, hora inválida, sin
  hora, fecha futura) y se manda solo con fecha de captura; "Ya subidas"
  ordena día → hora → sin hora por subida. 375 y 1366 sin desborde, consola
  limpia.

## Fuera de alcance

- Subir en segundo plano para seguir usando la app (opción C de BL-045).
- Varias fotos por pedido (opción B).
- Ordenar el carrusel de recuerdos por hora.
- Completar `hora_contenido` en las fotos ya subidas.
