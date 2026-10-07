---
name: hroy-deploy
description: >
  Procedimiento para llevar un cambio a un ambiente compartido (staging o
  producción) y para reaccionar si algo falla después: qué piezas toca y
  en qué proyectos, en qué orden y qué ve el usuario entre un paso y otro,
  condiciones previas (suite, árbol limpio, mismo commit que se probó,
  vencimientos de lo que se va a desplegar), vuelta atrás de cada pieza
  escrita antes, un ambiente por vez con su aprobación, verificar lo
  publicado después de cada paso, el cierre contra lo pedido antes de
  producción y el registro. Usar ante "subilo a staging", "pasalo a
  producción", "deployá", "armá el deploy", "¿en qué orden se sube?",
  "¿cómo vuelvo atrás?", "subimos y ahora no anda", "falló el deploy". No
  es la revisión periódica de lo desplegado (eso es hroy-estado-infra), ni
  medir el impacto del cambio (hbob-impacto-cambio), ni probarlo
  (hduck-prueba-cambio), ni escribir sobre datos reales
  (hgary-cambio-datos).
---

# Deploy

Lo mantiene Roy; lo usa cualquiera. Es de uso general: lo del proyecto
(piezas, comandos, trampas) vive en el catálogo de convenciones (tema de
infraestructura) y en el inventario de infraestructura, si existen. Las
aprobaciones las define el proyecto; esto no las reemplaza ni las junta.

Lo que falla: reglas en un solo proyecto; la pantalla nueva un rato
contra reglas viejas; "salió sin error" como "salió bien"; la vuelta
atrás pensada cuando ya se rompió; a producción sale algo distinto de lo
probado, sin saber qué commit; el cierre olvidado; un rojo que frena sin
salida; y el plan de un cambio de fondo para un color.

Contenido: Proporción · 1. Piezas · 2. Orden · 3. Condiciones previas ·
4. Vuelta atrás · 5. Cada paso · 6. Antes de producción · 7. Si algo
falla después · 8. Registro.

## Proporción

| Pedido | Se entrega |
|---|---|
| Una pieza ya probada en staging, a producción | Pasos 3, 4 (una línea), 5, 6 y 8; plan de 3 o 4 líneas |
| Una pieza nueva a staging | Pasos 1, 3, 4, 5 y 8 |
| Varias piezas, un backfill o una función nueva | Todo, con el orden del paso 2 escrito |
| Algo anda mal después de un deploy | Paso 7 primero; el resto, después |

## 1. Piezas

Del cambio (el diff contra el commit que está publicado, no contra la
memoria de la sesión), qué piezas toca y en qué ambientes vive cada una:
- **Hosting**: los sitios que publican la misma carpeta salen juntos.
- **Reglas de la base**: una vez por proyecto con base propia, con el
  proyecto explícito en el comando.
- **Funciones en la nube**: por proyecto; las nuevas pueden pedir pasos
  manuales en la consola (acceso público, permisos) que la CLI no hace.
- **Scripts en otra plataforma**, tareas programadas, CI: cada uno con su
  forma de publicarse.
- **Datos** (backfill, corrección): una escritura con su procedimiento
  (`hgary-cambio-datos`); acá solo entra su lugar en el orden.

Se lee el inventario para cada pieza; una que no figura se suma (paso 8).
Si el diff da vacío y el pedido dice que hay algo nuevo, se para y se
pregunta dónde está (otra PC, sin commitear, sin pushear).

## 2. Orden

Para cada par de pasos, qué ve un usuario entre uno y otro. Criterios:
- Lo que **habilita** va antes de lo que lo usa: la función antes de la
  pantalla que la llama; la regla que permite un campo, antes de la
  pantalla que lo escribe.
- Lo que **exige** va después de lo que lo cumple: la regla que pide un
  campo, después del backfill que lo carga.
- Lo que **cierra un acceso** va después de la pantalla que deja de
  usarlo (`hjulia-revision-cambio`).
- Las pestañas abiertas siguen con la versión anterior hasta recargar,
  aunque sea por días: un estado intermedio más.

Se escribe el orden con su motivo en una línea por paso. El orden es el
mismo en staging y en producción; staging va completo primero.

## 3. Condiciones previas

Antes de cada ambiente:
- **Suite** según lo que pida el proyecto. Si un rojo la traba (aunque
  sea ajeno y conocido), se propone como paso concreto, con su
  aprobación, lo que el proyecto prevé (arreglarlo o cuarentena ligada a
  su ítem, `hduck-test-en-rojo`): ni se deploya en rojo ni se frena sin
  salida. Las piezas con suite propia (funciones, reglas) se prueban aparte.
- **Commit hecho y nada sin commitear en lo que se publica**, antes del
  deploy: se publica la copia de trabajo, no el commit. Cambios ajenos en
  otros archivos se avisan.
- **Versión** subida si la pieza la lleva, con lo que arrastra.
- **Vencimientos**: un runtime o dependencia con baja anunciada en lo que
  se despliega se dice antes (si falla a mitad, deja ambientes distintos).
- **Credenciales**: un login necesario se dice antes; lo hace el usuario.

## 4. Vuelta atrás

Escrita antes del primer comando, por pieza: cómo se vuelve (acción o
comando), quién puede hacerlo, cuánto tarda, y qué **no** vuelve: datos
escritos por un backfill o con la versión nueva, reglas viejas frente a
datos con la forma nueva, pestañas que ya cargaron la versión nueva.
Deployar el commit anterior no saca una pieza nueva (una función): se
borra. Un paso sin vuelta atrás (escribir sin respaldo) se nombra como
punto de no retorno en el pedido de aprobación.

## 5. Cada paso

- **Un ambiente por vez**, con la aprobación que pida el proyecto. Una
  aprobación no se extiende al ambiente siguiente; con varias piezas, el
  pedido dice si se aprueban juntas o una por una.
- El commit va en el mensaje del deploy si la plataforma lo guarda; si
  no, en el registro.
- Si un control de la sesión bloquea el comando o pide credenciales, se
  le pasa al usuario el comando exacto y se confirma leyendo su salida.
- **Después de cada paso**, se verifica lo publicado antes del siguiente:
  versión servida (sin caché), función activa con el runtime esperado,
  reglas publicadas (salida del comando o fecha en la consola). Un
  comando sin error no es la verificación.
- Si un paso falla o no verifica, se para y se le cuenta al usuario, con
  la vuelta atrás del plan; no se improvisa un arreglo encima.

## 6. Antes de producción

Después de staging, el usuario prueba y lo confirma; que los tests pasen
no es eso. Antes de pedir el OK de producción:
1. **Cierre contra lo pedido**: lo construido contra los criterios
   originales del pedido o del ítem (no contra lo que quedó al
   implementar), y la aprobación explícita de quien verificó. Si el
   proyecto tiene un protocolo de cierre, es ese, con su nivel liviano.
2. **Mismo commit** que se probó; en el medio, solo la versión o docs
   que no se publican (registro), y se dice cuáles.
3. **Lo publicado en staging es lo aprobado**: una línea que lo compruebe
   (versión o contenido servido; funciones, fecha contra el commit).
4. Pedido de aprobación propio, con commit, piezas, orden y vuelta atrás.

## 7. Si algo falla después

1. **Qué salió**, leído (historial de versiones, salida del deploy,
   registro), no supuesto: qué piezas, en qué ambiente, a qué hora.
2. **Volver atrás primero** si el problema empezó con el deploy: se
   propone la vuelta atrás de la pieza más probable, con su aprobación.
3. Después, la causa (estado intermedio, pestañas viejas, datos escritos
   por la versión nueva): hallazgo con evidencia o hipótesis con el dato
   que la confirmaría. Lo que la vuelta atrás no deshace se revisa aparte
   (datos: `hgary-cambio-datos`).

## 8. Registro

En la bitácora, por ambiente: commit, piezas, hora, verificación y quién
aprobó. El inventario, en el mismo commit si cambió algo de lo que lista
(pieza, runtime, sitio). Lo que quedó fuera, al backlog con evidencia.

Pedido de aprobación:

```
Ambiente: <staging / producción>. Commit: <hash>; nada sin commitear en lo publicado.
Piezas y orden: <pieza → pieza, con el motivo en una línea>.
Entre pasos: <qué ve un usuario; pestañas abiertas>.
Previo: <suite; versión; vencimientos; credenciales>.
Vuelta atrás: <por pieza; qué no vuelve; punto de no retorno si hay>.
Cierre (solo producción): <criterios; quién aprobó; staging = lo aprobado>.
```
