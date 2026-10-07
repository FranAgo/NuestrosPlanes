# REQ-DATA-003 — Respaldo diario de la planilla y copia física de las fotos

> **Estado:** HECHO (2026-10-07)
> **Origen:** BL-040
> **Historia:** PROPUESTO (2026-10-07), al priorizar BL-040. Franco eligió copia diaria con retención abuelo-padre-hijo (7 diarias, 4 semanales, 12 mensuales y una por año sin tope), incluir `Auditoria`, y para las fotos A + B + C (papelera de Drive, copia propia dentro de Drive y exportación de Takeout bajada a un disco). Después sacó B: la app nunca borra archivos de Drive y Noelia solo tiene lectura, así que B solo cubría un borrado a mano no notado en 30 días, a cambio del doble de espacio; la pérdida de la cuenta la cubre C. Pidió C cada dos semanas en vez de trimestral. EN DESARROLLO el 2026-10-07. HECHO el 2026-10-07: implementado y verificado en test (ver Verificación). Decisión: DEC-026.
> **Versión:** 1.11.0
> **Nivel:** cambio de fondo (trigger nuevo en prod, datos personales en las copias).
> **Dueño técnico:** Bob (servidor) · **DBA:** Gary · **Infra:** Roy · **AppSec:** Julia · **QA:** Duck · **PM:** Paul
> **Datos sensibles:** sí. Las copias tienen todos los datos de la app (Ley 25.326): la carpeta de respaldos no se comparte con nadie.

## Problema

Hoy no hay copia propia de la planilla ni de las fotos (`docs/infra/inventario.md`
§4): solo el historial de versiones de Sheets y la papelera de Drive (30
días), dentro de la misma cuenta, y nunca se probó una restauración. Un
bug que escribe mal, un borrado que nadie nota en un mes o la pérdida de la
planilla no tienen vuelta atrás.

## Qué se pide

1. **Copia diaria de la planilla.** Un trigger diario (04:00, hora
   Argentina) copia la planilla a la carpeta `Respaldos <nombre de la
   planilla>` de la Drive del dueño, fuera de la carpeta de fotos, con el
   nombre `Respaldo AAAA-MM-DD HHmm`. La copia no lleva la hoja `Sesiones`
   (hashes de tokens, no hace falta para restaurar); sí `Auditoria`.
2. **Verificada.** Después de copiar, compara la cantidad de filas de cada
   hoja de la copia con la del original. Si no coincide, la copia mala va a
   la papelera y el respaldo falla.
3. **Rotación abuelo-padre-hijo.** De las copias con ese nombre quedan: la
   más nueva de cada uno de los últimos 7 días, de las últimas 4 semanas,
   de los últimos 12 meses y de cada año (sin tope). Las demás van a la
   papelera (30 días más de margen). Un archivo de la carpeta con otro
   nombre no se toca.
4. **Las fotos no se copian dentro de Drive.** La app nunca borra archivos
   de Drive (borrar una tarea solo archiva sus filas) y Noelia tiene solo
   lectura: para un borrado a mano queda la papelera de Drive (30 días).
5. **Aviso si falla.** Cualquier falla (copia que no coincide, carpeta de
   respaldos en la papelera) hace fallar la ejecución: Google le manda al dueño el aviso de fallas del
   trigger. Sin permisos nuevos.
6. **Restauración escrita y probada** (planilla): procedimiento en
   `docs/infra/inventario.md` §4, ensayado en la suite.
7. **Copia física cada dos semanas, sin código:** Franco pide en Google
   Takeout la exportación de Drive (carpeta de fotos y planilla) y la baja a
   un disco suyo. Cubre la pérdida de la cuenta. Takeout solo programa cada
   2 meses, así que es a mano. Procedimiento en `docs/infra/inventario.md` §4.

Fuera de alcance: copia automática de las fotos (se vuelve a pensar si la
app empieza a borrar archivos de Drive, por ejemplo con BL-009); copias
automáticas fuera de la cuenta de Google.

## Aportes

- **Bob:** no cambia ningún contrato ni el `doPost`. Funciones sueltas,
  como `purgarSesiones`: `respaldoDiario` (la del trigger),
  `respaldarPlanilla`, `elegirRespaldosAConservar`
  (pura, para probar la rotación sin Drive), `instalarTriggerRespaldo` y
  `estadoRespaldos` (solo lectura).
- **Gary:** restaurar es apuntar `SPREADSHEET_ID` a una copia **de** la
  copia (nunca a la copia misma, para que el respaldo siga intacto) y
  correr `setupSheets`, que vuelve a crear `Sesiones` vacía: las dos
  personas tienen que volver a entrar. `Archivos` guarda los IDs de Drive,
  así que las fotos siguen andando mientras los archivos existan. La
  verificación por conteo tolera que la app escriba durante la copia: la
  cantidad de la copia tiene que quedar entre la de antes y la de después.
- **Roy:** los permisos (`drive`, `script.scriptapp`) ya están en
  `appsscript.json`. Deploy: push, version, redeploy y `clasp run
  instalarTriggerRespaldo` en prod, cada uno con OK. El trigger corre como
  Franco.
- **Julia:** la carpeta de respaldos se crea en la raíz de la Drive del
  dueño, no dentro de la carpeta de fotos (que está compartida con
  Noelia como lectora): no hereda ese permiso. Sin `Sesiones` en las
  copias. Los mensajes de error nombran hojas, nunca datos. La descarga de
  Takeout tiene todas las fotos y la planilla: va a un disco de Franco, no
  a un pendrive suelto.
- **Duck:** `probarDATA003` contra una planilla y una carpeta scratch:
  rotación con 400 días de copias, copia sin `Sesiones` y con los mismos
  conteos, copia que no coincide (va a la papelera y falla), restauración
  completa, trigger único.

## Criterios de aceptación

1. `respaldarPlanilla` deja en la carpeta una copia `Respaldo AAAA-MM-DD
   HHmm` (hora Argentina) sin `Sesiones` y con la misma cantidad de filas
   que el original en cada otra hoja; el original no cambia.
2. Si los conteos no coinciden, la copia queda en la papelera y la función
   tira un error.
3. Con una copia por día durante 400 días, la rotación deja 20: los
   últimos 7 días, 2 domingos más, 11 fines de mes y nada más viejo que 12
   meses salvo una por año; un archivo con otro nombre queda.
4. Restaurar (copia de la copia + `setupSheets`) devuelve las mismas tareas
   y categorías que el original y una hoja `Sesiones` vacía.
5. `respaldoDiario` (la del trigger) copia la planilla y tira un error si
   la copia falla.
6. `instalarTriggerRespaldo` deja un solo trigger diario de
   `respaldoDiario`, aunque se corra dos veces.

## Verificación (2026-10-07, proyecto de test, sin pedidos a prod)

- `probarDATA003` con el `Code.gs` anterior (commit c48741e): 1 FAIL ("faltan
  las funciones de respaldo"). Con el nuevo: 51/51 APTO, 3 corridas.
- Primera corrida con el código nuevo: 48/51, los 3 rojos de la prueba y
  no del código. `getFilesByName` no devuelve archivos que están en la
  papelera: V1 se mira por ID. En D2, una fila en blanco no cambia
  `getLastRow` y no rompía la copia: se usa la misma rotura que en V1. E1
  era consecuencia de D2.
- Mutante (la verificación por conteo siempre da OK): 44/51, 7 FAIL (V1 ×3,
  Q1, D2 y E1 por la copia mala que quedó), detectado.
- Criterios 1 a 6: grupos P, V, G y Q, X, D y T de la suite.
- No se puede probar en test: el mail de fallas del trigger (lo manda
  Google) ni la hora real de corrida. Se confirman en prod el día siguiente
  al deploy con `estadoRespaldos` y `listarTriggers`.
