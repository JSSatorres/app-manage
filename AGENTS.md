# manage-sport-app — entrada canónica para agentes de IA

Fuente de verdad que leen **las 4 herramientas** (Claude Code vía `CLAUDE.md`, Cursor vía
`.cursor/rules/000-entrada.mdc`, OpenCode vía `opencode.json` y Codex de forma nativa). Tiene dos capas: **cómo
trabajamos** (compartido, vive en `ai-dev-config`) y **cómo se escribe el código aquí** (propio,
en `docs/design-guides/`).

---

## Cómo trabajamos (capa compartida — `ai-dev-config`)

- **Protocolo de operación:** `.agents/protocol/operating-protocol.md`. Lo esencial: **Regla del
  95 %** (no codees hasta estar seguro de los requisitos; si falta contexto, pregunta),
  **Plan Mode** en tareas no triviales, **ediciones quirúrgicas** (diffs concretos, no reescribir
  archivos enteros), y **guías de diseño obligatorias** antes de tocar código.
- **Modelos por rol** (búsqueda→rápido · implementación→medio · planificación→grande):
  `.agents/orchestrators/modelos.md`.
- **Comandos** (el git y la cadencia van en el nombre, sin flags):

  | Comando | Qué hace | Git |
  |---------|----------|-----|
  | `/auto` | planifica **y ejecuta** autónomo | rama actual, sin commits |
  | `/auto-git` | igual | rama nueva + commit/tarea + push |
  | `/spec` | solo el plan en `docs/plans/` | — |
  | `/exec` | ejecuta un plan | rama actual, sin commits |
  | `/exec-git` | ejecuta un plan | rama nueva + commit/tarea + push |
  | `/exec-3` | ejecuta un plan, para cada 3 archivos | rama actual, sin commits |
  | `/exec-3-git` | igual, para cada 3 archivos | rama nueva + commit/tarea + push |
  | `/research` | solo investiga (código + web) y responde en el chat | — |

- **Codex:** usa `$auto`, `$auto-git`, `$spec`, `$exec`, `$exec-git`, `$exec-3`, `$exec-3-git`
  y `$research`. `/plan` solo cambia al modo nativo; `$spec` guarda el plan compartido.
- **Convenciones:** LF siempre · **UI en español** · **Git en inglés** (Conventional Commits,
  ver `.agents/orchestrators/git-flow.md`) · fechas Europe/Madrid (DD/MM/YYYY).

---

## Regla #1: Next.js 16

Este proyecto usa **Next.js 16** con breaking changes. Antes de escribir código, lee la guía
relevante en `node_modules/next/dist/docs/`. **No asumas** que lo que sabes de Next.js 13-15
aplica aquí.

---

## Supabase CLI local — regla operativa

- El CLI está fijado como dependencia de desarrollo (`supabase@2.113.0`). En PowerShell usa
  `npx.cmd supabase <comando>`; no dependas de una instalación global ni de una descarga temporal.
- Si el sandbox devuelve `EPERM` al escribir en `C:\Users\juans\.supabase`, reejecuta el CLI con
  permiso fuera del sandbox. No redirijas `SUPABASE_HOME` dentro del repositorio ni persistas PATs.
- El remoto canónico actual es `rgmrqkoudyotkpqgezzv`, rama `main`. Aunque Supabase muestra la
  etiqueta `Production`, el propietario confirmó el 08/08/2026 que es la única BD y se usa
  exclusivamente como entorno de prueba. Esta aclaración no autoriza ningún otro project ref.
- Flujo completo, autenticación, drift y comandos seguros:
  [`docs/design-guides/data_styleguide.md`](docs/design-guides/data_styleguide.md#supabase-cli-local).

---

## Guías de diseño — LECTURA OBLIGATORIA antes de codear

Cómo se escribe el código en **este** proyecto (stack, estructura, naming, estado, formato,
buenas prácticas y **cómo verificar**) vive en **`docs/design-guides/`**. Antes de implementar en
un área, lee su guía y **respeta su naming/estructura**: el código debe parecer escrito por el
mismo autor que los archivos vecinos.

- [`docs/design-guides/frontend_styleguide.md`](docs/design-guides/frontend_styleguide.md) —
  React 19 / Next.js 16, componentes por dominio, shadcn/ui, formularios (RHF + Zod), estado
  (Zustand + React Query), hooks, `DataTable`, reglas «no hacer nunca».
- [`docs/design-guides/data_styleguide.md`](docs/design-guides/data_styleguide.md) — capa de
  datos: servicios Supabase, `types/`, `schemas/` (Zod), patrón `getSupabaseClient()`,
  migraciones y su **drift**.

Ambas incluyen su sección **«Cómo verificar»** (contrato del `verifier`: estático → tests →
build → E2E, acceso a BD de dev, auth de test).

---

## Arquitectura del proyecto

```
src/
├── app/                    # App Router (rutas y páginas)
│   ├── (dashboard)/        # Grupo de rutas autenticadas
│   │   ├── dashboard/  sesiones/  equipos/  ejercicios/  sedes/
│   │   ├── usuarios/  parametros/  documentos/  configuracion/
│   ├── login/  join/  auth/callback/
├── components/             # React organizados por dominio
│   ├── shared/             # Reutilizables (DataTable, PageHeader, …)
│   ├── ui/                 # Base (shadcn/ui)
│   └── [dominio]/          # Específicos (sesiones/, sedes/, …)
├── hooks/                  # useQuery, useMutation, useAuth, useWorkspaceContext
├── services/               # Acceso a datos (Supabase queries)
├── types/                  # TypeScript types e interfaces
├── schemas/                # Validación con Zod
├── lib/                    # Utilidades y contextos (workspaceContext, env, constants)
├── store/                  # Estado global con Zustand
├── providers/              # React providers (QueryProvider, …)
└── __tests__/              # Tests unitarios con Vitest
e2e/                        # Tests E2E con Playwright
```

## Stack tecnológico

- **Framework**: Next.js 16 (App Router, Turbopack) · **UI**: React 19, shadcn/ui, Tailwind CSS,
  Framer Motion
- **Auth**: Supabase Auth (OAuth Google, PKCE) · **BD**: Supabase (PostgreSQL)
- **Formularios**: React Hook Form + Zod · **Estado**: Zustand + React Query (TanStack Query)
- **Tests**: Vitest + jsdom (unit) · Playwright (E2E, Chromium + Mobile Chrome)
- **Monitoreo**: Sentry · **Deploy**: Vercel · **Idioma de la UI**: Español

---

## Capa propia — dominio, tareas y planes

- **Dominio / negocio**: `planificacion.pdf` (visión), `docs/crud-audit.md` (estado de entidades
  y CRUD por módulo).
- **Seguimiento de tareas**: `docs/backlog.md` (bloques B1…, convención `[ ]`/`[~]`/`[x]`).
- **Planes de implementación**: `docs/plans/` (los genera `/spec`).
- **Arquitectura detallada**: `ARCHITECTURE.md`. Monitoreo: `MONITORING.md`. E2E: `E2E_TESTING.md`.

## Definición de Terminado (cierre)

Una tarea no está terminada solo con el código en verde (ver protocolo §6): además hay que
**dejar la doc al día**. Antes del handoff:

- Marca la tarea en `docs/backlog.md` (`[x]`) y, si aplica, actualiza `docs/crud-audit.md`.
- Actualiza `docs/design-guides/` si el cambio introduce o altera una convención o el stack.
- Verifica según «Cómo verificar» de la guía del área tocada (lint, typecheck, tests, build, E2E).
