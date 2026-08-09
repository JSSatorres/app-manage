# Tarea Maestra — Actualizar capturas de la landing

## Contexto

El rediseño actual de SportApp ya no coincide con las capturas de producto publicadas en `/landing`. Las imágenes todavía muestran la interfaz anterior y, en varias de ellas, la insignia amarilla `DEV` del entorno de desarrollo.

El usuario confirma el 08/08/2026 que quiere:

- sustituir las capturas antiguas por imágenes de la interfaz actual;
- conservar la composición y el contenido comercial de la landing;
- impedir que la insignia `DEV` aparezca en cualquiera de las capturas publicadas.

## Reglas de producto y UX

- Solo se renuevan capturas reales de producto usadas por la landing: dashboard, alta de sesión, documentos e importación de datos.
- Las fotografías deportivas, la ilustración de ejercicios y los recursos de marca permanecen intactos.
- Las capturas se obtienen desde un build de producción para que `NODE_ENV !== "development"` y el indicador `DEV` no se renderice.
- No se retoca ni se elimina la insignia después de capturar; debe estar ausente en la interfaz fuente.
- Las capturas usan nombres versionados por rediseño para invalidar de forma determinista las cachés de `next/image`, CDN, service worker y navegador.
- No se exponen credenciales, tokens ni datos sensibles en los assets.

## Arquitectura

- Arrancar el build de producción local con los cambios actuales del rediseño.
- Autenticar una cuenta de prueba mediante las credenciales locales ya configuradas, sin imprimirlas.
- Capturar las rutas reales con `agent-browser` en un viewport 16:10 coherente con las tarjetas de la landing.
- Reemplazar quirúrgicamente los PNG existentes bajo `public/landing/` y validar la landing en escritorio y móvil.

## Checklist Frontend

- [x] Capturar el dashboard actual sin `DEV`.
- [x] Capturar el diálogo actual de nueva sesión sin `DEV`.
- [x] Capturar la vista actual de documentos sin `DEV`.
- [x] Capturar la vista actual de importación sin `DEV`.
- [x] Sustituir los assets usados por `Hero`, `ModulesSection` y `MigrationSection`.
- [x] Confirmar que ninguna captura contiene la insignia `DEV` ni información sensible.
- [x] Verificar la landing en escritorio y móvil.

## Verificación ejecutada

- `npm run build`: PASS con Next.js 16.2.1; el primer intento aislado no pudo descargar Google Fonts y el reintento autorizado terminó en verde.
- Fuente de captura: `next start` en puerto local aislado; las comprobaciones DOM confirmaron cero insignias `DEV` antes de guardar cada PNG.
- Assets: cinco PNG válidos de 1600×1000, relación 16:10.
- Dashboard: se mantuvo la semana actual sin sesiones para no publicar datos históricos reales de la cuenta de prueba.
- Documentos: captura tomada tras ocultarse `Cargando datos...`, con el listado estable.
- Landing escritorio 1440×900: 11 imágenes visibles cargadas, sin overflow horizontal y sin `DEV`.
- Landing móvil 375×667: 10 imágenes visibles cargadas, sin overflow horizontal y sin `DEV`.
- `git diff --check` dirigido: PASS.
- No se modificaron lógica de negocio, auth, datos, permisos ni Supabase.

## Corrección posterior — caché del Hero

- Evidencia: `codex-clipboard-1154042c-beaf-4a93-8008-234937d1f8c3.png` muestra que el Hero todavía recibía un recorte del dashboard anterior.
- Reproducción: el PNG local ya contenía el rediseño, pero `next/image` generaba `/_next/image?url=%2Flanding%2F01-dashboard.png…`; la URL histórica conservaba una variante optimizada antigua.
- Causa raíz: se reemplazó el contenido binario manteniendo el mismo nombre público, por lo que las capas de caché no tenían una clave nueva.
- Corrección: los cinco assets renovados y todas sus referencias runtime usan nombres `*-redesign-2026.png`; OpenGraph y Twitter también apuntan al nombre versionado.
- Regresión: `Hero.test.tsx` protege que el URL optimizado contiene `01-dashboard-redesign-2026.png`.
- Verificación: test dirigido 2/2 PASS; build Next.js 16.2.1 PASS; HTML de producción con siete referencias nuevas y cero referencias al nombre antiguo; captura visual del Hero confirmada con el dashboard editorial actual.

## Archivos afectados

- `public/landing/01-dashboard-redesign-2026.png`
- `public/landing/01-dashboard-focus-redesign-2026.png`
- `public/landing/02-nueva-sesion-redesign-2026.png`
- `public/landing/05-documentos-focus-redesign-2026.png`
- `public/landing/04-import-excel-drive-redesign-2026.png`
- `task/REGISTRO-TAREAS.md`
- `docs/backlog.md`

## Plan de ejecución

- Registro: TASK-006 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-actualizar-capturas-landing.md`
