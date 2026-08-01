# Cerrar el registro público Implementation Plan

**Goal:** Impedir temporalmente cualquier alta pública y dirigir todos los accesos de registro al formulario existente de lista de espera.

**Registro:** TASK-001 · **Tarea maestra:** `task/task-cerrar-registro-publico-01-08-2026.md`

**Architecture:** Una constante compartida define el destino de waitlist. `/register` pasa a ser una redirección de servidor de Next.js 16, el login conserva únicamente email/contraseña para cuentas existentes y los enlaces residuales de registro apuntan al mismo formulario. El cierre del backend se completa manualmente desactivando nuevas altas en Supabase Auth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth, Vitest, Testing Library y Playwright.

## Perfil de verificación

- Nivel: full
- Motivo: cambia un flujo crítico de autenticación y debe demostrar tanto la ausencia de altas como la continuidad del login existente.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/auth.spec.ts`; comprobación visual con agent-browser.
- Evidencias esperadas: `/register` acaba en `/landing#lista-espera`; el login no muestra Google ni un CTA de alta; sus enlaces públicos abren la waitlist; una cuenta existente puede seguir autenticándose; no quedan llamadas `signUp` ni `signInWithOAuth` en `src/`; Supabase remoto rechaza nuevas altas tras el ajuste manual.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Decisiones cerradas

- El cierre aplica también a enlaces con `?invite=`.
- Google OAuth se retira temporalmente del login porque puede crear una cuenta en el primer acceso.
- Las cuentas existentes siguen entrando por email y contraseña.
- No se borra ninguna cuenta existente ni se migra la base de datos.
- La configuración remota de Supabase no se modifica automáticamente desde el repositorio; producción sigue siendo una operación manual.

### Task 1: Cerrar la ruta pública de registro

**Files:**
- Create: `src/__tests__/app/register.page.test.ts`
- Modify: `src/app/register/page.tsx`
- Modify: `src/lib/constants.ts`

**Step 1: Write the failing test**

Probar la interfaz pública de la página: al ejecutarse solicita `redirect("/landing#lista-espera")` y no renderiza un formulario.

**Step 2: Run test to verify it fails** — Run: `npm test -- --run src/__tests__/app/register.page.test.ts` · Expected: FAIL porque la página actual renderiza y ejecuta `signUp`.

**Step 3: Write minimal implementation**

Añadir `WAITLIST_PATH` a las constantes compartidas y convertir la página cliente de registro en un Server Component mínimo que invoca `redirect(WAITLIST_PATH)`.

**Step 4: Run test to verify it passes** — Run: `npm test -- --run src/__tests__/app/register.page.test.ts` · Expected: PASS.

### Task 2: Cerrar altas implícitas y enlaces residuales

**Files:**
- Create: `src/__tests__/app/login.page.test.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/landing/PricingSection.tsx`
- Modify: `src/components/usuarios/InvitarUsuarioDialog.tsx`

**Step 1: Write the failing test**

Renderizar el login y probar que ofrece «Unirme a la lista de espera», navega a `WAITLIST_PATH` y no expone «Continuar con Google».

**Step 2: Run test to verify it fails** — Run: `npm test -- --run src/__tests__/app/login.page.test.tsx` · Expected: FAIL por el enlace `/register` y el botón OAuth actuales.

**Step 3: Write minimal implementation**

Retirar el handler/botón OAuth, cambiar el copy del CTA y sustituir todos los destinos navegables de `/register` por `WAITLIST_PATH`, incluidos pricing reutilizable e invitaciones generadas mientras el alta está cerrada.

**Step 4: Run test to verify it passes** — Run: `npm test -- --run src/__tests__/app/login.page.test.tsx` · Expected: PASS.

**Step 5: Static audit** — Run: `rg -n "auth\\.signUp|signInWithOAuth|/register" src` · Expected: únicamente la ruta física `src/app/register`, sin llamadas de alta ni destinos navegables a `/register`.

### Task 3: Verificar el flujo crítico

**Files:**
- Modify: `e2e/auth.spec.ts`

**Step 1: Add the browser regression cases**

Probar que `/register` redirige a la sección de lista de espera, que el login no ofrece OAuth/registro y que la waitlist permite introducir un correo sin crear una cuenta.

**Step 2: Run static and unit verification** — Run: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run` · Expected: PASS.

**Step 3: Run framework verification** — Run: `npm run build` · Expected: PASS con Next.js 16.

**Step 4: Run E2E** — Run: `npm run test:e2e -- e2e/auth.spec.ts` · Expected: PASS en Chromium y Mobile Chrome, reutilizando credenciales de prueba solo para confirmar login existente.

**Step 5: Verify Supabase backend manually**

En Supabase Dashboard → Authentication → Sign In / Providers, desactivar «Allow new users to sign up». Confirmar con una cuenta inexistente que Auth devuelve `signup_disabled` y con la cuenta de test existente que el login sigue funcionando.

### Task 4 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md`
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-cerrar-registro-publico-01-08-2026.md`
- Modify (si aplica): `docs/design-guides/frontend_styleguide.md` — solo si aparece una convención reutilizable nueva

**Pasos:** marcar el cierre de alta pública en el backlog y la auditoría CRUD; reflejar checks ejecutados en la tarea maestra; mantener TASK-001 en `en_progreso` hasta que el humano confirme cierre/merge con rama y fecha. Cerrar = actualizar la documentación.

**Skills:** `tdd`, `javascript-testing-patterns`, `vercel-react-best-practices`, `clean-code`.
