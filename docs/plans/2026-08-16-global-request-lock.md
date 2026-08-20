# Global Request Lock Implementation Plan

**Goal:** Añadir un bloqueo global reutilizable, accesible y en español que cubra toda mutación iniciada desde la UI, impida dobles envíos e interacción/navegación interna mientras haya al menos una operación pendiente.

**Architecture:** `RequestLockProvider` vivirá dentro del único `QueryClientProvider`, combinará `useIsMutating()` con un contador manual expuesto mediante `run(asyncFn)` y envolverá el árbol completo de la aplicación en un contenedor `inert`. Un overlay hermano a nivel React se montará mediante portal como hijo directo de `document.body`, por encima de `z-60`; así puede excluirse con seguridad al inertizar los demás roots/portales de `body`, mientras los componentes con navegación imperativa consultan el mismo contexto.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TanStack React Query, Tailwind CSS, Base UI/shadcn, Vitest + Testing Library y Playwright.

## Perfil de verificación

- Nivel: full
- Motivo: cambio transversal en toda la aplicación que afecta auth, pagos Stripe, operaciones persistentes, navegación y prevención de doble envío. No cambia contratos de datos ni esquema, pero un fallo podría duplicar escrituras o pagos y bloquear flujos críticos.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/global-request-lock.spec.ts --project=chromium --project="Mobile Chrome"`.
- Evidencias esperadas: estático, suite completa y build verdes; pruebas con promesas diferidas demuestran bloqueo automático y manual, concurrencia, rechazo y cleanup; E2E real en escritorio y móvil observa una única petición demorada, overlay accesible, árbol y portales inertes, navegación interna bloqueada y desbloqueo al finalizar.

## Incidencias de verificación

### Ronda 1 — 16/08/2026 — RESUELTA

- Severidad: major
- Estado: resuelta el 16/08/2026
- Impacto inicial: el gate FULL quedó bloqueado y la cobertura transversal no estaba verificada; `npm test -- --run` finalizó con 10 tests fallidos y 638 tests superados.
- Causa: tres harnesses existentes (`publicMetadata`, `economia.page` y `MovimientosEconomicosTable`) renderizaban nuevos consumidores sin el contexto de `RequestLockProvider`.
- Corrección: se añadieron mocks transparentes de `useRequestLock`, con `run` ejecutando la operación y `pending=false`, en los harnesses de `publicMetadata`, `economia.page` y `MovimientosEconomicosTable`, preservando sus aserciones existentes.
- Evidencia verde: pruebas dirigidas 16/16, ESLint, typecheck y suite completa con 109 archivos y 648 tests superados.

### Ronda 2 — 16/08/2026 — RESUELTA / NO CAUSAL

- Severidad: major
- Estado: resuelta como no causal el 16/08/2026
- Impacto inicial: el gate FULL quedó bloqueado; la suite completa finalizó con 649/653 tests y 108/109 archivos superados.
- Evidencia inicial: cuatro fallos dependientes del orden en `DocumentosListView`; el archivo aislado superaba 22/22 tests, mientras lint, typecheck, pruebas dirigidas, build y E2E 2/2 estaban verdes.
- Diagnóstico: no hay evidencia de interferencia de `RequestLockProvider` bajo el aislamiento normal de Vitest; `RequestLockProvider` + `DocumentosListView` superan 34/34 tests y `DocumentosListView` aislado supera 22/22. No se modificó Documentos.
- Corrección: ninguna de producto; el fallo transitorio/dependiente del orden no volvió a reproducirse.
- Evidencia verde, re-verificación FULL ronda 3 (16/08/2026): lint PASS, typecheck PASS, pruebas dirigidas 74/74, suite completa 109 archivos/653 tests PASS, build PASS y E2E Chromium + Mobile 2/2 PASS.

---

## Contexto descubierto (16/08/2026)

- `src/app/layout.tsx:87` monta `QueryProvider` por encima de todos los segmentos: landing, login, onboarding y dashboard. No hace falta añadir providers por layout de ruta.
- `src/providers/query-provider.tsx:6-23` contiene el único `QueryClientProvider` y conserva un `QueryClient` estable mediante `useState`.
- `src/hooks/useMutation.ts:39-83` es el wrapper común. Su `onSuccess` retorna la promesa de `invalidateQueries` cuando `awaitInvalidation` está activo (`:53-61`), por lo que React Query mantiene la mutación pendiente durante la invalidación.
- El inventario actual encuentra 47 consumidores del wrapper, no 46. El criterio de cobertura será comportamental —toda mutación del wrapper queda observada— y no un conteo codificado. No se añadirá una lista manual de mutation keys.
- Operaciones directas fuera de React Query: alta de club, login/OAuth, logout, perfil/avatar, contraseña, waitlist, tres flujos Stripe, importación, clonación de sede y el guardado directo/bulk de bloques de sesión.
- `useSesionBloques(sesionId)` sólo sirve con un identificador estable. No sustituye sin complejidad el alta ni el bucle bulk de `SesionForm`; el plan envuelve el submit completo y no fuerza una abstracción distinta por rama.
- Base UI crea portales fuera del wrapper React visible (`dialog.tsx`, `alert-dialog.tsx`, dropdown, select, sheet, popover y tooltip). El overlay bloquea puntero, pero eso por sí solo no garantiza teclado/foco: los portales requieren `inert` y cleanup explícitos.
- La guía local exige React Query para server state y reserva Zustand para estado cliente global (`docs/design-guides/frontend_styleguide.md:37-49`). Este cambio usa Context local al provider y no añade Zustand ni dependencias.
- Next.js 16 documenta providers cliente bajo el root layout y `router.push/replace/back/forward`, pero no expone eventos cancelables del App Router. No se parcheará el router ni se prometerá cancelar navegación del navegador.

## Contrato funcional e invariantes

El contexto público será deliberadamente pequeño:

```ts
type RequestLockContextValue = {
  pending: boolean
  run<T>(operation: () => Promise<T>): Promise<T>
}
```

- `pending` es verdadero cuando `useIsMutating() + manualPendingCount > 0`.
- `run` incrementa antes de invocar la función, espera su resultado y decrementa exactamente una vez en `finally`; devuelve el mismo valor y propaga el mismo error. También limpia si la función lanza sincrónicamente.
- Dos operaciones legítimas pueden coexistir. Resolver o rechazar una no desbloquea hasta que termine la última. El contador nunca puede quedar negativo.
- `run` no deduplica llamadas ni sustituye las flags locales. Cada handler manual conserva/añade una ref síncrona `inFlight` por operación (además de `disabled`/estado visual): consulta la ref antes de entrar, la activa antes de `run` y la limpia en `finally`. Así se cierra la ventana de dos eventos en el mismo tick sin impedir concurrencia legítima entre operaciones distintas.
- El contenedor de contenido usa `inert={pending}` y `aria-busy={pending}`. El overlay sólo aparece durante el lock, usa `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, texto `Procesando solicitud…` y `z-[100]` o un valor equivalente superior a `z-60`.
- El spinner visual es decorativo (`aria-hidden`) y se construye con las utilidades existentes; no se añade paquete.
- El overlay se crea con `createPortal(..., document.body)` y lleva un marcador/ref inequívoco. Mientras el lock está activo, los demás hijos directos de `document.body` —incluido el root de la aplicación y los roots creados por Base UI— se vuelven inertes; nunca se inerta un ancestro del overlay. Se preserva el estado `inert` previo de cada nodo, se observan portales añadidos durante el lock y se restaura todo al resolver, rechazar o desmontar.
- Quedan bloqueados los controles y la navegación intra-DOM iniciada por el usuario. No se promete cancelar back/forward nativo, refresh, cierre de pestaña, enlaces externos/nueva pestaña ni redirecciones programáticas inevitables después de Stripe/OAuth; no se añade `beforeunload`.
- Los toasts, mensajes de error, callbacks de éxito y redirecciones actuales conservan orden y semántica. El lock no traga excepciones ni convierte rechazos en éxito.
- No hay migración, cambio de API/BD, dependencia nueva, store Zustand ni modificación necesaria de `src/app/layout.tsx`.

## Criterios de aceptación

1. Cualquier mutación basada en `src/hooks/useMutation.ts` activa automáticamente el overlay desde el inicio hasta terminar también su invalidación.
2. Toda operación directa catalogada que escriba o dispare una acción externa persistente usa `run`. Quedan explícitamente fuera `handleExport`/descarga, `buildExportBlob` y la mera lectura local de un archivo; no son mutaciones.
3. Landing, login, onboarding y dashboard reciben el mismo provider desde la raíz.
4. Con una o varias operaciones pendientes, el contenido y los portales Base UI quedan inertes, el overlay es perceptible y accesible, y no se dispara navegación interna ni un segundo submit.
5. El overlay permanece hasta la última resolución o rechazo concurrente y siempre desaparece al quedar el contador en cero, sin atributos `inert` residuales.
6. Los flujos manuales mantienen sus errores, toasts y destinos actuales. Las llamadas de red, callbacks y redirecciones se ejecutan una sola vez.
7. No se intenta bloquear capacidades que Next.js 16/el navegador no hacen cancelables y no se usa `beforeunload` como garantía de integridad.
8. No se modifica `docs/crud-audit.md` ni se crea migración.

### Task 1: Crear el contrato y el provider global con TDD

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (Context/hooks y React Query, que sí figuran en la guía del proyecto).

**Files:**
- Create: `src/providers/request-lock-provider.tsx`
- Create: `src/__tests__/providers/RequestLockProvider.test.tsx`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:379-413`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md:41-45,89`

**Step 1: Escribir el harness de prueba**

Montar un `QueryClientProvider` aislado, `RequestLockProvider`, un consumidor que exponga `pending/run` y promesas diferidas controlables. Usar un `QueryClient` nuevo por test y desactivar retries para evitar contaminación.

**Step 2: Escribir las pruebas fallidas del contador manual**

Cubrir: overlay oculto en reposo; aparición al invocar `run`; contenido con `inert` y `aria-busy`; rol/texto live en español; mantenimiento hasta `resolve`; propagación de valor; propagación de `reject`; lanzamiento sincrónico; y contador concurrente con dos promesas que no desbloquea al terminar sólo una.

**Step 3: Escribir las pruebas fallidas de portales y cleanup**

Crear un portal antes y otro después de iniciar el lock. Verificar que ambos se vuelven inertes, que el overlay queda fuera de ese bloqueo, que un nodo previamente inerte conserva su estado y que resolve/reject/unmount restauran atributos y desconectan el observer.

**Step 4: Ejecutar las pruebas y confirmar RED** — Run: `npm test -- --run src/__tests__/providers/RequestLockProvider.test.tsx` · Expected: FAIL porque el provider todavía no existe.

**Step 5: Implementar el mínimo provider/context/hook**

Crear `RequestLockProvider` y `useRequestLock` con el contrato anterior. Combinar `useIsMutating()` y contador manual, renderizar wrapper + overlay como hermanos React, montar el overlay con `createPortal` directamente en `document.body` y encapsular el manejo de los demás roots/portales en un efecto con restauración idempotente. No modificar `document.body` cuando `pending` sea falso.

**Step 6: Verificar accesibilidad y foco**

Asegurar que el overlay no contiene controles, el live region no duplica anuncios y ningún elemento dentro de un portal inerte puede recibir foco o activación por teclado durante el lock.

**Step 7: Ejecutar las pruebas y confirmar GREEN** — Run: `npm test -- --run src/__tests__/providers/RequestLockProvider.test.tsx` · Expected: PASS sin warnings de `act`, updates tras unmount ni observers abiertos.

### Task 2: Integrar el provider con React Query en la raíz

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/providers/query-provider.tsx:5-29`
- Modify: `src/__tests__/providers/RequestLockProvider.test.tsx`
- Modify only if the existing mock breaks: `src/__tests__/app/dashboard.layout.test.tsx:65-97`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:379-413`

**Step 1: Escribir la prueba fallida de mutación React Query**

Renderizar el `QueryProvider` de producción —no el harness directo de Task 1— con un consumidor real de React Query e iniciar una mutation con una promesa diferida. Verificar que aparece el overlay sin llamar a `run` y que desaparece al resolver/rechazar.

**Step 2: Probar la invalidación pendiente**

En el mismo árbol del `QueryProvider` de producción, usar el wrapper de `src/hooks/useMutation.ts` con un `onSuccess`/invalidación diferido y demostrar que el lock continúa después de resolver la función de mutación hasta completar la promesa retornada por invalidación. No hardcodear el conteo actual de 47 hooks.

**Step 3: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/providers/RequestLockProvider.test.tsx` · Expected: FAIL porque `QueryProvider` aún no monta el lock global.

**Step 4: Montar `RequestLockProvider` dentro del provider de Query**

Orden requerido: `QueryClientProvider` → `RequestLockProvider` → `{children}`. No crear otro `QueryClient`, no mover el provider a layouts secundarios y no tocar `src/app/layout.tsx` salvo que el código real haya cambiado desde el discovery.

**Step 5: Ejecutar pruebas dirigidas** — Run: `npm test -- --run src/__tests__/providers/RequestLockProvider.test.tsx src/__tests__/app/dashboard.layout.test.tsx` · Expected: PASS; ajustar el mock del layout sólo si el nuevo wrapper lo exige, sin cambiar las aserciones de dominio.

### Task 3: Cubrir auth, onboarding, perfil y waitlist fuera de React Query

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/app/login/page.tsx:24-67`
- Modify: `src/components/onboarding/CreateClubForm.tsx:37-58`
- Modify: `src/components/perfil/PerfilForm.tsx:60-123`
- Modify: `src/components/perfil/CambiarContrasenaForm.tsx:43-60`
- Modify: `src/components/landing/CtaSection.tsx:11-35`
- Create: `src/__tests__/app/login.page.test.tsx`
- Create: `src/__tests__/components/CreateClubForm.test.tsx`
- Create: `src/__tests__/components/PerfilForm.test.tsx`
- Create: `src/__tests__/components/CambiarContrasenaForm.test.tsx`
- Modify: `src/__tests__/components/CtaSection.test.tsx:5-59`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:379-413`
- Read before implementation: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:42-55`

**Step 1: Añadir tests fallidos por componente**

Mockear `useRequestLock` con un `run` transparente por defecto y controlable en cada test. Para `handleEmailLogin`, `handleGoogleLogin`, `CreateClubForm.onSubmit`, ambos flujos de `PerfilForm`, `CambiarContrasenaForm.onSubmit` y `CtaSection.handleSubmit`, comprobar una invocación de `run`, una sola llamada remota ante dos eventos en el mismo tick y controles deshabilitados cuando `pending=true`.

**Step 2: Fijar contratos de error y éxito en tests**

Conservar los mensajes/toasts existentes, no redirigir tras error, y redirigir/limpiar formulario exactamente una vez tras éxito. En OAuth, aceptar que la navegación externa inevitable puede sustituir la página antes del cleanup visible.

**Step 3: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/app/login.page.test.tsx src/__tests__/components/CreateClubForm.test.tsx src/__tests__/components/PerfilForm.test.tsx src/__tests__/components/CambiarContrasenaForm.test.tsx src/__tests__/components/CtaSection.test.tsx` · Expected: FAIL en las expectativas del lock.

**Step 4: Envolver cada frontera asíncrona completa**

Usar `run(() => operaciónActual())`, incluyendo upload + metadata del avatar como una sola operación visible. En cada handler, añadir/reutilizar una ref `inFlight` síncrona y mantener la flag local de UI: guard al inicio, alta antes de `run`, cleanup en `finally`. No mover lógica de auth al contexto ni introducir un wrapper de fetch global.

**Step 5: Ejecutar y confirmar GREEN** — Run: repetir el comando dirigido del Step 3 · Expected: PASS; mismas rutas, mensajes y callbacks que antes.

### Task 4: Cubrir los tres flujos manuales de Stripe

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/components/economia/StripeCheckoutButton.tsx:32-57`
- Modify: `src/components/economia/StripeRefundDialog.tsx:51-80`
- Modify: `src/components/economia/StripeConnectionCard.tsx:86-124`
- Modify: `src/__tests__/components/StripeCheckoutButton.test.tsx:8`
- Modify: `src/__tests__/components/StripeRefundDialog.test.tsx:8`
- Modify: `src/__tests__/components/StripeConnectionCard.test.tsx:9`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:379-413`

**Step 1: Escribir pruebas fallidas de locking y doble envío**

Usar respuestas fetch diferidas. Para checkout, refund y connect, comprobar `run` una vez, una petición por endpoint, botón/confirmación deshabilitado con lock y persistencia de errores HTTP existentes.

**Step 2: Fijar el orden de efectos**

Checkout sólo abre/navega tras recibir URL; refund sólo invoca `onRequested` tras respuesta válida; Connect conserva la secuencia account → account-link → redirect. Un error en cualquier etapa no ejecuta los pasos posteriores.

**Step 3: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/components/StripeCheckoutButton.test.tsx src/__tests__/components/StripeRefundDialog.test.tsx src/__tests__/components/StripeConnectionCard.test.tsx` · Expected: FAIL en las nuevas expectativas.

**Step 4: Envolver cada flujo, no cada fetch por separado**

Checkout y refund usan una frontera `run` cada uno. Connect envuelve ambas peticiones secuenciales y la entrega de la URL en una sola frontera; cada disparador usa su ref `inFlight` síncrona además de la flag visual. No intentar esperar que `window.location.assign` complete ni bloquear una nueva pestaña.

**Step 5: Ejecutar y confirmar GREEN** — Run: repetir el comando del Step 3 · Expected: PASS, sin duplicar callbacks ni alterar textos de error.

### Task 5: Cubrir importación, clonación de sede y guardado multietapa de sesión

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/components/configuracion/DataExportImportSection.tsx:43-102`
- Modify: `src/components/sedes/SedeForm.tsx:172-190`
- Modify: `src/components/sesiones/SesionForm.tsx:374-473`
- Create if absent: `src/__tests__/components/DataExportImportSection.test.tsx`
- Modify: `src/__tests__/components/SedeForm.test.tsx:93-239`
- Modify: `src/__tests__/components/SesionForm.test.tsx:99-327`
- Read for compatibility, do not modify unless required by changed code: `src/hooks/useSesionBloques.ts:18-48`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md:379-413`

**Step 1: Escribir pruebas fallidas de fronteras completas**

Cubrir importación local, importación desde Google, `SedeForm.submitClone` y los submits single/bulk de `SesionForm`. Cada prueba usa una promesa diferida y verifica una sola frontera `run`, un solo efecto persistente por gesto, bloqueo hasta el último paso y propagación del error actual.

**Step 2: Delimitar lectura frente a escritura**

No envolver `handleExport`/`buildExportBlob` ni la mera lectura local. Para Google, abarcar fetch + importación en una sola operación; extraer un helper interno sin lock si hace falta para evitar `run` anidado. El lock no reemplaza `isImporting` ni la validación existente.

**Step 3: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/components/DataExportImportSection.test.tsx src/__tests__/components/SedeForm.test.tsx src/__tests__/components/SesionForm.test.tsx` · Expected: FAIL en expectativas de lock/concurrencia.

**Step 4: Integrar el lock manual**

Envolver sólo `submitClone` en sede. En sesión, envolver el submit completo que crea/actualiza y después ejecuta `saveBlocks`, de modo que la transición entre una mutation React Query y `replaceSesionBloques` nunca deje el UI desbloqueado. Los tres disparadores conservan su estado visual y añaden/reutilizan ref `inFlight` síncrona. No reemplazar el bucle bulk por `useSesionBloques(sesionId)`: su ID fijo no encaja con IDs creados dinámicamente; sí conservar ese hook como patrón si el código real ofrece una rama de edición con ID estable sin duplicar lógica.

**Step 5: Ejecutar y confirmar GREEN** — Run: repetir el comando del Step 3 · Expected: PASS; no se producen escrituras reales en tests.

### Task 6: Bloquear navegación imperativa, logout y menús/portales

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Files:**
- Modify: `src/components/shared/AppLink.tsx:12-30`
- Modify: `src/components/shared/AppSidebar.tsx:57-84`
- Modify: `src/components/shared/BottomNav.tsx:86-95,168-239`
- Modify: `src/components/shared/UserMenu.tsx:34-52`
- Modify: `src/__tests__/components/navigation.test.tsx:39-74`
- Modify only if portal rendering changes its assumptions: `src/__tests__/app/dashboard.layout.test.tsx:65-97`
- Modify: `src/__tests__/providers/RequestLockProvider.test.tsx`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:42-55`

**Step 1: Escribir pruebas fallidas de navegación**

Con `pending=true`, comprobar que `AppLink` no llama `push/replace/back`, expone estado no interactuable apropiado; los botones del sidebar/bottom nav no cambian ruta/club; y UserMenu/BottomNav no llaman signOut dos veces. Con `pending=false`, todas las rutas actuales siguen funcionando.

**Step 2: Añadir una prueba de portal Base UI real**

Abrir un dialog/menu antes de iniciar una promesa manual, confirmar que el portal queda inerte y que sus botones no reciben activación de puntero/teclado; resolver y comprobar que recupera exactamente su estado previo.

**Step 3: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/components/navigation.test.tsx src/__tests__/providers/RequestLockProvider.test.tsx src/__tests__/app/dashboard.layout.test.tsx` · Expected: FAIL en guards/portal.

**Step 4: Consumir el contexto en navegación imperativa**

Añadir guards/disabled/`aria-disabled` sin reescribir todos los `<Link>` de contenido: el wrapper `inert` cubre navegación declarativa. Envolver ambos `handleSignOut` con `run`, protegerlos con una ref `inFlight` síncrona y mantener su redirect actual. No parchear globalmente `useRouter`, History API, anchors externos ni `beforeunload`.

**Step 5: Ejecutar y confirmar GREEN** — Run: repetir el comando del Step 3 · Expected: PASS en lock e interacción normal posterior.

### Task 7: Añadir E2E real desktop + móvil del bloqueo global

**Skills:** `tdd`, `javascript-testing-patterns`; ejecución por subagente `testing` con Playwright y `agent-browser` para inspección interactiva sólo si una aserción de interacción/foco necesita diagnóstico.

**Files:**
- Create: `e2e/global-request-lock.spec.ts`
- Read before implementation: `AGENTS.md`
- Read before implementation: `docs/design-guides/frontend_styleguide.md`
- Read before implementation: `playwright.config.ts:7-40`
- Read before implementation: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:42-55`
- Reference patterns: `e2e/onboarding.spec.ts:8`
- Reference patterns: `e2e/economia-stripe.spec.ts`
- Reference patterns: `e2e/sede-clone.spec.ts`

**Step 1: Escribir el escenario fallido con red interceptada**

En una ruta pública estable (preferentemente CTA/waitlist para no crear datos), interceptar `/api/waitlist`, contar peticiones y retener la respuesta con una barrera controlada por el test. Tras submit, observar `role=status`, texto español, `aria-busy` e `inert`.

**Step 2: Probar interacción real durante la demora**

Con coordenadas reales/puntero y teclado, intentar un segundo submit y una navegación interna visible. Confirmar contador de red igual a 1 y URL sin cambio. La cobertura de portales se mantiene en Vitest con un portal Base UI real, porque la CTA pública no abre ninguno; no inventar un fixture autenticado ni una escritura sólo para repetirla en E2E. No usar `force: true` como evidencia de comportamiento de usuario.

**Step 3: Liberar la respuesta y verificar cleanup**

Confirmar desaparición del status, retirada de `aria-busy/inert`, controles otra vez operables y navegación interna funcional. La prueba de rechazo/concurrencia permanece en Vitest para no duplicar escenarios.

**Step 4: Ejecutar y confirmar RED antes de la implementación completa** — Run: `npm run test:e2e -- e2e/global-request-lock.spec.ts --project=chromium --project="Mobile Chrome"` · Expected: FAIL antes de terminar Tasks 1-6.

**Step 5: Ejecutar tras Tasks 1-6** — Run: repetir el comando anterior · Expected: PASS en `chromium` (Desktop Chrome) y `Mobile Chrome` (Pixel 5), sin escritura de BD adicional.

### Task 8: Verificación FULL independiente

**Skills:** `javascript-testing-patterns`; subagente `verifier` perfil `full`, y subagente `testing` para E2E Playwright/agent-browser. El verifier no puede rebajar el perfil.

**Files:**
- Verify: `src/providers/request-lock-provider.tsx`
- Verify: `src/providers/query-provider.tsx`
- Verify: todos los componentes y tests modificados en Tasks 3-7
- Record only major/critical incidents: `docs/plans/2026-08-16-global-request-lock.md` bajo `## Incidencias de verificación`

**Step 1: Ejecutar estático** — Run: `npm run lint` · Expected: PASS sin nuevos warnings.

**Step 2: Ejecutar typecheck** — Run: `npx tsc --noEmit` · Expected: PASS, incluido el genérico `run<T>` y el atributo `inert` con React 19.

**Step 3: Ejecutar pruebas dirigidas** — Run: `npm test -- --run src/__tests__/providers/RequestLockProvider.test.tsx src/__tests__/app/login.page.test.tsx src/__tests__/components/CreateClubForm.test.tsx src/__tests__/components/PerfilForm.test.tsx src/__tests__/components/CambiarContrasenaForm.test.tsx src/__tests__/components/CtaSection.test.tsx src/__tests__/components/StripeCheckoutButton.test.tsx src/__tests__/components/StripeRefundDialog.test.tsx src/__tests__/components/StripeConnectionCard.test.tsx src/__tests__/components/DataExportImportSection.test.tsx src/__tests__/components/SedeForm.test.tsx src/__tests__/components/SesionForm.test.tsx src/__tests__/components/navigation.test.tsx` · Expected: PASS.

**Step 4: Ejecutar suite completa** — Run: `npm test -- --run` · Expected: PASS sin regresiones.

**Step 5: Ejecutar build de Next.js 16** — Run: `npm run build` · Expected: PASS sin errores de hydration, Server/Client Components o atributos DOM.

**Step 6: Ejecutar E2E agrupado** — Run: `npm run test:e2e -- e2e/global-request-lock.spec.ts --project=chromium --project="Mobile Chrome"` · Expected: PASS en ambos proyectos, una petición, lock visible y cleanup. Usar `agent-browser` sólo para evidencia interactiva/reproducción si Playwright detecta un problema de puntero, teclado, foco o portal.

**Step 7: Revisar criterios y límites**

Cruzar UI↔red mediante el contador de la ruta interceptada; no escribir en BD porque no cambian datos ni contratos. Confirmar manualmente que no se documenta garantía sobre history/refresh/cierre/enlaces externos/redirecciones inevitables. Si hay fallo major/critical, registrar ronda/evidencia en Incidencias y devolver a un executor fresco; repetir el perfil completo tras la corrección.

### Task 9 (final): Actualizar documentación después de verificación verde

**Skills:** ninguna skill de implementación; cierre documental según AGENTS.md.

**Gate:** esta tarea queda explícitamente diferida hasta que Task 8 haya pasado completa. No marcar trabajo terminado con verificaciones rojas o pendientes.

**Files:**
- Modify: `docs/backlog.md:196-202`
- Modify: `docs/design-guides/frontend_styleguide.md`
- Do not modify: `docs/crud-audit.md`

**Step 1: Registrar backlog**

Añadir `B13-6` con descripción inequívoca del bloqueo global de mutaciones y dejarla marcada `[x]` sólo tras el verifier verde.

**Step 2: Documentar la convención frontend**

Añadir una sección breve: React Query se observa automáticamente desde `RequestLockProvider`; operaciones async persistentes/externas fuera del wrapper usan `useRequestLock().run`; conservar flags locales anti-doble-submit; portales quedan inertes; y los límites de navegación son exclusivamente intra-DOM.

**Step 3: Verificar documentación**

Comprobar enlaces/rutas, LF y que no se haya tocado `docs/crud-audit.md`. Expected: backlog y guía reflejan exactamente el contrato verificado, sin prometer cancelación de eventos que Next.js 16 no ofrece.
