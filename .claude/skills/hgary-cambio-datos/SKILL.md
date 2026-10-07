---
name: hgary-cambio-datos
description: >
  Procedimiento para cambiar la forma de datos ya guardados o escribir
  sobre la base real: cuánto entregar según el pedido, quién lee el campo
  y qué hace si falta, pasos compatibles (agregar, migrar y recién después
  sacar), script con simulación por defecto e idempotente, respaldo
  verificado y vuelta atrás escrita antes, un ambiente por vez con su
  aprobación, chequeo después y mapa de datos al día. Usar al sumar un campo
  que otros leen, migrar o hacer un backfill, sacar un campo viejo,
  corregir datos guardados mal, borrar en masa o frenar una baja, y ante
  "¿hace falta migrar?", "corré este script sobre producción", "corregí
  los datos que quedaron mal", "sacá este campo". No es un chequeo de solo
  lectura (eso es hgary-integridad), ni quién calcula el dato
  (hbob-impacto-cambio), ni quién puede escribirlo
  (hjulia-revision-cambio).
---

# Cambio de datos

Lo mantiene Gary; lo usa cualquiera. Es de uso general: lo del proyecto
(copias, scripts, comandos, respaldos) vive en el catálogo de
convenciones (tema de datos) y en el mapa de datos, si existen.

Lo que falla: "no hace falta migración" sin nombrar lectores; código y
datos arreglados en el mismo cambio; un respaldo dado por hecho porque el
comando no tiró error; una vuelta atrás que solo cubre el camino feliz;
el mapa de datos "para después"; y un script con quince tests cuando se
pidió un plan.

Contenido: Proporción · 1. Qué cambia · 2. Lectores · 3. Pasos
compatibles · 4. El script · 5. Antes de escribir · 6. Después ·
7. Reporte.

## Proporción

El nivel de proceso lo decide el proyecto; esto es cuánto se entrega.

| Pedido | Se entrega |
|---|---|
| Campo nuevo que todos toleran ausente | Pasos 1, 2 y 6; sin script |
| Plan o "¿hace falta migrar?" | Pasos 1 a 3 y el esqueleto del 4 y del 5; sin código de script ni tests |
| Sacar un campo | Conteo de solo lectura primero (`hgary-integridad`); si no queda ninguno, solo el paso 3 |
| Freno de bajas | Pasos 1 a 3; sin script |
| Escribir sobre datos reales | Todo, con el script y sus tests |

Los tests del script prueban qué documento toca y con qué valor; cuántos,
lo dice `hduck-prueba-cambio`. Un test de la función no prueba el script:
la simulación contra una base de verdad (emulador, staging o proyecto de test) sí.

## 1. Qué cambia

Una línea: forma de antes → forma de después, en qué colección, cuántos
documentos tienen la forma vieja (leído o estimado, y se dice cuál). Si
el cambio también arregla un cálculo, eso es otro cambio
(`hbob-impacto-cambio`), que va primero: los datos se corrigen con la
fórmula ya arreglada y desplegada. Se verifica en el código, no se da por
hecho; si no está desplegado en todos los ambientes, la corrección espera.

## 2. Lectores

Antes de decidir nada, quién lee el campo y qué hace si falta o tiene la
forma vieja: pantallas y el código que normaliza al cargar; reglas (un
campo ausente leído sin valor por defecto hace fallar la regla);
consultas a la base (un filtro o un orden por el campo deja afuera a los
documentos que no lo tienen), anotadas aparte de los filtros en memoria;
tests, fixtures, scripts y exportaciones; copias del dato y quién las
arma; piezas con deploy propio. Con la lista se decide:
- **Valor por defecto al leer**, sin tocar los datos: si todos los
  lectores toleran la ausencia y ninguna consulta ni regla depende del
  campo.
- **Backfill**: si una consulta o una regla depende del campo, o el
  campo decide acceso. Para un dato que decide acceso, el cruce es exacto:
  un caso ambiguo queda sin resolver y en el reporte, no se adivina.

No se crea el campo vacío en cada guardado "por las dudas". Que no
aparezcan lectores vale si se buscó en toda la lista; si no, se dice dónde.

## 3. Pasos compatibles

La forma nueva convive con la vieja mientras dure el cambio:
1. **Agregar:** el código escribe lo nuevo y lee los dos.
2. **Migrar:** los datos existentes, con el script, por ambiente.
3. **Contraer:** recién cuando ningún lector usa lo viejo (búsqueda de
   lectores repetida, y la versión que ya no lo lee desplegada en todos
   los ambientes), se saca del código (cambio aparte, con la prueba de
   que quedó muerto) y después de los datos. Si la migración dejó
   documentos sin resolver, no se contrae.

Se escribe el orden entre script, reglas y app: una regla que exige el
campo va después del backfill; una que deja de exigirlo, antes de
sacarlo. Las reglas se despliegan en cada proyecto que tenga base propia.

Un freno de bajas es un cambio de este tipo: lista de todo lo que
referencia al documento (no solo la colección obvia), si el freno mira
datos que la cuenta que borra tiene descargados, y si hace falta en las
reglas (que no pueden buscar en otros documentos: en la base el freno es
limitar quién borra, o una función en la nube). Los huérfanos que ya existen se buscan aparte
(`hgary-integridad`). Cambia lo que el usuario puede hacer: se confirma
con quien decide el producto.

## 4. El script

- **Simulación por defecto**; escribe solo con un parámetro explícito.
- **Proyecto obligatorio**, sin valor por defecto.
- **Idempotente**: correrlo dos veces deja lo mismo; lo ya migrado se
  saltea y se cuenta.
- **Reusa la fórmula que ya existe.** Si no puede importarla y la copia,
  un test compara la copia contra la original con los mismos datos. Si
  la fórmula da distinto según quién la corre (permisos, datos que la
  sesión no ve), eso se resuelve antes: el script no elige una vista.
- **Guarda los valores anteriores** de cada documento que toca, en un
  archivo fuera del repo, y trae un modo que los repone.
- **No pisa una edición que entró mientras corría:** relee el documento
  justo antes de escribir, o escribe con una precondición sobre su última
  modificación; si cambió, lo saltea y lo reporta.
- **Reporte:** leídos, cambia, saltea (por qué) y los no resueltos.
- Tandas dentro del tope de escrituras por lote de la base, y la API
  vigente del SDK que usa el resto de los scripts.

## 5. Antes de escribir

Por ambiente: primero el de prueba, después producción. Cada escritura
real lleva su propia aprobación, aunque la anterior haya salido bien.
1. Simulación corrida y su reporte revisado con el usuario (con datos
   personales: detalle en un archivo fuera del repo, resumen al chat).
2. **Respaldo terminado y verificado**: no alcanza con que el comando de
   export no tire error (es asincrónico). Se confirma el estado de la
   operación con el comando del catálogo y se anota dónde quedó.
3. **Vuelta atrás escrita** antes de correr, en dos niveles:
   - el modo del script que repone los valores anteriores;
   - si eso no alcanza (el script falló a mitad, tocó de más), cómo se
     traen esos documentos del respaldo: qué respaldo, si se restaura a
     una base aparte y desde ahí se copian, y qué se pierde de lo escrito
     entre el respaldo y la vuelta atrás.
4. Si hay datos personales, el archivo de valores anteriores también los
   tiene: dónde queda y cuándo se borra.

## 6. Después

- **Chequeo de solo lectura** que cuente: migrados, salteados, sin
  resolver, y que no haya documentos tocados de más. En la app, un caso
  migrado y uno salteado se ven bien.
- **Mapa de datos**: si cambió una colección, una copia, una referencia o
  un documento que crece, o la búsqueda de lectores encontró algo que el
  mapa no dice, se corrige en el mismo commit; si no, se dice "sin cambios
  en el mapa". Es un paso, no un "después".
- Lo no resuelto y lo ajeno al alcance, al backlog con evidencia.

## 7. Reporte

```
Cambia: <forma antes → después; colección; N documentos (leído/estimado)>.
Lectores: <lista; los que no toleran la forma vieja>.
Decisión y pasos: <defecto al leer / backfill; orden de script, reglas, app>.
Simulación: <ambiente; leídos, cambia, saltea, sin resolver>.
Respaldo y vuelta atrás: <operación terminada; modo del script; desde el respaldo>.
Aprobaciones: <prueba / producción: sí o pendiente>.
Después: <chequeo; mapa actualizado / sin cambios>.
```

En un campo nuevo que todos toleran, las mismas cosas en 2 o 3 líneas.
