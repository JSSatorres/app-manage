# Actualizar capturas de la landing Implementation Plan

**Goal:** Sustituir las capturas antiguas de producto de `/landing` por imágenes del rediseño actual, sin mostrar la insignia `DEV`.

**Architecture:** La composición de la landing se mantiene intacta. Se genera un build local de producción, se autentica una cuenta de prueba y se capturan las rutas reales con un viewport 16:10; los PNG usan nombres versionados por rediseño para invalidar cachés de `next/image`, CDN, service worker y navegador.

**Tech Stack:** Next.js 16 App Router, React 19, `next/image`, PNG estático y `agent-browser`.

## Perfil de verificación

- Nivel: standard
- Motivo: cambio visual público en varios assets de producto, sin modificar lógica, auth, datos, permisos ni persistencia.
- Comandos: `npm run build`; `npm start`; inspección autenticada con `agent-browser`; inspección de `/landing` a 1440×900 y 375×667; `git diff --check`.
- Evidencias esperadas: las cuatro vistas de producto corresponden al rediseño actual; `DEV` no aparece en píxeles ni texto visible; las imágenes cargan sin distorsión o roturas en escritorio y móvil.

## Incidencias de verificación

- Ronda 2 · 08/08/2026 · major: el Hero continuó mostrando el dashboard anterior porque el binario nuevo conservó `/landing/01-dashboard.png` y `next/image` reutilizó la variante optimizada asociada a esa URL. Corregido versionando los cinco nombres como `*-redesign-2026.png`, actualizando todas las referencias runtime y añadiendo una regresión dirigida. Test 2/2, build y render de producción verdes.

---

## Contrato visual

- Capturas fuente obtenidas desde `next start`, nunca desde `next dev`.
- Viewport de captura: 1600×1000 para respetar la relación 16:10 de las tarjetas.
- Encuadre: aplicación completa, sin chrome del navegador y con el contenido principal visible.
- Dashboard: vista semanal actual con navegación, filtros y sesiones legibles.
- Sesiones: diálogo `Nueva sesión` abierto sobre la vista actual.
- Documentos: listado actual con encabezado, búsqueda y tabla/tarjetas visibles.
- Importación: sección actual de configuración con controles de archivo y Google Sheets/Drive visibles.
- La captura del dashboard alimenta tanto el recorte protagonista (`01-dashboard-redesign-2026.png`) como la tarjeta de módulo (`01-dashboard-focus-redesign-2026.png`).

## Decisiones prohibidas

- No ocultar `DEV` mediante edición de píxeles, CSS temporal o manipulación del DOM.
- No capturar con el servidor de desarrollo.
- No cambiar textos, componentes o layout para acomodar las imágenes.
- No sustituir fotografías deportivas, ilustraciones ni recursos de marca.
- No imprimir credenciales ni incluir datos personales o tokens en las capturas.
- No alterar servicios, Supabase, permisos, migraciones ni datos remotos.

### Task 1: Preparar una fuente de captura limpia

**Files:**
- Verify: `.env.local`
- Verify: `src/components/shared/TopBar.tsx`
- Verify: `src/app/(dashboard)/layout.tsx`

**Step 1: Confirmar la condición del badge**

- Verificar que las dos variantes del shell solo renderizan `DEV` cuando `process.env.NODE_ENV === "development"`.
- Expected: el build de producción no contiene la insignia en la UI autenticada.

**Step 2: Construir y arrancar producción**

- Run: `npm run build` · Expected: PASS.
- Run: `npm start` · Expected: servidor local listo sin cambiar configuración ni código.

**Step 3: Autenticar la cuenta de prueba**

- Abrir `/login` con `agent-browser` y rellenar email/contraseña desde las variables locales `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` sin imprimir sus valores.
- Expected: redirección a `/dashboard`.

### Task 2: Renovar las capturas de producto

**Files:**
- Create: `public/landing/01-dashboard-redesign-2026.png`
- Create: `public/landing/01-dashboard-focus-redesign-2026.png`
- Create: `public/landing/02-nueva-sesion-redesign-2026.png`
- Create: `public/landing/05-documentos-focus-redesign-2026.png`
- Create: `public/landing/04-import-excel-drive-redesign-2026.png`

**Step 1: Fijar el viewport de captura**

- Configurar `agent-browser` a 1600×1000.
- Esperar contenido estable en cada navegación; no usar tiempos arbitrarios si existe una señal de carga o elemento esperado.

**Step 2: Capturar dashboard**

- Navegar a `/dashboard`, comprobar que la UI actual está visible y guardar `01-dashboard-redesign-2026.png`.
- Usar el mismo fotograma para `01-dashboard-focus-redesign-2026.png`.
- Expected: ninguna aparición visible de `DEV`.

**Step 3: Capturar nueva sesión**

- Navegar a `/sesiones`, abrir `Nueva sesión` y guardar `02-nueva-sesion-redesign-2026.png` con el diálogo completo y el fondo actual.
- Expected: diálogo legible, sin datos sensibles y sin `DEV`.

**Step 4: Capturar documentos**

- Navegar a `/documentos` y guardar `05-documentos-focus-redesign-2026.png` cuando la vista haya terminado de cargar.
- Expected: cabecera y contenido actual visibles, sin `DEV`.

**Step 5: Capturar importación**

- Navegar a `/configuracion`, activar la sección de importación si fuera necesario y guardar `04-import-excel-drive-redesign-2026.png`.
- Expected: controles de archivo y Google Sheets/Drive visibles, sin `DEV`.

### Task 3: Verificar la landing y los assets

**Files:**
- Verify: `src/components/landing/Hero.tsx`
- Verify: `src/components/landing/ModulesSection.tsx`
- Verify: `src/components/landing/MigrationSection.tsx`
- Verify: `public/landing/*.png`

**Step 1: Validar los ficheros**

- Confirmar que los cinco PNG existen, se abren correctamente y tienen relación 16:10.
- Inspeccionar visualmente cada imagen y confirmar ausencia de `DEV`, overlays de error y datos sensibles.

**Step 2: Validar escritorio**

- Abrir `/landing` a 1440×900, recorrer Hero, Módulos y Migración y tomar una captura completa de evidencia.
- Expected: todas las imágenes cargan, mantienen encuadre legible y no muestran la interfaz anterior.

**Step 3: Validar móvil**

- Abrir `/landing` a 375×667 y recorrer las mismas secciones.
- Expected: sin desbordamiento horizontal, imágenes nítidas y tarjetas sin deformación.

**Step 4: Verificación final**

- Run: `git diff --check` · Expected: PASS.
- Reutilizar el `npm run build` verde de Task 1 como comprobación de integración Next.js 16.

### Task 4 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-actualizar-capturas-landing-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify if needed: `docs/design-guides/frontend_styleguide.md`

**Pasos:**

- Registrar la evidencia ejecutada en TASK-006 y mantener `en_progreso` hasta confirmación humana de cierre.
- Añadir B15-7 al backlog y marcarlo hecho cuando assets y verificación estén completos.
- No modificar `docs/crud-audit.md`; no cambia ningún CRUD.
- Documentar en la design guide la convención de versionar nombres cuando cambia el contenido de una captura pública.
