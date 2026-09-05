# Peroncitos — instrucciones del proyecto

## Flujo de trabajo con Claude Code

### Subida a GitHub (commit + push)
- **Solo al terminar la sesión de trabajo** y **después de una confirmación clara del usuario** (por ejemplo: "listo, subí todo" / "confirmá el push").
- Nunca hacer commit ni push automáticamente durante la sesión ni sin ese "sí" explícito.
- Rama: `main` (push directo a `origin/main`), salvo que el usuario pida otra cosa.
- Antes de pushear: actualizar la bitácora (ver abajo) e incluirla en el mismo commit.

### Bitácora de cambios
Registrar todo cambio hecho en la sesión en:

```
bitacora/<AÑO>/<MES>-<nombre-mes>.txt
```

- Si no existe la carpeta del año en que se hace el cambio, crearla.
- Si no existe el archivo del mes, crearlo (ej: `bitacora/2026/09-septiembre.txt`).
- Las entradas se agregan al final del archivo del mes, más reciente abajo.

Cada entrada debe incluir:
- **Fecha y hora en hora Argentina (UTC-3)** — calcular con la zona `Argentina Standard Time`, no usar la hora del sistema si difiere.
- **Autor**: quién pidió/hizo el cambio (nombre y, si se conoce, email).
- **Herramienta**: "Claude Code (Sonnet 5)".
- **Lista de cambios**: archivos tocados y una descripción breve de qué se hizo.

Formato de cada entrada:

```
========================================================
2026-09-05 17:55 (hora Argentina, UTC-3)
Autor: Franco Agoglia <Gestion@sisintegrales.com>
Herramienta: Claude Code (Sonnet 5)
--------------------------------------------------------
Cambios:
- ruta/al/archivo.ext — qué se cambió y por qué
- otra/ruta.ext — ...
========================================================
```
