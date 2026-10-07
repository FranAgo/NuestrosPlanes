---
name: hroy-estado-infra
description: >
  Procedimiento de solo lectura para saber qué está corriendo de verdad y
  qué va a vencer: lo desplegado contra el repo (hosting, reglas,
  funciones y su runtime, scripts en otra plataforma, tareas programadas),
  vencimientos de los próximos 90 días con fecha y fuente (runtimes,
  dependencias, acciones del CI, credenciales, retención de respaldos),
  estado de los respaldos y del CI, costo y alertas, y el inventario de
  infraestructura al día. Usar en la revisión periódica de
  infraestructura y ante "¿qué está en producción?", "¿es lo mismo que
  probamos?", "¿anda el CI?", "¿se vence algo?", "¿hay backups?", "¿quién
  se entera si falla de noche?". No despliega ni cambia nada (eso es
  hroy-deploy), ni revisa los datos guardados (hgary-integridad), ni quién
  puede ver qué en la app (hjulia-revision-cambio).
---

# Estado de la infraestructura

Lo mantiene Roy; lo usa cualquiera. Es de uso general: lo del proyecto
(piezas, comandos de lectura, dónde se mira cada cosa) vive en el
inventario de infraestructura y en el catálogo de convenciones (tema de
infraestructura), si existen.

Lo que falla: copiar el inventario en vez de leer lo desplegado; un
vencimiento que nadie mira porque hoy anda; "el CI está bien" sin haber
leído su resultado; lo que no se pudo leer, omitido en vez de dicho; y
arreglar en la misma pasada lo que se encontró.

Contenido: Proporción · 1. Antes de leer · 2. Lo desplegado ·
3. Vencimientos · 4. Respaldo · 5. CI · 6. Costo y alertas ·
7. Inventario y reporte.

## Proporción

| Pedido | Se entrega |
|---|---|
| "¿Qué está en producción?" / "¿es lo que probamos?" | Paso 2 de las piezas que tocó el último cambio, reporte |
| "¿Anda el CI?" | Paso 5, reporte |
| "¿Se vence algo?" | Paso 3, reporte |
| Revisión periódica | Todo, con el inventario actualizado; si su última lectura es de hace días, lo que pudo cambiar desde entonces |

## 1. Antes de leer

- **Solo lectura**: nada que despliegue, cree, borre o cambie
  configuración, ni para "probar". Arreglar es `hroy-deploy`.
- Metadata de lo desplegado (versiones, runtimes, respaldos), no datos
  guardados: eso es `hgary-integridad`.
- Proyecto o sitio explícito en cada comando. Un error de credenciales se
  dice, con el comando exacto para el usuario; no se sigue como leído.
- Se anota con qué herramienta y versión se leyó (algunas muestran más con
  salida estructurada que en tabla). Es lectura, no un cambio: sin
  roll-call de cambio de fondo.

## 2. Lo desplegado

Por cada pieza del inventario, lo que está publicado contra lo que dice
el repo:
- **Hosting**: versión activa de cada sitio, fecha y mensaje (si lleva el
  commit, cuál); el contenido servido, sin caché, por hash contra el
  archivo como se publicó (la copia de trabajo de quien desplegó: ojo con
  los finales de línea), y las cabeceras de caché. Sin mensaje, el commit
  no se sabe: se compara contenido y se dice así.
- **Reglas**: si la herramienta no las lee, se le pide al usuario la
  fecha de publicación de la consola, contra el último commit que las
  tocó. Sin eso no se dan por iguales al repo.
- **Funciones**: lista, región, runtime y fecha de cada una (si no se
  muestra, de dónde se dedujo), contra el código del repo; una que sobra
  o falta se nombra. Entre ambientes se comparan por fecha contra el
  commit: un hash que incluye la configuración del proyecto no sirve.
- **Scripts en otra plataforma y tareas programadas**: fecha de la última
  implementación (la pide el usuario o el dueño) y, para una tarea, que
  esté listada en la máquina donde corre.

Cada fila: medido (con qué), o "no se pudo leer" (por qué y cómo se lee).

## 3. Vencimientos

Lo que vence en los próximos 90 días, y lo ya vencido:
- runtimes de las funciones y del CI (el de la suite y el que declaran
  las acciones que usa), contra la tabla del proveedor;
- dependencias principales: versión mayor nueva, fin de soporte, avisos
  de deprecación en la salida del build;
- acciones o imágenes del CI que el proveedor anunció retirar;
- credenciales y tokens con fecha; dominios y certificados;
- retención de respaldos: qué deja de poder recuperarse.

Cada uno con fecha, fuente (enlace o salida de un comando) y qué pasa
cuando vence. Sin fecha conocida se dice así; una fecha no se completa
de memoria (la del inventario vale si cita su fuente). Lo que vence antes de la próxima revisión va al backlog con
prioridad según la fecha, aunque ya esté en el inventario.

## 4. Respaldo

Contra lo que el responsable de los datos definió que hay que poder
recuperar (si no lo definió, se dice): respaldos recientes completos y
sin huecos (intervalo entre uno y otro, no días calendario), retención,
recuperación a un punto en el tiempo, protección contra borrado, y
cuándo se probó una restauración. Si nunca, se informa como no probado.

## 5. CI

- **Resultado** de las últimas corridas en la rama principal. Si no se
  puede leer, se pide al usuario; no se infiere de la suite local.
- **Qué no corre** de lo que la suite local o el deploy piden (sintaxis,
  reglas, funciones): un verde del CI no lo cubre.
- **Entorno**: runtime y sistema del CI contra las máquinas de trabajo
  (finales de línea, zona horaria), si explican una diferencia.
- **Quién se entera** de un rojo, y cómo.

## 6. Costo y alertas

Presupuesto con aviso en cada proyecto, alertas de errores de funciones
y tareas que corren solas, a quién le llegan; el gasto del mes contra el
anterior. Lo no leído se dice así, no como "sin alertas".

## 7. Inventario y reporte

- **Inventario**: se actualiza en el mismo commit con lo leído (estado,
  fechas, vencimientos) y la fecha de la lectura; lo no leído queda
  marcado. Si estaba desactualizado, se dice en qué.
- **Backlog**: cada hallazgo con su evidencia (comando y salida, o
  enlace); lo que ya tiene ítem, como nota en ese ítem.
- Una revisión periódica deja su entrada en el registro del proyecto.
  Nada se arregla en la misma pasada.

```
Leído: <fecha; herramienta y versión; proyectos y sitios>.
Desplegado: <por pieza: igual al repo / distinto (qué) / no leído (por qué)>.
Vence en 90 días: <qué, fecha, fuente, qué pasa, ítem>.
Respaldo: <estado; última restauración probada>.
CI: <resultado (leído / no leído); qué no cubre; quién se entera>.
Costo y alertas: <estado / no leído>.
Inventario: <actualizado en / sin cambios>. Backlog: <ítems y notas>.
```

En una pregunta puntual, solo las líneas que tocan, más "Leído".
