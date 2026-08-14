# Landing Production Audit Implementation Plan

**Goal:** Corregir los fallos verificables de SEO técnico, accesibilidad, rendimiento y robustez de `/landing` sin modificar el dashboard ni otras superficies de producto.

**Architecture:** Mantener la landing como Server Component y aislar la única interacción cliente en sus componentes actuales. Centralizar la URL pública en una utilidad server-safe reutilizada por metadata, robots y sitemap; añadir las convenciones App Router de Next.js 16 para SEO/404; corregir navegación, formulario, contraste, movimiento e imágenes en los componentes existentes mediante diffs quirúrgicos.

**Tech Stack:** Next.js 16.2.1 App Router, React 19.2.4, TypeScript, Tailwind CSS v4, Framer Motion, Vitest y Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: cambios ordinarios de UI pública, metadata y route handler sin auth, persistencia ni migraciones.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; navegador en `/landing`, URL inexistente, `/robots.txt` y `/sitemap.xml` a 320, 375, 768, 1024 y 1440 px.
- Evidencias esperadas: estático/tests/build verdes; metadata absoluta y única; menú operable con teclado; formulario con estados accesibles; sin errores de consola ni recursos 404; ausencia de overflow horizontal en los viewports indicados.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

### Task 1: Especificar la infraestructura SEO pública

**Files:**
- Create: `src/lib/siteUrl.ts`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/not-found.tsx`
- Modify: `src/app/landing/page.tsx`
- Test: `src/__tests__/app/publicMetadata.test.tsx`
- Test: `src/__tests__/lib/siteUrl.test.ts`

**Step 1: Write the failing test** — cubrir prioridad `APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → localhost, canonical `/landing`, OG/Twitter absolutos, sitemap exclusivo de la landing, exclusión robots de rutas privadas y 404 con navegación útil.

**Step 2: Run test to verify it fails** — Run: `npm test -- --run src/__tests__/lib/siteUrl.test.ts src/__tests__/app/publicMetadata.test.tsx` · Expected: FAIL por módulos/rutas ausentes.

**Step 3: Write minimal implementation** — crear `getSiteUrl`, usar `title.absolute`, `metadataBase`, canonical, `openGraph.url/siteName`, imagen social absoluta y JSON-LD `WebSite` sin inventar Organization; generar robots/sitemap con la misma URL; 404 de marca con enlaces a `/landing` y `/login`.

**Step 4: Run test to verify it passes** — mismo comando · Expected: PASS.

### Task 2: Hacer accesible la navegación móvil

**Files:**
- Modify: `src/app/landing/page.tsx`
- Modify: `src/components/landing/LandingNav.tsx`
- Create: `src/__tests__/components/LandingNav.test.tsx`

**Step 1: Write the failing test** — comprobar `aria-expanded`/`aria-controls`, foco en el primer enlace al abrir, cierre con Escape, retorno de foco al botón y cierre al navegar.

**Step 2: Run test to verify it fails** — Run: `npm test -- --run src/__tests__/components/LandingNav.test.tsx` · Expected: FAIL.

**Step 3: Write minimal implementation** — añadir skip link, `id` del contenido principal, refs y listener de teclado limitado al menú abierto; mantener enlaces reales y un objetivo táctil mínimo de 44 px.

**Step 4: Run test to verify it passes** — mismo comando · Expected: PASS.

### Task 3: Robustecer formulario y API de lista de espera

**Files:**
- Modify: `src/components/landing/CtaSection.tsx`
- Modify: `src/app/api/waitlist/route.ts`
- Modify: `src/__tests__/components/CtaSection.test.tsx`
- Modify: `src/__tests__/api/waitlist.route.test.ts`

**Step 1: Write the failing test** — cubrir atributos de email/autocompletado, validación cliente, error con `role=alert`, éxito con `role=status`, conservación del email al fallar y excepción de Resend traducida a respuesta recuperable 502.

**Step 2: Run test to verify it fails** — Run: `npm test -- --run src/__tests__/components/CtaSection.test.tsx src/__tests__/api/waitlist.route.test.ts` · Expected: FAIL.

**Step 3: Write minimal implementation** — usar validación HTML nativa, anunciar feedback según resultado, conservar datos en error y capturar el fallo externo sin exponer detalles internos.

**Step 4: Run test to verify it passes** — mismo comando · Expected: PASS.

### Task 4: Corregir contraste, movimiento y entrega de imágenes

**Files:**
- Modify: `src/components/landing/Hero.tsx`
- Modify: `src/components/landing/LandingNav.tsx`
- Modify: `src/components/landing/CtaSection.tsx`
- Modify: `src/components/landing/TrainingVideoSection.tsx`
- Modify: `src/components/landing/MultisportSection.tsx`
- Modify: `src/components/landing/ModulesSection.tsx`
- Modify: `src/components/landing/MigrationSection.tsx`
- Modify: `src/components/landing/StarFeatureSection.tsx`
- Modify: `src/components/landing/LandingFooter.tsx`

**Step 1: Establish the failing baseline** — verificar que blanco/coral es 3,31:1, que `StarFeatureSection` no consulta `prefers-reduced-motion` y que los PNG fotográficos se sirven con `unoptimized`.

**Step 2: Write minimal implementation** — conservar coral y usar tinta (`#171614`, 5,47:1) en texto pequeño sobre coral; elevar contraste del pie; respetar movimiento reducido; retirar `unoptimized` solo de raster; añadir seguridad/aviso accesible en enlaces externos.

**Step 3: Run directed tests** — Run: `npm test -- --run src/__tests__/components/Hero.test.tsx src/__tests__/components/CtaSection.test.tsx src/__tests__/components/LandingNav.test.tsx` · Expected: PASS.

### Task 5: Verificación completa y visual

**Files:**
- Modify if needed: only files listed above

**Step 1: Static checks** — `npm run lint` y `npx tsc --noEmit` · Expected: PASS.

**Step 2: Unit suite** — `npm test -- --run` · Expected: PASS.

**Step 3: Production build** — `npm run build` · Expected: PASS y rutas públicas generadas.

**Step 4: Browser verification** — arrancar producción, comprobar `/landing`, `/ruta-inexistente`, `/robots.txt`, `/sitemap.xml`; consola, teclado, formulario, metadata, enlaces/recursos y viewports 320/375/768/1024/1440.

**Step 5: Mechanical UI detector** — `node C:\Users\juans\.codex\skills\impeccable\scripts\detect.mjs --json <changed landing targets>` · Expected: sin hallazgos deterministas pendientes.

### Task 6 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/design-guides/frontend_styleguide.md`
- Modify: `docs/plans/2026-08-14-landing-production-audit.md`

**Pasos:** registrar B15-8 como finalizada; documentar la fuente canónica de URL pública si se introduce la convención; registrar solo incidencias major/critical si las hubo; cerrar con un handoff que distinga correcciones, verificaciones, riesgos y datos pendientes del propietario.

## Resultado de ejecución

- `npm run lint`: PASS, 0 errores; conserva 2 warnings preexistentes fuera de la landing en `SedeForm.test.tsx`.
- `npx tsc --noEmit --pretty false`: PASS después de regenerar los tipos de Next con el build.
- `npm test -- --run --reporter=dot --pool=threads --maxWorkers=4`: PASS, 102 archivos y 571 tests.
- `npm run build`: PASS; `/landing`, `/_not-found`, `/robots.txt` y `/sitemap.xml` prerenderizados.
- Detector Impeccable: PASS, `[]`.
- Navegador sobre `next start`: PASS en 320, 375, 768, 1024 y 1440 px; sin overflow; foco/menú/Escape correctos; 404 con estado 404; metadata/JSON-LD y recursos de landing verificados.
- Pendiente del propietario: configurar `APP_URL` si el dominio canónico no coincide con `VERCEL_PROJECT_PRODUCTION_URL`.
