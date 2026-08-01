# Auditoría de estado + Roadmap de mejora — manage-sport-app

**Goal:** Documentar el estado real de la aplicación (qué funciona, qué no, defectos, fallos de seguridad) y entregar un plan priorizado y ejecutable que cierre la deuda crítica y añada las features que la competencia sí tiene.

**Architecture:** El diagnóstico sale de 6 auditorías paralelas (inventario de features, seguridad, capa de datos/migraciones, frontend/UX, testing/calidad y benchmark de competencia). El roadmap agrupa el trabajo en fases: primero **P0 seguridad/estabilización**, luego **integridad de datos**, después **cerrar CRUD base**, **deuda frontend**, **tests**, y por último **features competitivas** (épicas que necesitan su propio `/spec`).

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, shadcn/ui, Tailwind, Framer Motion, Supabase (Auth PKCE + Postgres + RLS), React Hook Form + Zod, Zustand + React Query, Vitest + jsdom, Playwright, Sentry, Vercel.

> **Nota de ejecución:** este documento es SOLO plan. Las fases 0–4 están bite-sized y listas para `/exec`. La fase 5 (competencia) se entrega como épicas priorizadas; cada épica que se decida abordar debe pasar por su propio `/spec` antes de ejecutar.
>
> **Regla de migraciones (memoria del proyecto):** NO usar `supabase db push`. Los fixes de esquema se aplican vía **Supabase Management API + `migration repair`**. Toda tarea que toque BD respeta esto.

---

## PARTE 1 — DIAGNÓSTICO (estado de la aplicación)

### 1.1 Cuadro de salud

| Área | Estado | Nota |
|------|--------|------|
| CRUD base (sedes, equipos, sesiones, ejercicios, documentos, parámetros, jugadores, entrenadores) | 🟢 Funciona | 8 módulos con C/R/U/D operativo |
| CRUD usuarios | 🔴 Incompleto | Solo lectura; sin create/update/delete |
| Seguridad | 🔴 Riesgo alto | Secretos en Git, sin middleware server, drift RLS |
| Migraciones / esquema | 🔴 Drift crítico | `workspace_id`/`workspaces` añadido→eliminado→re-añadido; funciones apuntan a tablas borradas |
| Multi-tenancy | 🔴 Fugas | Varios `fetchAll*` devuelven datos de todos los tenants |
| Frontend / UX | 🟡 Deuda | 73 % de formularios sin RHF+Zod; a11y de labels |
| Tests unit | 🔴 ~8–10 % | Solo utils + permisos; sin servicios/hooks/schemas |
| Tests E2E | 🟡 ~40–50 % | CRUD básico cubierto; sin RBAC/logout/OAuth |
| Monitoreo (Sentry) | 🟡 A medias | Cliente OK; **server/edge config no existe** → import roto |
| CI/CD | 🟢 Bueno | lint + typecheck + unit + build + E2E |
| TypeScript / ESLint | 🟢 Excelente | `strict: true`, 0 `@ts-ignore`, 5 disables justificados |

### 1.2 Defectos que NO funcionan (bugs confirmados)

1. **`workspaceContext` roto** — `src/lib/workspaceContext.tsx:72-75` carga `workspace_members`, tabla eliminada en la migración 009. El bootstrap tras login puede fallar.
2. **Sentry server/edge no captura** — `src/instrumentation.ts:5,9` importa `src/sentry.server.config.ts` y `src/sentry.edge.config.ts` que **no existen** → error en runtime del lado servidor.
3. **`sync_auth_profile()` apunta a objetos borrados** — `supabase/migrations/20260603120000_...sql:63-99` referencia `workspace_members`, `sedes.workspace_id` y `sede_invitations` (no existen tras 009) → el onboarding OAuth/sign-up puede romperse.
4. **Schemas Zod desalineados con los types/servicios:**
   - `createSesionSchema` usa `entrenador_id` (singular) pero `SesionCreateInput` usa `entrenadorIds` (array) — `src/schemas/sesion.schema.ts:23-34` vs `src/types/sesiones.ts:26`.
   - `createJugadorSchema`/`createEntrenadorSchema` no incluyen `workspaceId` aunque el servicio lo exige — `src/schemas/jugador.schema.ts:3-16`, `src/schemas/entrenador.schema.ts:3-12`.

### 1.3 Fallos de seguridad (priorizados)

**CRÍTICO**
- **C1 — Secretos en control de versiones.** `.env` contiene `SUPABASE_ACCESS_TOKEN`, `Client_Secret` de Google OAuth, `SENTRY_AUTH_TOKEN` y API keys (OpenCode/Kimi/MiniMax). `.env.local` contiene `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` y `VERCEL_OIDC_TOKEN`. **Tokens activos → revocar YA.**
- **C2 — Dashboard sin guard en servidor.** No existe `middleware.ts`; `/dashboard/*` se protege solo con `AuthGate` client (`src/app/(dashboard)/layout.tsx:86`). Sin JS, se sirve HTML/datos antes del redirect.
- **C3 — Drift de migraciones** (ver 1.2 #1 y #3): la BD remota no está en el estado que el código espera.

**ALTO**
- **A1 — RLS inicial permisiva** `USING (true) WITH CHECK (true)` en `001_initial_schema.sql:204-211`; si hay estado inconsistente/rollback, cualquier autenticado ve todo.
- **A2 — Orden de RLS por rol frágil** `021_rls_por_rol.sql` depende de helpers (`current_user_rol()`, `current_user_sede_id()`) definidos en `APPLY_NOW.sql`; si se aplican en orden, 021 falla.
- **A3 — Fugas multi-tenant** `fetchAll*`/lookups sin filtro de sede/workspace: `equipos.service.ts:83`, `jugadores.service.ts:113`, `entrenadores.service.ts:104`, `sedes.service.ts:29`, `usuarios-lookup.service.ts:9`, `sedes-lookup.service.ts:8`.

**MEDIO**
- **M1 — Open redirect** en `src/app/auth/callback/page.tsx:16`: `nextRaw.startsWith("/")` acepta `//attacker.com`. Usar allowlist / mismo origen.
- **M2 — Validación solo en RLS** los servicios mutan sin validar con Zod antes del insert (defensa en profundidad ausente).

### 1.4 Mejoras de calidad / deuda técnica

- **73 % de formularios sin RHF+Zod** (8 de 11 usan `useState` + validación manual): `EntrenadorForm`, `SedeForm`, `JugadorForm`, `EquipoForm`, `EjercicioForm`, `DocumentoForm`, `ParametroForm`, `SesionForm`. Los schemas Zod ya existen pero no se usan.
- **Accesibilidad:** `src/components/shared/FormField.tsx:26-29` `<label>` sin `htmlFor`/`id`; `DataTable` sin roles ARIA.
- **Inputs nativos** en vez de shadcn/ui (`<input>/<textarea>/<select>`) en varios forms.
- **Cobertura unit ~8–10 %**: sin tests de servicios (24), hooks (20+), schemas Zod (7), contextos/auth.
- **E2E sin RBAC, logout ni OAuth.**
- **Faltan** `getById` universal, paginación en `fetchAll`, schemas Zod de ejercicios/documentos/parámetros, soft-delete y auditoría.

### 1.5 Gap competitivo (lo que la competencia tiene y esta app no)

Benchmark sobre TeamSnap, Spond, SportEasy, Heja, Playmetrics, TeamLinkt, Sportlyzer. Ordenado por valor/esfuerzo para un club:

| # | Feature de la competencia | Estado aquí | Prioridad |
|---|---------------------------|-------------|-----------|
| G1 | **Asistencia / disponibilidad (RSVP "voy/no voy")** + convocatorias | ❌ (B8 en backlog) | 🔴 Alta |
| G2 | **Notificaciones + mensajería** (push/email, anuncios por equipo) | ❌ | 🔴 Alta |
| G3 | **Calendario de eventos + sync Google/Apple** (eventos recurrentes) | ⚠️ parcial (sesiones sin calendario/sync) | 🔴 Alta |
| G4 | **Temporadas** (agrupar sesiones/equipos por temporada) | ❌ (B7 en backlog) | 🟡 Media |
| G5 | **Fichas de jugador ampliadas**: contacto emergencia, ficha médica, consentimientos + firma | ⚠️ ficha básica | 🟡 Media |
| G6 | **Portal para padres/tutores** (menores, acceso restringido) | ❌ | 🟡 Media |
| G7 | **Pagos / cuotas** (Stripe, recordatorios, morosidad) | ❌ | 🟡 Media |
| G8 | **App móvil / PWA + push nativa** | ❌ (solo web) | 🟡 Media |
| G9 | **Reportes y exportación** (asistencia, financiero, PDF/Excel) | ⚠️ export import/export existe | 🟢 Baja |
| G10 | **Biblioteca de ejercicios enriquecida + pizarra táctica + vídeo** | ⚠️ ejercicios básicos | 🟢 Baja (diferenciador) |
| G11 | **Estadísticas / evaluación de jugadores / wellness / carga** | ❌ | 🟢 Baja (diferenciador) |

Fuentes: teamsnap.com, spond.com, sporteasy.net, heja.io, playmetrics.com, teamlinkt.com, sportlyzer.com.

---

## PARTE 2 — PLAN DE ACCIÓN (tareas)

> Cada tarea de implementación cita **`tdd`** y, según lo que toca y lo que declara la design-guide, las skills de stack: **`javascript-testing-patterns`** (Vitest), **`react-state-management`** (React Query/Zustand), **`sql-optimization-patterns`** (Postgres/RLS), **`vercel-react-best-practices`** (Next/React perf). E2E lo corre el subagente `testing` con `agent-browser`. Los bugs citan **`diagnose`** (test que reproduce antes del fix). Rutas y comandos exactos abajo.

### FASE 0 — Seguridad crítica y estabilización (P0)

#### Task 0.1: Revocar y sacar secretos del repositorio
**Tipo:** operación de seguridad (sin TDD; verificación manual). Cita: `security-review`.
**Files:**
- Modify: `.gitignore` (añadir `.env`, `.env.local`, `.env*.local`)
- Delete del index (no del disco): `.env`, `.env.local`
- Create: `.env.example` (solo claves, sin valores)
**Pasos:**
1. **Revocar/rotar** en cada proveedor: Supabase access token + anon/service keys, Google OAuth client secret, Sentry auth token, API keys (OpenCode/Kimi/MiniMax), Vercel OIDC. Cambiar la contraseña del usuario de test.
2. `git rm --cached .env .env.local` y añadirlos a `.gitignore`.
3. Purgar del **historial** (`git filter-repo` o BFG) y forzar push coordinado (avisar antes; es irreversible/outward-facing → confirmar con el usuario).
4. Documentar las variables requeridas en `.env.example`.
5. **Verificar:** `git log -p -- .env` no muestra secretos vivos; `git ls-files | grep -E '^\.env'` vacío.

#### Task 0.2: Reconciliar el drift de migraciones Supabase
**Tipo:** datos/infra. Cita: `sql-optimization-patterns` + `data_styleguide` (design-guide).
**Files:**
- Read: `supabase/migrations/*` (001, 009, 021, `APPLY_NOW.sql`, `20260516211020_*`, `20260530093000_*`, `20260601130000_*`, `20260603120000_*`)
- Create: `supabase/migrations/<timestamp>_reconcile_schema_state.sql` (según el estado real)
**Pasos:**
1. **Auditar el estado REAL de la BD remota** vía Management API: ¿existe `workspaces`? ¿existe `workspace_id` en `entrenadores`/`jugadores`/`documentos`? ¿existen helpers `current_user_rol()`/`current_user_sede_id()`? ¿qué políticas RLS hay por tabla?
2. Decidir el modelo canónico de tenant (todo apunta a **`sede_id`** tras 009). Escribir UNA migración de reconciliación coherente con ese modelo.
3. Aplicar vía **Management API + `supabase migration repair`** (NO `db push`).
4. **Verificar:** query de introspección confirma columnas/tablas/políticas esperadas; el login + bootstrap no lanza errores de objeto inexistente.

#### Task 0.3: Arreglar `workspaceContext` roto (bug)
**Tipo:** bug. Cita: `diagnose` + `tdd` + `react-state-management` (Context).
**Files:**
- Test: `src/__tests__/workspaceContext.test.tsx` (crear)
- Modify: `src/lib/workspaceContext.tsx:72-75`
**Step 1: Test que reproduce** — mock del cliente Supabase de forma que `workspace_members` no exista; el contexto actual debe fallar/leer `undefined`.
**Step 2: Ejecutar y ver FALLO** — Run: `npm test -- --run workspaceContext` · Expected: FAIL.
**Step 3: Fix** — reemplazar la carga de `workspace_members` por el modelo vigente (`usuarios.sede_id` + `entrenador_sedes`/`jugador_sedes`).
**Step 4: Ver PASA** — Run: `npm test -- --run workspaceContext` · Expected: PASS.

#### Task 0.4: Middleware de auth en servidor
**Tipo:** seguridad. Cita: `tdd` + `vercel-react-best-practices` (Next 16 middleware) + leer `node_modules/next/dist/docs/` (regla #1 Next 16).
**Files:**
- Create: `src/middleware.ts` + `config.matcher` para `/dashboard/*` (y APIs protegidas)
- Test: `e2e/auth-guard.spec.ts` (o unit del matcher)
**Pasos:** usar `@supabase/ssr` para `auth.getUser()` en el edge; redirigir a `/login` si no hay sesión, refrescando cookies. **Verificar (E2E, subagente `testing`):** request a `/dashboard` sin sesión → 307 a `/login` sin filtrar HTML del dashboard.

#### Task 0.5: Completar configuración Sentry server/edge (bug)
**Tipo:** bug/monitoreo. Cita: `diagnose` + `tdd`.
**Files:**
- Create: `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`
- Modify: `src/instrumentation-client.ts` (bajar `tracesSampleRate` a ~0.1 en prod; revisar `sendDefaultPii` por GDPR)
**Pasos:** crear ambos configs (DSN, sampling prod), confirmar que `src/instrumentation.ts:5,9` ya no importa archivos inexistentes. **Verificar:** `npm run build` OK y una excepción lanzada en un route handler llega a Sentry (o test que confirma que los módulos existen y exportan init).

### FASE 1 — Integridad de datos y multi-tenancy (P0/P1)

#### Task 1.1: Cerrar fugas multi-tenant en `fetchAll*`/lookups
**Tipo:** seguridad/datos (bug). Cita: `diagnose` + `tdd` + `javascript-testing-patterns`.
**Files:**
- Test: `src/__tests__/services/tenant-scope.test.ts` (crear)
- Modify: `src/services/equipos.service.ts:83-98`, `jugadores.service.ts:113-121`, `entrenadores.service.ts:104-112`, `sedes.service.ts:29-40`, `usuarios-lookup.service.ts:9-23`, `sedes-lookup.service.ts:8-19`
**Step 1: Test que reproduce** — con dos sedes/tenants, el `fetchAll*` actual devuelve filas de ambos; el test espera solo las del tenant activo.
**Step 2: FALLO** — Run: `npm test -- --run tenant-scope` · Expected: FAIL.
**Step 3: Fix** — añadir `.eq('sede_id', …)` / filtro por sedes del usuario en cada query (o eliminar el `fetchAll*` si no debe existir).
**Step 4: PASA** — Run: `npm test -- --run tenant-scope` · Expected: PASS.

#### Task 1.2: Alinear schemas Zod ↔ types/servicios
**Tipo:** bug/consistencia. Cita: `tdd` + `javascript-testing-patterns`.
**Files:**
- Test: `src/__tests__/schemas/alignment.test.ts` (crear)
- Modify: `src/schemas/sesion.schema.ts:23-34` (array `entrenadorIds`), `src/schemas/jugador.schema.ts`, `src/schemas/entrenador.schema.ts` (`workspaceId`/tenant coherente con el modelo de 0.2)
**Pasos (TDD):** tests con input válido/ inválido por cada schema; corregir el schema para que valide lo que el servicio realmente inserta. Run: `npm test -- --run schemas`.

#### Task 1.3: Verificar y endurecer RLS por tabla
**Tipo:** seguridad/datos. Cita: `sql-optimization-patterns` + `data_styleguide`.
**Files:** Modify/Create migración RLS coherente (depende de 0.2).
**Pasos:** confirmar RLS habilitado en todas las tablas; reemplazar `USING(true)` residual; usar helpers `SECURITY DEFINER` en vez de subqueries repetidas. **Verificar:** con dos usuarios de distinta sede, cada uno solo lee lo suyo (test SQL/E2E).

### FASE 2 — Cerrar CRUD base y gaps del backlog

#### Task 2.1: `getById` universal (B1-1)
Cita: `tdd` + `javascript-testing-patterns`. **Files:** `src/services/{sedes,equipos,sesiones,ejercicios,documentos,parametros,usuarios}.service.ts` (+ tests). TDD por servicio; respeta filtro de tenant de 1.1.

#### Task 2.2: Schemas Zod faltantes (B1-3..5)
Cita: `tdd` + `javascript-testing-patterns`. **Files:** crear `src/schemas/{ejercicio,documento,parametro}.schema.ts` + tests. Conectar a los forms (ver 3.1).

#### Task 2.3: CRUD completo de Usuarios (B4)
Cita: `tdd` + `react-state-management` + `javascript-testing-patterns`. **Files:** `src/services/usuarios.service.ts` (add create/update/delete + invite flow), hook `useUsuarios`, `src/components/usuarios/*`, `e2e/`. TDD servicio→hook→UI; E2E del alta con invitación (subagente `testing`).

#### Task 2.4: Paginación en `fetchAll` (B1-2)
Cita: `tdd` + `sql-optimization-patterns`. **Files:** servicios + `DataTable`. `limit`/`offset` (o cursor) y UI de paginación server-side.

### FASE 3 — Deuda técnica frontend

#### Task 3.1: Migrar los 8 formularios a RHF + Zod
Cita: `tdd` + `react-state-management` + `frontend_styleguide`. **Files:** `EntrenadorForm`, `SedeForm`, `JugadorForm`, `EquipoForm`, `EjercicioForm`, `DocumentoForm`, `ParametroForm`, `SesionForm` (usar los schemas de 1.2/2.2). Un form por sub-tarea (bite-sized), con test de validación por form.

#### Task 3.2: Accesibilidad de formularios y tabla
Cita: `tdd` + `frontend_styleguide`. **Files:** `src/components/shared/FormField.tsx:26-29` (asociar `label htmlFor`↔`id` generado), `src/components/shared/DataTable.tsx` (roles ARIA). Verificar con `e2e/accessibility.spec.ts`.

#### Task 3.3: Sustituir inputs nativos por shadcn/ui
Cita: `frontend_styleguide`. **Files:** los forms con `<input>/<textarea>/<select>` nativos → `Input`/`Textarea`/`Select`. (Suele resolverse dentro de 3.1.)

### FASE 4 — Tests y monitoreo

#### Task 4.1: Unit tests de servicios críticos
Cita: `tdd` + `javascript-testing-patterns`. **Files:** `src/__tests__/services/*` para `sesiones`, `equipos`, `sedes`, `jugadores`, `entrenadores` (mock de Supabase). Meta: +30 tests.

#### Task 4.2: Tests de schemas Zod
Cita: `tdd` + `javascript-testing-patterns`. **Files:** `src/__tests__/schemas/*` (válido/ inválido por schema).

#### Task 4.3: E2E de RBAC, logout y OAuth
Cita: subagente `testing` con `agent-browser`. **Files:** `e2e/rbac.spec.ts`, `e2e/auth.spec.ts`. Entrenador no puede crear usuarios; logout limpia sesión; callback OAuth.

### FASE 5 — Features competitivas (épicas; cada una requiere su propio `/spec`)

> No bite-sized aquí a propósito: son proyectos grandes. Orden recomendado por valor/esfuerzo. Cada épica: primero `/spec` dedicado, luego `/exec-git`.

- **Épica G1 — Asistencia/RSVP (B8).** Entidad `sesion_asistencia`, respuesta voy/no voy/tal vez, convocatoria por sesión, recordatorios. *(máximo valor, esfuerzo medio → primero)*
- **Épica G2 — Notificaciones + mensajería.** Push (web/PWA) + email, anuncios por equipo/sede, preferencias. (Depende de la infra de notificaciones que también sirve a G1.)
- **Épica G3 — Calendario + sync.** Vista calendario de sesiones/eventos, eventos recurrentes, export iCal / sync Google.
- **Épica G4 — Temporadas (B7).** Entidad `temporadas`, filtro global por temporada.
- **Épica G5 — Ficha de jugador ampliada.** Contacto de emergencia, ficha médica, consentimientos con firma (menores/GDPR).
- **Épica G6 — Portal para padres/tutores.** Rol nuevo, acceso restringido a su(s) jugador(es).
- **Épica G7 — Pagos/cuotas.** Stripe, cuotas de temporada, recordatorios, panel de morosidad.
- **Épica G8 — PWA + push nativa.** Manifest, service worker, instalable, push.
- **Épica G9 — Reportes y exportación** (asistencia/financiero, PDF/Excel).
- **Épica G10 — Biblioteca de ejercicios enriquecida + pizarra táctica + vídeo** *(diferenciador)*.
- **Épica G11 — Estadísticas / evaluación / wellness / carga** *(diferenciador)*.

### FASE 6 (final): Actualizar documentación
**Tipo:** cierre (sin código de producción). **Files:**
- Modify: `docs/backlog.md` — marcar B1-1/B1-2/B1-3..5/B4/B8/B7 según lo entregado (`[x]`/`[~]`), y añadir los ítems de seguridad (C1–C3, A1–A3) y de deuda (formularios, a11y, tests).
- Modify: `docs/crud-audit.md` — reflejar el CRUD de Usuarios y `getById`.
- Modify (si aplica): `docs/design-guides/data_styleguide.md` — modelo de tenant canónico (`sede_id`) y regla de filtro obligatorio en servicios.
- Modify (si aplica): `docs/design-guides/frontend_styleguide.md` — reforzar RHF+Zod y `FormField` accesible.
- Create: `SECURITY.md` — política de secretos, rotación, rate-limiting, RLS.
- Modify: `MONITORING.md` — Sentry server/edge ya configurado.
**Pasos:** marcar tareas hechas, mover al histórico/índice; registrar convenciones nuevas en las design-guides; anotar decisiones (modelo de tenant) como ADR si procede. **Cerrar = actualizar la doc.**

---

## Orden de ejecución recomendado

1. **Fase 0** (0.1 → 0.2 → 0.3 → 0.4 → 0.5) — desbloquea todo; 0.1 y 0.2 son urgentes.
2. **Fase 1** (1.1 → 1.2 → 1.3) — cierra fugas y desalineaciones.
3. **Fase 2** (2.1 → 2.2 → 2.3 → 2.4).
4. **Fase 3** (3.1 en 8 sub-tareas → 3.2 → 3.3).
5. **Fase 4** (4.1 → 4.2 → 4.3).
6. **Fase 5** — elegir épicas (recomendado G1 → G2/G3), una `/spec` por épica.
7. **Fase 6** — documentación (obligatoria al cerrar cada lote).
