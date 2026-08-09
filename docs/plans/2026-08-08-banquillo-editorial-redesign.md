# Banquillo Editorial Redesign Implementation Plan

**Goal:** Sustituir la identidad visual completa de SportApp por la dirección confirmada «Banquillo editorial», preservando literalmente contenido, rutas, datos, acciones y funcionalidad, con composiciones deliberadas para escritorio y móvil.

**Architecture:** El cambio parte de tokens, fuentes y shell compartido y avanza en cortes verticales por superficies. Los componentes conservan sus interfaces, handlers, permisos, validación y data-fetching; solo cambian composición y presentación. La dirección usa papel cálido, tinta, reglas editoriales, radio mínimo, display condensada y coral como acento semántico restringido.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, Tailwind CSS v4, shadcn/ui, Vitest + Testing Library, Playwright.

## Perfil de verificación

- Nivel: full
- Motivo: rediseño transversal de todas las superficies públicas y autenticadas, shell responsive y controles interactivos; exige comprobar intención visual, accesibilidad y ausencia de regresiones funcionales en escritorio y móvil.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; `npm run test:e2e`; navegador en 1280×800 y 375×667; detector Impeccable una sola vez.
- Evidencias esperadas: estático y suites verdes; build Next.js 16 correcto; rutas/acciones/RBAC/formularios intactos; capturas desktop/móvil coherentes con el boceto; sin overflow horizontal ni pérdida de foco/contraste.

## Incidencias de verificación

<!-- Solo fallos major/critical o minor repetidos/con cambio de alcance. -->

## Estado final del workflow

- Estado: **BLOCKED**
- Fecha: 08/08/2026 (Europe/Madrid)
- Evidencia verde: `npm run lint`; `npx tsc --noEmit`; 228/228 tests unitarios; build Next.js 16; 34 E2E públicos; landing y login revisados en 1280×800 y 375×667.
- Bloqueador: faltan una sesión/credenciales E2E seguras de development (`.env.test.local` con `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD`, o `.auth/state.json`) y acceso de solo lectura a BD dev. Por ello 62 E2E autenticados se omiten y no pueden certificarse dashboard, CRUD, RBAC, selector de sede, menú Más ni cruce BD↔UI.
- Seguridad: los secretos literales fueron retirados del código. La credencial anteriormente expuesta debe rotarse externamente; no se reutilizó ni se registró su valor.
- Reanudación mínima: provisionar las variables/estado de autenticación en archivos locales ignorados, confirmar acceso BD dev de solo lectura y repetir el perfil `full` completo desde lint hasta E2E/visual.
- Cierre documental: no ejecutado; `DESIGN.md`, la styleguide y backlog solo se actualizan tras un verifier `PASS`.

- **08/08/2026 — Ronda 3 — Major — copy visible de landing:** varios literales de las secciones públicas, incluido el tag de producto y el H1, se renderizaban con mojibake (`dÃ­a`, `informaciÃ³n`). **Causa:** archivos fuente persistidos tras una decodificación Windows-1252 de contenido UTF-8, no una decodificación de la respuesta. **Corrección:** restauración quirúrgica de los literales a UTF-8, sin reformular copy, y prueba del H1/tag sin patrones corruptos renderizados. **Evidencia:** barrido de los 20 archivos de landing sin patrones mojibake; tests, ESLint y typecheck dirigidos pendientes de reverificación.

- **08/08/2026 — Ronda 2 — Major — hero y E2E público:** el hero podía permanecer invisible porque Framer Motion iniciaba ambos bloques con `opacity: 0`; cuatro pruebas públicas referían labels y CTA obsoletos. **Causa:** animación de entrada sin estado visible de reserva y expectativas no alineadas con la UI española vigente. **Corrección:** estado inicial visible (`opacity: 1`) con desplazamiento progresivo y duración cero bajo reduced motion; expectativas por `Contraseña` y el botón `Unirme a la lista de espera`. **Evidencia:** `Hero.test.tsx` RED→GREEN; Playwright dirigido pendiente de reverificación.
- **08/08/2026 — Ronda 2 — Major — red externa bloqueada:** el test de consola de login recibía `net::ERR_NETWORK_ACCESS_DENIED` del script de depuración de Vercel Analytics (`https://va.vercel-scripts.com/v1/script.debug.js`), de origen externo `https://va.vercel-scripts.com`, bloqueado por el sandbox. **Causa:** la red de pruebas no permite cargar telemetría externa. **Corrección:** el test admite exclusivamente ese fallo y URL exactos; conserva el fallo para cualquier otra request o error de consola. **Evidencia:** reproducción en Chromium y Mobile Chrome; reverificación pendiente.

- **08/08/2026 — Major — hidratación:** el contrato auditable se emitía con `<template>`, provocando un desajuste SSR/cliente. **Causa:** React no conserva de forma equivalente el contenido de `template`. **Corrección:** contrato estático en un `data-impeccable-contract` dentro de un nodo oculto y determinista, sin alterar proveedores. **Evidencia:** fallo de hidratación detectado por verifier FULL. **Reverificación:** pendiente.
- **08/08/2026 — Major — CTA de lista de espera:** el nombre accesible del correo no coincidía literalmente con `Correo electrónico`, bloqueando la prueba de envío. **Causa:** codificación inconsistente del literal. **Corrección:** etiqueta semántica con literal UTF-8 correcto, manteniendo submit y copy. **Evidencia:** `CtaSection.test.tsx` fallaba al localizar el control. **Reverificación:** pendiente.
- **08/08/2026 — Major — contrato visual:** inputs y CTA de acceso usaban radios amplios incompatibles con la dirección editorial. **Causa:** overrides de radio locales. **Corrección:** radios mínimos (`rounded-none`) sin modificar foco ni tamaño táctil. **Evidencia:** revisión visual FULL. **Reverificación:** pendiente.
- **08/08/2026 — Critical — credenciales E2E:** había credenciales de autenticación reales codificadas en varios spec de Playwright. **Causa:** configuración de pruebas duplicada en archivos versionados. **Corrección:** helper único que lee exclusivamente `E2E_TEST_EMAIL` y `E2E_TEST_PASSWORD`; las pruebas autenticadas se saltan con motivo seguro si faltan. **Evidencia:** auditoría `rg` de `e2e/**`. **Reverificación:** pendiente; la rotación externa queda como handoff manual y no se ha ejecutado.

---

## Contratos invariantes

- No cambiar textos, copy, secciones, rutas, datos, schemas, servicios, queries, permisos, acciones, analytics ni comportamiento.
- No añadir dependencias. Mantener Server/Client boundaries y proveedores actuales.
- Conservar `aria-*`, foco visible, navegación por teclado, targets táctiles y `prefers-reduced-motion`.
- No usar snapshots ni aserciones de clases Tailwind como contrato principal; probar comportamiento observable y semántica.
- Dirección fijada por el usuario: papel `#f4f0e8`, tinta `#171614`, secundario `#ebe4d8`, oscuro `#1b1b19`, claro `#f8f3e8`, coral `#ff4d2e`/`#ff5a3a`/`#ff6b4c`; retícula editorial, reglas negras, radio mínimo, display condensada y cuerpo sans.
- Desktop: sidebar oscura de ~184 px, superficies editoriales y rejillas densas. Móvil: sin sidebar, shell y composiciones apiladas, BottomNav intacta; dashboard con stats 2 columnas (primera full), semana 2 columnas (última full).
- GIT=off: no ejecutar git ni crear commits.

### Task 1: Capturar product truth para el rediseño

**Files:**
- Create: `PRODUCT.md`

**Skills:** `impeccable` (`init.md`), `clean-code`.

**Steps:**
1. Extraer solo hechos duraderos confirmados por `AGENTS.md`, `ARCHITECTURE.md`, `planificacion.pdf`, rutas y copy existentes; no inventar claims.
2. Crear `PRODUCT.md` con `<!-- impeccable:product-schema 1 -->`, plataforma `web`, usuarios, propósito, capacidades/constraints, evidencia y principios.
3. Registrar como compromiso que el rediseño preserva todo el product truth actual y que «Banquillo editorial» es la dirección visual confirmada, sin duplicar tokens visuales.
4. Verificar estructura y ausencia de afirmaciones no respaldadas.

### Task 2: Fundaciones visuales y contrato auditable

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/manifest.ts`
- Test: tests existentes del root layout/metadata, si los hay; crear un test semántico solo si existe un patrón vecino.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`, `vercel-react-best-practices`.

**Steps:**
1. Leer `docs/design-guides/frontend_styleguide.md` y Next 16 `03-layouts-and-pages.md`, `11-css.md`, `13-fonts.md`.
2. Ejecutar el test dirigido/baseline de layout; escribir primero una prueba solo para un comportamiento público que pueda romperse.
3. Sustituir tokens light/dark, radios, tipografía y estados por el sistema editorial; mantener `@import 'tailwindcss'` y compatibilidad shadcn.
4. Configurar cuerpo/display con `next/font` o fallback local compatible con Next 16, sin requests manuales ni dependencias.
5. Añadir al primer hijo de `body` el contrato emitido `THESIS/OWN-WORLD/STORY/FIRST VIEWPORT/FORM` y la línea `FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`; la forma está fijada por el usuario, no por sorteo.
6. Actualizar `themeColor`/manifest a los tokens confirmados; conservar metadata y providers.
7. Ejecutar test dirigido, `npm run lint` y `npx tsc --noEmit`.

### Task 3: Shell responsive y navegación

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/shared/AppSidebar.tsx`
- Modify: `src/components/shared/TopBar.tsx`
- Modify: `src/components/shared/BottomNav.tsx`
- Modify: `src/components/shared/SedeSwitcher.tsx`
- Modify: `src/components/shared/WorkspaceSwitcher.tsx`
- Modify: `src/components/shared/UserMenu.tsx`
- Test: tests de navegación/RBAC existentes o nuevos bajo `src/__tests__/` siguiendo el patrón del proyecto.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`, `vercel-react-best-practices`.

**Steps:**
1. Escribir un test de comportamiento para rutas visibles/activas por permisos y acciones móviles; comprobar RED cuando sea nuevo.
2. Rediseñar shell desktop con rail oscuro editorial y zona de trabajo papel; conservar `AuthGate`, providers, condiciones de onboarding/rol y colapsado.
3. Rediseñar TopBar y cabecera/BottomNav móvil con el mismo vocabulario; preservar destinos, hoja «Más», cambio de sede y sign-out.
4. Comprobar teclado, `aria-current`, áreas táctiles y breakpoints sin overflow.
5. Ejecutar tests dirigidos, `npm run lint` y `npx tsc --noEmit`.

### Task 4: Primitivas y componentes compartidos

**Files:**
- Modify as needed: `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `badge.tsx`, `table.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tabs.tsx`, `calendar.tsx`, `command.tsx`, `sidebar.tsx`, `sonner.tsx`, `skeleton.tsx`
- Modify: `src/components/shared/PageHeader.tsx`, `DataTable.tsx`, `MobileCardRow.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`, `FormField.tsx`, `MultiSelect.tsx`, `MultiCheckboxList.tsx`, `ConfirmDialog.tsx`
- Test: tests semánticos de `DataTable`, diálogos y campos bajo `src/__tests__/`.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`, `vercel-react-best-practices`.

**Steps:**
1. Añadir un tracer test que proteja encabezados/acciones/semántica de tabla y diálogo; RED → GREEN por comportamiento.
2. Traducir estados base, variantes, densidad, bordes, foco y feedback al sistema papel/tinta/coral sin cambiar APIs públicas.
3. Hacer que `DataTable` use tabla editorial en desktop y tarjetas deliberadas en móvil, preservando filtros, paginación, renderers y acciones.
4. Mantener shadcn accesible, contraste y reduced motion.
5. Ejecutar tests dirigidos, `npm run lint` y `npx tsc --noEmit`.

### Task 5: Dashboard Banquillo editorial

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Test: test existente o nuevo de filtros/calendario/apertura de sesión bajo `src/__tests__/`.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`, `vercel-react-best-practices`.

**Steps:**
1. Proteger con test observable filtro de fecha/equipo, selección de sesión y apertura de `SesionDetalleDialog`.
2. Rehacer composición desktop: topline y h1 editorial, métricas con regla superior/divisores, cuerpo 1.45/.85, semana de cinco columnas, día activo coral y foco lateral oscuro.
3. Rehacer composición móvil: una columna, métricas 2 columnas con primera full, semana 2 columnas con última full; mantener controles visibles y legibles.
4. Sustituir colores literales por roles semánticos sin modificar cálculos, fechas, datos ni handlers.
5. Ejecutar test dirigido, `npm run lint` y `npx tsc --noEmit`.

### Task 6: CRUD operativos — sedes, equipos, entrenadores, jugadores y ejercicios

**Files:**
- Modify as needed: `src/components/sedes/**`, `src/components/equipos/**`, `src/components/entrenadores/**`, `src/components/jugadores/**`, `src/components/ejercicios/**`
- Test: tests existentes de estos dominios bajo `src/__tests__/`.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`.

**Steps:**
1. Ejecutar tests dirigidos de cada dominio antes del cambio; añadir un test solo cuando la nueva composición requiera proteger una interacción accesible.
2. Restilar listados, formularios y detalles usando primitivas/shared; conservar RHF/Zod, props, mutaciones, validación, acciones y copy.
3. Revisar hardcodes/color-mix y estados/monogramas; mapearlos a roles editoriales sin perder significado.
4. Verificar tabla desktop, tarjeta móvil, crear/editar/ver/eliminar y errores.
5. Ejecutar tests dirigidos, `npm run lint` y `npx tsc --noEmit`.

### Task 7: CRUD y ajustes — sesiones, documentos, parámetros, usuarios, perfil, configuración y onboarding

**Files:**
- Modify as needed: `src/components/sesiones/**`, `src/components/documentos/**`, `src/components/parametros/**`, `src/components/usuarios/**`, `src/components/perfil/**`, `src/components/configuracion/**`, `src/components/onboarding/**`
- Modify as needed: rutas correspondientes en `src/app/(dashboard)/**`
- Test: tests existentes de esas superficies bajo `src/__tests__/`.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`.

**Steps:**
1. Ejecutar baseline dirigido y proteger interacciones públicas afectadas.
2. Traducir layouts, listados, formularios, tabs, dialogs y estados al sistema editorial; no cambiar flujos, roles, datos ni textos.
3. Diseñar responsive propio por superficie, sin limitarse a reducir tamaños.
4. Ejecutar tests dirigidos, `npm run lint` y `npx tsc --noEmit`.

### Task 8: Superficies públicas y landing

**Files:**
- Modify as needed: `src/app/login/page.tsx`, `src/app/join/**`, `src/app/register/**`, `src/app/landing/**`, `src/app/~offline/**`, `src/app/auth/callback/**`
- Modify: `src/components/landing/**`
- Test: tests de login/join/landing existentes bajo `src/__tests__/`.

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`, `frontend-design`, `impeccable`, `vercel-react-best-practices`.

**Steps:**
1. Proteger acciones, anchors, auth callbacks y estados con tests observables existentes/nuevos.
2. Traducir cada sección de landing al mundo editorial sin cambiar orden, copy, CTA, anchors ni animaciones funcionales.
3. Rediseñar auth/offline con composición desktop y móvil propia; conservar marca Google oficial, formularios y errores.
4. Sustituir colores inline; mantener rendimiento, accesibilidad y reduced motion.
5. Ejecutar tests dirigidos, `npm run lint` y `npx tsc --noEmit`.

### Task 9: Barrido visual, intención y evidencia

**Files:**
- Modify only findings in: `src/app/**`, `src/components/**`
- Evidence: `.impeccable/screenshots/**` or existing project screenshot directory.

**Skills:** `impeccable` (`craft-floor.md`), `frontend-design`, `clean-code`, `vercel-react-best-practices`; navegador `agent-browser`.

**Steps:**
1. Buscar colores/radios/sombras hardcodeados incompatibles y resolver solo hallazgos de alcance.
2. Ejecutar una sola vez `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json <changed-targets>` y corregir hallazgos mecánicos.
3. Levantar la app y capturar en una ronda conjunta 1280×800 y 375×667: login, dashboard, un listado con tabla/tarjetas, formulario+diálogo, menú «Más», sede y landing; contrastar lado a lado con el boceto.
4. Corregir en un único lote los fallos materiales y confirmar con como máximo una segunda ronda visual.
5. Ejecutar `npm run lint`, `npx tsc --noEmit`, `npm test -- --run` y `npm run build`.

### Task 10 (final, solo tras verifier verde): Actualizar documentación

**Files:**
- Modify: `DESIGN.md`
- Modify: `docs/design-guides/frontend_styleguide.md` si la nueva convención durable no queda documentada en DESIGN.md
- Modify: `docs/backlog.md` si existe/queda asignada una entrada concreta
- Keep: `docs/crud-audit.md` salvo que la verificación demuestre cambio funcional (no esperado)

**Skills:** `impeccable` (`document.md`), `writing-plans`, `clean-code`.

**Steps:**
1. Documentar `DESIGN.md` desde el sistema realmente construido: tokens, tipografía, retícula, componentes, estados, desktop/móvil y accesibilidad; no desde la intención previa.
2. Actualizar solo convenciones nuevas en la styleguide y marcar backlog cuando corresponda.
3. Registrar evidencia final y handoff; no ejecutar git.

## Verificación independiente final

El `verifier` ejecuta en orden: `npm run lint` → `npx tsc --noEmit` → `npm test -- --run` → `npm run build` → `npm run test:e2e`; revisa intención y funcionalidad en 1280×800 y 375×667 sobre todas las rutas públicas/autenticadas accesibles, con especial atención a `e2e/accessibility.spec.ts`, `e2e/rbac.spec.ts` y `e2e/crud-audit.spec.ts`. Debe comparar capturas con la opción 1 del boceto, comprobar contrato de dirección emitido, overflow, contraste, foco, navegación, formularios y acciones. Si falla, remediar con executor fresco y repetir el perfil `full` completo (máximo cinco rondas).
