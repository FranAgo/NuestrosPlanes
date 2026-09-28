# Cómo lo resuelven otros: pendientes de Nuestros Planes

> Investigación de Paul, 2026-09-27, pedida por Franco. Cubre cada pendiente
> (backlog y REQ abiertos) y lo compara con apps y empresas del rubro. Es una
> referencia para decidir: no cambia el alcance de ningún REQ por sí sola. Lo
> que sí cambia algo ya quedó anotado en el REQ o en el ítem del backlog
> correspondiente.
>
> No entran BL-002 (tests), BL-012 y BL-014 (documentación y skills internas):
> no son de producto.

---

## Fotos: fechas, estados y organización

### BUG-FECHA-001: el día corre en UTC
- **Qué pasa en otros lados:** es un bug clásico, tan común que tiene nombre
  ("off by one day"). `toISOString().split('T')[0]` da mañana si uno está al
  oeste de UTC y es de noche. La práctica aceptada: los timestamps se guardan
  en UTC, pero una fecha "de calendario" (un día) se calcula en la zona del
  usuario y se guarda como `AAAA-MM-DD` sin hora.
- **Para nosotros:** es exactamente lo que dice `docs/modelo-datos.md`. Solo
  falta aplicarlo en los tres lugares del servidor. Fuentes: [Medium, toISOString devuelve UTC](https://tulusibrahim.medium.com/toisostring-return-utc-time-b2f473ceca2a), [GitLab, guía de fechas del front](https://docs.gitlab.com/development/fe_guide/date_and_time/).

### BL-025: qué fecha lleva una foto y tareas de varios días
- **Google Fotos:** usa la fecha de captura del EXIF (`DateTimeOriginal`). Si
  no está, la de subida. El usuario la puede editar, y la edición vive en la
  base de Google, no en el archivo.
- **Apps de viaje (Polarsteps):** el viaje dura varios días y las fotos se
  ordenan por "pasos" o días.
- **Para nosotros:** la app recomprime la foto con `canvas` antes de subirla y
  eso borra el EXIF. La fecha hay que leerla antes, en el navegador (ExifReader
  pesa ~9 KiB si se leen pocos datos). El iPhone puede sacar datos al
  compartir, así que siempre hace falta respaldo.
- **Recomendación:** fecha de captura → si no hay, día de subida en hora
  Argentina → editable. Fecha de fin opcional en la tarea y fotos agrupadas
  por día. Fuentes: [Google Photos Community](https://support.google.com/photos/thread/110841/which-exif-dates-does-google-photos-use-to-organise-images?hl=en), [editar la fecha en Google Fotos](https://timestampcamera.net/photo-guides/how-to-change-date-taken-in-google-photos), [Polarsteps](https://support.polarsteps.com/hc/en-us/articles/23760478173586-What-are-steps-and-how-do-I-add-or-edit-them), [WebKit bug 207088](https://bugs.webkit.org/show_bug.cgi?id=207088), [ExifReader](https://github.com/mattiasw/ExifReader).

### REQ-MEDIA-004: estados de subida y fotos ya subidas
- **Patrón de la industria** (Filestack, guías de SaaS): una cola visible con
  un estado por archivo (*en espera, subiendo con progreso, listo, falló con
  motivo*). El resultado parcial se dice sin maquillar ("3 de 4") y el
  reintento es solo de las que fallaron, nunca de las que ya subieron. Los
  errores de red pasajeros se reintentan solos una vez antes de mostrarlos.
- **Para nosotros:** coincide con las 4 pills del REQ. Se suma al REQ el
  reintento automático silencioso. Fuentes: [Filestack, subida masiva](https://blog.filestack.com/bulk-upload-ui-queues-partial-success/), [Filestack, estados](https://blog.filestack.com/upload-file-ui-design-components-states-and-errors/).

### BL-009: borrar una foto ya subida
- **Google Fotos y Apple Fotos:** nada se borra en el acto. Va a una
  papelera ("Eliminados recientemente") durante **30 días** y se puede
  restaurar. Después se borra para siempre.
- **Para nosotros:** ya tenemos el borrado lógico (`estado='eliminado'`).
  Falta la UI y decidir si hay purga a los 30 días (se cruza con BL-006).
  Fuentes: [Google Fotos, papelera](https://support.google.com/photos/answer/9343482?hl=en&co=GENIE.Platform%3DAndroid), [Apple](https://support.apple.com/en-us/124460).

### BL-010: reordenar fotos
- **Google Fotos:** un álbum ofrece "más viejas primero", "más nuevas
  primero" y "agregadas recientemente". Si arrastrás una foto, aparece el
  orden "Personalizado".
- **Para nosotros:** con BL-025 resuelto (fecha de captura), ordenar por fecha
  cubre casi todo. El orden a mano queda para después. Fuente: [Picasa Resources](https://sites.google.com/site/picasaresources/google-photos-1/how-to-reorganize-pictures-in-an-album).

### BL-017: fotos de una tarea eliminada
- **Google Fotos:** un álbum es como una etiqueta de Gmail, no una carpeta.
  Borrar el álbum **no borra las fotos**.
- **Para nosotros:** el modelo de datos dice que borrar una tarea pasa sus
  fotos a `archivado`, pero el código no lo hace. La referencia apoya que un
  recuerdo sobreviva a la tarea, aunque hay que decidirlo. Fuente: [Google Photos Community](https://support.google.com/photos/thread/210702109/if-i-delete-an-album-in-google-photos-will-that-delete-the-picture-from-the-photo-library-also?hl=en).

### BL-007: "recuerdos" / "En este día"
- **Google Fotos y Apple Fotos (desde 2016):** eligen fotos por fecha ("hace
  N años"), personas, lugares y temas, con visión artificial. Además aprenden
  qué recuerdos mirás y cuáles salteás.
- **Para nosotros:** sin visión artificial, lo alcanzable es "En este día" (la
  misma fecha en años anteriores) y "esta tarea hace un año". Necesita BL-025
  para que la fecha sea la real. Fuentes: [Google Fotos, recuerdos](https://support.google.com/photos/answer/9454489?hl=en&co=GENIE.Platform%3DAndroid), [Android Police](https://www.androidpolice.com/google-photos-data-personalization-memories/).

### BL-008: límite de fotos por tarea
- **Google Fotos:** recomienda archivos de menos de 50 MB y, en calidad
  ahorro, reduce las fotos a 16 MP y los videos a 1080p.
- **Para nosotros:** ya comprimimos en el cliente. El límite real lo pone
  Apps Script (50 MB por pedido). Sugerencia: un tope por tanda (por ejemplo,
  20 fotos) más que un tope por tarea. Fuente: [PicBackMan](https://www.picbackman.com/tips-tricks/what-are-the-upload-limitations-in-google-photos-2/).

### BL-023: videos
- **Límite duro:** Apps Script no maneja más de **50 MB** por pedido, y ni
  `DriveApp` ni el servicio avanzado de Drive hacen subidas por partes. Lo que
  se usa es la subida *resumable* de la API de Drive, en partes, con
  `UrlFetchApp` o directo desde el navegador con un token. Hay
  implementaciones abiertas para Web Apps (tanaike).
- **Para nosotros:** hay que diseñar dónde vive el token sin exponerlo
  (Julia), cómo se hace la miniatura y cómo se reproduce por el proxy. Es un
  REQ grande. Fuentes: [tanaike, subida resumable para Web Apps](https://github.com/tanaikech/Resumable_Upload_For_WebApps), [Desktop liberation](https://ramblings.mcpher.com/gassnippets2/resumable-uploads-writing-large-files-to-drive-with-apps-script/).

### REQ-PERF-004 / BL-011: miniaturas
- **API de Drive:** `thumbnailLink` es un enlace que dura unas horas, necesita
  credenciales si el archivo no es público y no está pensado para usarse
  directo en la web (CORS). Google recomienda un proxy.
- **Para nosotros:** confirma el enfoque ya diagnosticado. El servidor pide la
  miniatura y la devuelve por `getArchivo`, sin exponer la URL. Se puede
  cachear usando la versión de la miniatura. Fuente: [Drive API, metadata](https://developers.google.com/drive/api/guides/file).

---

## Tareas: cierre, estado y tiempo real

### REQ-PLAN-001: cerrar con el acuerdo de los dos
- **Apps de pareja** (Any.do Couples, Cozi, Honeydo, RemindHer, Treat): tienen
  listas compartidas, asignación y sincronización en vivo. **Ninguna de las
  que revisé pide el acuerdo de los dos para cerrar.** Es algo propio de
  Nuestros Planes.
- **Donde sí existe es en empresas:** es el "principio de los cuatro ojos" o
  *maker-checker* (bancos, aprobaciones) y las revisiones obligatorias de
  GitHub. Hay dos reglas que se repiten: la misma persona no puede dar las dos
  aprobaciones, y la aprobación vieja se descarta si el contenido cambió
  (GitHub, "dismiss stale approvals", al subir código nuevo).
- **Para nosotros:** la primera regla ya está (cada uno solo cambia su propio
  acuerdo). La segunda es justo la pregunta abierta 1 del REQ: ¿subir fotos
  después del acuerdo lo anula? GitHub diría que sí. En una pareja, Paul sigue
  recomendando que no, porque sumar fotos no cambia lo que se acordó. Pero hay
  un término medio: avisarle al otro "Noelia subió 2 fotos después de tu OK".
  Fuentes: [Any.do](https://www.any.do/blog/the-best-shared-to-do-list-app-for-couples-in-2026/), [Cupla](https://cupla.app/blog/11-best-shared-to-do-list-apps-for-couples-in-2025-that-actually-work/), [Wikipedia, maker-checker](https://en.wikipedia.org/wiki/Maker-checker), [GitHub, revisiones requeridas](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews), [GitHub, descartar revisiones](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/dismissing-a-pull-request-review).

### BL-024: reabrir una tarea completada
- **Todoist:** "descompletar" es un clic sobre el tilde, desde la vista de
  completadas. Si reabrís una subtarea, se reabre la tarea padre. **Asana:** se
  destilda la tarea.
- **Para nosotros:** es un estándar y hoy nos obliga a tocar la planilla.
  Recomendación: sumarlo a REQ-PLAN-001, con la regla de que reabrir borra los
  acuerdos. Fuente: [Todoist](https://todoist.com/help/articles/complete-or-uncomplete-a-task).

### REQ-SYNC-001: ver los cambios en segundos
- **Opciones de la industria:** consultar cada tanto (lo más simple, sirve
  cuando unos segundos de demora no molestan), consulta larga, SSE o
  WebSockets (canal abierto), o una base en tiempo real como Firebase
  (milisegundos, pero es otro servicio). Práctica general: dejar de consultar
  con la pestaña oculta (Page Visibility API).
- **Para nosotros:** Apps Script no ofrece SSE ni WebSockets. Firebase suma un
  servicio, su propia autenticación y datos personales en otro proveedor
  (Julia). Con 2 personas, consultar cada 5–10 s un endpoint liviano ("¿cambió
  algo?") es lo razonable. Para enterarse de las ediciones a mano en la
  planilla, un trigger `onChange` instalable que marque la versión.
- **Cuotas a confirmar (Roy):** 6 min por ejecución, 30 ejecuciones
  simultáneas por usuario y 90 min por día de runtime de triggers en cuentas
  gmail. Hay que confirmar en la tabla oficial que las llamadas a la Web App
  no cuentan contra esos 90 minutos. Fuentes: [Apps Script, cuotas](https://developers.google.com/apps-script/guides/services/quotas), [David Gomes, polling vs SSE](https://davidgomes.blog/2023/02/12/short-vs-long-polling-vs-websockets-vs-sse/), [Page Visibility API](https://blog.sachinchaurasiya.dev/how-the-page-visibility-api-improves-web-performance-and-user-experience), [Firebase](https://firebase.google.com/docs/database).

### BL-001: un solo pedido para la carga inicial
- **Patrón "Backend for Frontend":** un endpoint que junta lo que necesita la
  primera pantalla, para cargarla en una sola ida y vuelta. Es muy común en
  apps móviles por la latencia.
- **Para nosotros:** en Apps Script cada pedido tiene un costo fijo de
  arranque, así que el patrón aplica todavía más. Además se combina con
  REQ-SYNC-001: el mismo endpoint puede devolver la "versión" de los datos.
  Fuentes: [Marmelab, ¿necesitás un BFF?](https://marmelab.com/blog/2025/10/01/do-you-need-a-backend-for-frontend.html), [Microsoft, Gateway Aggregation](https://learn.microsoft.com/sr-latn-rs/azure/architecture/patterns/gateway-aggregation).

---

## Errores y accesibilidad

### REQ-UX-001: errores claros
- **Nielsen Norman Group** (heurística 9): el mensaje tiene que ser explícito,
  en palabras humanas, cortés, preciso y con un consejo para salir. No culpa
  al usuario, no muestra solo códigos y aparece cerca de donde está el
  problema.
- **Para nosotros:** coincide con "qué pasó + qué hacer + código chiquito".
  Sumar al REQ: el mensaje va junto al campo o a la foto que falló, no en un
  cartel lejos. Fuentes: [NN/g, guía de mensajes de error](https://www.nngroup.com/articles/error-message-guidelines/), [NN/g, errores en formularios](https://www.nngroup.com/articles/errors-forms-design-guidelines/).

### BL-022: colores de categoría con teclado
- **W3C (APG) y guías de e-commerce:** las muestras de color son un
  **grupo de radios**, ideal con `<input type="radio">` nativos dentro de un
  `fieldset` con `legend`, cada una con nombre ("Rosa"), foco visible y área
  táctil de 44×44 aunque el círculo se vea más chico.
- **Para nosotros:** confirma la propuesta del ítem, y prefiere los radios
  nativos a botones con `aria-pressed`. Fuentes: [W3C APG, radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/), [DEV, swatches](https://dev.to/agentkit/color-and-size-swatches-the-product-page-pattern-quietly-excluding-blind-shoppers-2p03).

---

## Seguridad, datos personales y operación

### BL-005: el email en el log de auditoría
- **OWASP Logging Cheat Sheet:** no loguear emails completos. Enmascarar
  (`j***@example.com`) o **seudonimizar** (un hash con clave) cuando no hace
  falta saber quién es.
- **Para nosotros:** hoy enmascaramos el usuario y dejamos el dominio, que es
  justo el ejemplo de OWASP. La mejora real no es tapar el dominio: para
  `login_denegado`, un hash HMAC del email permite ver "el mismo intruso probó
  5 veces" sin guardar el email. Fuente: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

### BL-006: cuánto guardar la auditoría
- **Práctica común:** el RGPD y la Ley 25.326 no fijan un plazo. Piden guardar
  "lo necesario para el fin" y justificarlo. En la práctica, los logs de
  seguridad con datos personales se guardan de **1 a 3 años**.
- **Para nosotros:** con 2 personas, 1 año alcanza. Propuesta: purga mensual
  de lo que tenga más de 12 meses, escrita en la política de privacidad.
  Fuentes: [LogPulse](https://logpulse.io/guides/log-retention-requirements/), [Usercentrics](https://usercentrics.com/knowledge-hub/gdpr-data-retention/), [Pandectes, Ley 25.326](https://pandectes.io/blog/an-overview-of-argentinas-personal-data-protection-law/).

### BL-019: alerta si se vence la autorización
- **Google Cloud:** Error Reporting ya agrupa solo las excepciones de Apps
  Script (tenemos `exceptionLogging: STACKDRIVER`). Se le puede agregar una
  notificación por mail. O una alerta de Cloud Logging que filtre "No tienes
  permiso".
- **Para nosotros:** es configuración, no código: un canal de mail y una
  política. Es un cambio en Google Cloud, así que va con OK explícito. Fuentes: [Error Reporting para Apps Script](https://cloud.google.com/error-reporting/docs/setup/apps-script), [notificaciones de Error Reporting](https://docs.cloud.google.com/error-reporting/docs/notifications).

### BL-013: documento de seguimiento de seguridad
- **OWASP:** no hay una plantilla única. El formato más usado para proyectos
  chicos son las "4 preguntas" de Shostack: ¿qué estamos construyendo? ¿qué
  puede salir mal? ¿qué hacemos al respecto? ¿lo hicimos bien? Se complementa
  con la lista de controles de ASVS.
- **Para nosotros:** usar esas 4 preguntas como estructura del documento, con
  una fila por superficie ya revisada. Fuentes: [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html), [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling).

### BL-003: rol admin y panel
- **Práctica común** (control de acceso por roles): el rol se verifica en el
  servidor en cada pedido, nunca solo en el front, y la matriz de quién puede
  qué queda escrita. Coincide con lo que ya anota el ítem. En esto no hay nada
  del mercado que cambie el plan: el pendiente real es la decisión sobre
  `Config` y Script Properties.
