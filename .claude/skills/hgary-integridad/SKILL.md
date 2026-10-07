---
name: hgary-integridad
description: >
  Procedimiento para revisar la integridad de los datos guardados sin
  escribir nada: una pregunta concreta antes de correr, el criterio
  contrastado con lo que la app escribe hoy, el ruido esperado aparte, un
  dato seguido de punta a punta (ambiente de prueba antes que la base real), tamaño
  y ritmo de un documento, y un reporte que separa hallazgo de hipótesis
  y medición de estimación. Usar ante datos
  huérfanos, referencias rotas, copias desincronizadas, algo que
  desapareció o volvió a aparecer, un chequeo periódico o uno viejo que
  dio demasiados casos, y ante "¿por qué quedó este dato colgado?", "¿hay
  más casos así?", "repetí el chequeo", "¿cuánto falta para el límite?".
  No corrige datos (eso es hgary-cambio-datos), ni busca el impacto de un
  cambio de código (hbob-impacto-cambio), ni quién puede ver qué
  (hjulia-revision-cambio).
---

# Integridad de los datos

Lo mantiene Gary; lo usa cualquiera. Es de uso general: lo del proyecto
(referencias, chequeos ya escritos, comandos) vive en el catálogo de
convenciones (tema de datos) y en el mapa de datos, si existen.

Lo que falla: una pregunta vaga que devuelve cientos de casos; un chequeo
repetido tal cual cuando la app ya escribe otra cosa; un mecanismo
posible contado como la causa; números inventados con tres decimales; y
"aprovechar" para corregir en el mismo paso.

Contenido: Proporción · 1. La pregunta · 2. El criterio contra la app ·
3. Dónde se mira · 4. De punta a punta · 5. Tamaño y ritmo ·
6. Reporte · 7. Si se va a repetir.

## Proporción

| Pedido | Se entrega |
|---|---|
| Un caso puntual ("volvió este registro") | Ambiente y cuenta del caso; pasos 3 y 4, reporte |
| Un chequeo de muchos documentos | Pasos 1, 2, 3 y 6; el 7 si se va a repetir |
| Tamaño o límite | Paso 5 y reporte; el script de medición, como el del 7 |

Se reproduce en el ambiente de prueba lo justo para separar hallazgo de hipótesis:
la prueba que confirma cada eslabón, no una batería. Si la causa es un bug
de código, el arreglo y sus tests son otro cambio.

## 1. La pregunta

Antes de escribir una consulta, una frase: qué tiene que cumplirse
(ninguna cobranza apunta a una factura que no existe), en qué colección,
en qué rango (clientes, fechas, ambiente). Y dos listas:
- qué cuenta como caso;
- qué casos son legítimos y se esperan (datos de antes de un cambio,
  formas viejas, clientes que no usan esa función). Se excluyen en la
  consulta o se cuentan aparte. Si no sale la frase, se pregunta.

## 2. El criterio contra la app

Antes de correr un chequeo, sobre todo uno que ya existe: lo que busca
(un texto de auditoría, un campo, un formato) ¿es lo que la app escribe
hoy, y con la misma estructura (un campo que pasó a ser una lista, el
dato repetido en otro lugar)? Se lee la función que lo escribe y su
historia en el control de versiones. Un criterio viejo da un cero ciego,
que parece buena noticia, o casos falsos que esconden los reales.

Un chequeo encuentra lo que quedó (referencias colgadas, copias
distintas). Lo que ya no está (si algo se borró, quién, cuándo) solo se
prueba contra una auditoría o un respaldo; y leer un respaldo es
restaurarlo a una base aparte: infraestructura, con su aprobación.

## 3. Dónde se mira

1. **Código y reglas**: qué debería pasar.
2. **Ambiente de prueba** (emulador, proyecto de test) con datos armados: qué pasa, con la cuenta y los permisos
   del caso real.
3. **Base real, solo lectura**, con el proyecto explícito y el OK del
   usuario para ese ambiente: cuántos casos hay. Si tiene datos personales (también un
   ambiente de prueba con copia de los reales), el detalle va a un
   archivo fuera del repo y al chat solo el resumen.

Nunca se escribe sobre una base compartida para investigar.

## 4. De punta a punta

Para algo que desapareció, volvió o quedó colgado, se sigue el dato por
cada lugar que lo toca:
- quién lo escribe y quién lo borra, por todas las pantallas y scripts;
- qué reglas aplican a cada parte del borrado o la escritura (una parte
  que la cuenta no puede leer o borrar puede hacer fallar el resto);
- qué lo puede recrear después: una pestaña abierta que guarda lo que
  tenía en memoria, un guardado que ante "no existe" crea el documento,
  una copia que se reconstruye desde la fuente;
- qué ve el usuario cuando algo de eso falla.

Cada eslabón con su evidencia (`archivo:línea`, reproducción en el ambiente de prueba). Lo
que no se pudo reproducir queda como hipótesis, con el dato que la
confirmaría. Si hay dos caminos posibles, se dicen los dos. Un mecanismo
probado es hallazgo; que este caso haya pasado así es hipótesis hasta
leer el dato del caso.

## 5. Tamaño y ritmo

Para un documento que crece (arrays que suman por evento):
- **Medido**: el tamaño de un documento real (pedido o leído) o de uno
  armado en el ambiente de prueba con la forma real, contra el límite de la base.
- **Ritmo**: eventos por mes, sacados de los datos (fechas de la
  auditoría) o dichos como supuesto, con el número usado.
- **Estimado**: cuánto falta, con la cuenta a la vista, redondeado y
  dicho como estimación, nunca con la precisión de una medición.
- Si queda poco margen: opciones (subcolección, entradas más chicas) y
  quién decide. No se implementa acá.
- Escrituras: si un documento se escribe más seguido de lo que la base
  sostiene, con qué evento pasa.

## 6. Reporte

```
Pregunta: <qué tiene que cumplirse, dónde, en qué rango>.
Criterio: <contrastado con la app hoy: sí / qué cambió>.
Resultado: <N casos que piden acción; M esperados, por qué>.
Causa: <hallazgo, con evidencia / hipótesis, y qué la confirmaría>.
Medido / estimado: <cada número con de dónde sale>.
Qué sigue: <corrección de datos (hgary-cambio-datos) / backlog / nada>.
Leído: <ambiente de prueba / staging / producción, solo lectura>.
```

En un caso puntual, Criterio y Resultado se omiten. Si el bug ya tiene
ítem en el backlog, va una nota ahí. Corregir datos sigue
`hgary-cambio-datos`, con su propia aprobación.

## 7. Si se va a repetir

Un chequeo que se va a volver a correr se guarda como script: solo
lectura (no usa nada que escriba), proyecto obligatorio sin valor por
defecto, la pregunta y los casos esperados escritos arriba, resumen en
pantalla y detalle en un archivo fuera del repo. Se prueba en el ambiente de prueba
con un caso que debe aparecer y uno esperado que no debe contarse
(cuánto más, `hduck-prueba-cambio`). Al repetirlo, el paso 2 otra vez.
