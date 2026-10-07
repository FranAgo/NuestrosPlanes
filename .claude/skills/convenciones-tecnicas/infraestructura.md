# Infraestructura: lo propio de Nuestros Planes

Qué cuidar y por qué; el procedimiento, en `hroy-deploy` y
`hroy-estado-infra`. Piezas, implementaciones, vencimientos y última
lectura: `docs/infra/inventario.md`. Comandos de clasp y sus trampas:
`apps-script-clasp.md`. Las aprobaciones de cada paso a prod las define
`CLAUDE.md` (sección "Deploy a producción"); `hroy-deploy` no las
reemplaza.

Contenido: 1. Ambientes · 2. Qué sale en cada deploy · 3. Versión y
caché del front · 4. Verificar lo publicado · 5. Registro de cada deploy ·
6. Revisión periódica.

## 1. Ambientes

**Qué cuidar:** donde una herramienta dice "staging", acá es el
**proyecto de test** de Apps Script con su planilla y su carpeta propias.
No hay staging del front: el front local (`localhost:5173`) pega al
servidor de **prod** (`verificacion-navegador.md` §2), y GitHub Pages es
directamente prod. Para probar el front contra el servidor de test, el
§5 de `verificacion-navegador.md`.

Donde `hroy-deploy` pide que el usuario pruebe y confirme en staging
antes de producción (§6):
- servidor: las pruebas `probarXXX()` en test, más el Web App de test con
  dos sesiones si el cambio es de flujo;
- front: `fetch` simulado o el front local contra el Web App de test
  (`verificacion-navegador.md` §5 y §8). Franco confirma en prod después
  del deploy; eso cierra el REQ (CERRADO), no el deploy.

**Por qué:** la validación A/B del 2026-09-27 (`docs/skills/INVENTARIO.md`)
encontró que un consejo del catálogo mandaba un token falso a prod al
recargar el preview local.

## 2. Qué sale en cada deploy

**Qué cuidar:**
- `git push origin main` publica en Pages todo el repo: `index.html`,
  `privacidad.html`, `docs/` y `bitacora/`. Un push que solo trae la
  bitácora vuelve a publicar Pages sin cambios en la app, pero igual es
  un push a `main` y lleva su OK. El repo es público: nada sensible en lo
  que se pushea (BL-044).
- `clasp push` publica el `Code.gs` del disco, no "el cambio"
  (`apps-script-clasp.md`). Antes de un push a prod, `git status` limpio
  y el mismo commit que se probó en test.
- Front y servidor van en el orden de `contratos.md` §3.

**Por qué:** v15 (BUG-LOGIN-001) llevó a prod código de REQ-DATA-002 que
estaba en `main` sin aprobar (bitácora 2026-09).

## 3. Versión y caché del front

**Qué cuidar:** `APP_VERSION` en `index.html` y en `Code.gs` (DEC-009:
versión de la app entera), la entrada de `CHANGELOG.md` y el tag
`vX.Y.Z` se suben juntos. Pages sirve con
`Cache-Control: max-age=600`: hasta 10 minutos después del deploy alguien
puede recibir la versión anterior, y una pestaña abierta la conserva hasta
recargar.

**Por qué:** lectura del 2026-10-06 (`docs/infra/inventario.md` §8).

## 4. Verificar lo publicado

**Qué cuidar:** "el push salió" no es "está publicado":
- Front: que la corrida "pages build and deployment" de ese commit esté
  en verde (API pública de GitHub, `curl`; `gh` no está instalado en esta
  PC) y que lo servido sin caché tenga el `APP_VERSION` nuevo
  (`verificacion-navegador.md` §9).
- Servidor: `clasp deployments` muestra el Web App en la versión nueva;
  para comparar código, `clasp pull` con una copia del `.clasp.json` en
  una carpeta del scratchpad, nunca sobre el repo, y comparar sin los
  `\r` (Windows).
- Volver atrás con `clasp redeploy -V <anterior>` cambia lo que usa la
  app, pero `@HEAD` sigue con el código nuevo y `clasp run` (por ejemplo
  `setupSheets`) lo correría. Si se vuelve atrás, también `clasp push` del
  commit anterior.

**Por qué:** 1.8.1 (2026-10-05): el push estaba en `main` y Pages no lo
publicó por un incidente de runners de GitHub; la corrida quedó en cola
horas.

## 5. Registro de cada deploy

**Qué cuidar:** en la bitácora, por pieza: commit, versión de Apps Script
o tag, hora, cómo se verificó y quién dio el OK. El mensaje de `clasp
version` lleva el hash corto del commit (`clasp version "<hash> REQ-XXX:
…"`): es lo único que deja ver después qué commit es cada versión. Si cambió algo de lo que
lista el inventario (implementación, Script Property, tarea programada,
scope), el inventario se actualiza en el mismo commit.

## 6. Revisión periódica

**Qué cuidar:** `hroy-estado-infra` completo cada tres meses y antes de
cualquier cambio de infraestructura (scopes, OAuth, implementaciones);
`hbob-salud-codigo` con la misma frecuencia. Cada pasada actualiza la
sección "Última lectura" del inventario y deja su entrada en la bitácora.
La frecuencia está en DEC-022.

**Por qué:** la primera pasada (2026-10-06) encontró que no hay respaldo
propio de los datos, cosa que ninguna sesión anterior había mirado.
