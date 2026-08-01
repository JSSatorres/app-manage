# Landing Satorus y lista de espera Implementation Plan

**Goal:** Transformar la landing de SportApp en una página de captación visualmente diferenciada y claramente respaldada por Satorus.es, con una lista de espera que reenvía cada solicitud a `admin@satorus.es` sin persistir datos.

**Architecture:** La landing conservará la identidad visual existente de Manage Sport App, renovando el hero y la acción final de lista de espera. Un componente cliente enviará el correo a un Route Handler de Next.js; el handler validará el payload con Zod y delegará el envío a Resend usando solo variables de entorno de servidor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Zod, Resend, next/image y Vitest/Testing Library.

## Perfil de verificaciÃ³n

- Nivel: standard
- Motivo: UI pÃºblica y endpoint de captaciÃ³n sin autenticaciÃ³n ni persistencia; el correo depende de una clave y dominio verificados fuera del repositorio.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; comprobaciÃ³n visual y de formulario en desktop y 375Ã—667 con agent-browser.
- Evidencias esperadas: la landing identifica Satorus.es, muestra capacidades reales de la aplicaciÃ³n, el formulario valida correo y refleja Ã©xito/error, y el Route Handler envÃ­a a `admin@satorus.es` cuando existen `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.

## Incidencias de verificaciÃ³n

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

---

## Decisiones cerradas

- Marca visible: `satorus.` y menciÃ³n a Satorus.es como producto.
- Destinatario fijo: `admin@satorus.es`.
- No se crea tabla, cookie, analytics ni almacenamiento de direcciones de la lista de espera.
- La landing conserva la identidad visual de Manage Sport App: azul principal, fondos blancos/neutros, tarjetas y radios ya presentes en su interfaz. Satorus.es se presenta únicamente como la empresa detrás del producto, no como fuente del estilo visual.
- Se retiran precios, testimonios y prueba social no verificables de la landing actual.
- El usuario configura las variables de entorno y verifica el remitente de `satorus.es` en Resend tras el cambio; ningún secreto se añade al repositorio.

### Task 1: Añadir la integración de correo y su contrato

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/schemas/waitlist.schema.ts`
- Create: `src/app/api/waitlist/route.ts`
- Create: `src/__tests__/schemas/waitlist.schema.test.ts`
- Create: `src/__tests__/api/waitlist.route.test.ts`
- Modify: `.env.example`

**Step 1: Write the failing test**

Definir pruebas de contrato para un correo válido, valores vacíos/incorrectos y el Route Handler: `400` para payload inválido, `503` sin configuración y `200` cuando la llamada mockeada a Resend resulta correcta.

**Step 2: Run test to verify it fails** â€” Run: `npm test -- --run src/__tests__/schemas/waitlist.schema.test.ts src/__tests__/api/waitlist.route.test.ts` Â· Expected: FAIL

**Step 3: Write minimal implementation**

Instalar `resend`; crear un schema Zod de un único campo `email`; implementar `POST /api/waitlist` con JSON estricto, receptor constante `admin@satorus.es`, asunto y cuerpo sin interpolar HTML no confiable. Leer `RESEND_API_KEY` y `RESEND_FROM_EMAIL` solo en servidor, responder con mensajes seguros y documentar únicamente los nombres de variables de entorno.

**Step 4: Run test to verify it passes** â€” Run: `npm test -- --run src/__tests__/schemas/waitlist.schema.test.ts src/__tests__/api/waitlist.route.test.ts` Â· Expected: PASS

### Task 2: Crear los recursos visuales de la campaña

**Files:**
- Create: `public/landing/satorus-club-workbench.png`

**Step 1: Generate and inspect the asset**

Generar con ImageGen una fotografía editorial cenital para el hero: mesa de trabajo de un club deportivo, pizarra táctica, balón, libreta de sesiones y móvil, sin texto ni logotipos, espacio visual disponible para la ruta naranja HTML/SVG. Inspeccionar composición y evitar que se presente como una instalación o cliente real.

**Step 2: Add the selected asset**

Copiar la variante aprobada a `public/landing/` con tamaño intrínseco conocido y usarla únicamente mediante `next/image`.

### Task 3: Reconstruir la landing con el sistema visual de Satorus

**Files:**
- Modify: `src/app/landing/page.tsx`
- Modify: `src/components/landing/LandingNav.tsx`
- Modify: `src/components/landing/Logo.tsx`
- Create: `src/components/landing/SatorusHero.tsx`
- Create: `src/components/landing/ProductStory.tsx`
- Create: `src/components/landing/WaitlistSection.tsx`
- Modify: `src/components/landing/LandingFooter.tsx`
- Create: `src/__tests__/components/WaitlistSection.test.tsx`

**Step 1: Write the failing test**

Probar que el formulario etiqueta el campo correo, impide el envío vacío, hace `POST /api/waitlist` con un correo válido y anuncia el estado de éxito o error.

**Step 2: Run test to verify it fails** â€” Run: `npm test -- --run src/__tests__/components/WaitlistSection.test.tsx` Â· Expected: FAIL

**Step 3: Write minimal implementation**

Aplicar la paleta, tipografía y reglas de materialidad de Satorus. El hero hará visible la marca y la promesa del producto para clubes; la ruta naranja será SVG/CSS semántico y reducirá movimiento según preferencias. La historia expondrá capturas reales de dashboard, sesiones, ejercicios, documentos, roles e importación, sin inventar resultados. La lista de espera será el CTA dominante y el footer mostrará Satorus.es.

**Step 4: Run test to verify it passes** â€” Run: `npm test -- --run src/__tests__/components/WaitlistSection.test.tsx` Â· Expected: PASS

### Task 4: Verificar y actualizar documentación

**Files:**
- Modify: `docs/backlog.md`
- Modify (si aplica): `docs/design-guides/frontend_styleguide.md`

**Step 1: Run static and test checks** â€” Run: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build` Â· Expected: PASS

**Step 2: Verify intent in browser**

Arrancar la aplicación, comprobar `/landing` en escritorio y en 375Ã—667, enviar un correo de prueba contra una configuración de Resend disponible o verificar el estado de configuración ausente sin revelar secretos.

**Step 3: Update documentation**

Añadir y marcar la tarea de renovación de la landing y lista de espera en `docs/backlog.md`. Actualizar la guía frontend solo si el cambio introduce una convención reutilizable.

## Refinamiento visual desde capturas — 01/08/2026

- Sustituir los fondos blancos continuos por campos cromáticos suaves y secciones de alto contraste basadas en el azul de SportApp.
- Añadir una sección multideporte con fotografía de fútbol y voleibol, sin presentar los equipos como clientes reales.
- Explicar el flujo de entrenamiento en pista: el manager prepara el contenido y el entrenador lo muestra desde móvil o tableta.
- Recortar las capturas de dashboard, documentos y ejercicios para eliminar lienzo vacío y centrar la interfaz útil.
- Verificar la landing en escritorio y en 375×667, además de ESLint, TypeScript y el detector visual de Impeccable.
