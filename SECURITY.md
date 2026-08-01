# Seguridad — Manage Sport App

> Estado al 2026-07-12, tras `docs/plans/2026-07-12-auditoria-estado-y-roadmap.md`. Ver también
> `docs/backlog.md` (Bloque 14) para el detalle de tareas.

## Secretos y control de versiones

- `.env` y `.env.local` **nunca estuvieron en el historial de git** (verificado con
  `git log --all -- .env .env.local`) y ya están cubiertos por `.gitignore` (`.env*`, `.env*.local`).
  `.env.example` documenta las variables requeridas sin valores.
- **Pendiente de decisión del usuario:** rotar los tokens vivos que hoy están en `.env`/`.env.local`
  (Supabase access token, anon/service keys, Google OAuth client secret, Sentry auth token, API keys de
  OpenCode/Kimi/MiniMax, contraseña del usuario de test). No se ha rotado nada en este lote.
- Regla operativa: nunca añadir `.env`/`.env.local` al índice de git; cualquier secreto nuevo va primero a
  `.env.example` (solo la clave, sin valor) y se documenta aquí si cambia el procedimiento de rotación.

## Autenticación y sesión

- Supabase Auth (PKCE) **100% client-side**: la sesión vive en `localStorage` del navegador
  (`@supabase/supabase-js` con `persistSession: true`, ver `src/services/supabase.ts`). El callback OAuth
  (`src/app/auth/callback/page.tsx`) es una página cliente, no un Route Handler.
- **No existe middleware/proxy de servidor** que proteja `/dashboard/*` — la protección hoy es
  `AuthGate` (client component). Sin JavaScript, el HTML del dashboard se sirve antes del redirect.
- Para cerrar este gap con seguridad real (no un middleware que no puede leer la sesión) hace falta migrar
  el modelo de sesión a cookies con `@supabase/ssr` — cambio arquitectónico transversal (nueva dependencia,
  reescribir `src/services/supabase.ts`, convertir el callback OAuth en Route Handler). Pendiente de
  decisión del usuario (`docs/backlog.md` B14-2).
- Next.js 16 renombró la convención `middleware.ts` → `proxy.ts`; cuando se aborde este punto, usar la
  convención nueva.

## Multi-tenancy (defensa en profundidad)

- Modelo de tenant vigente: **workspace-based** (`workspace_id`), confirmado contra `database.types.ts`
  generado y la BD real (no `sede_id` como se asumía inicialmente).
- Los servicios de lectura (`fetchXByWorkspace`, `fetchSedes`, `fetchUsuariosLookup`, `fetchSedesLookup`,
  `getXById`) filtran explícitamente por `workspace_id` a nivel de aplicación, además de RLS — no confían
  solo en la política de BD.
- **Gap conocido:** `createEquipo`/`updateEquipo` no persisten `workspace_id` en la tabla `equipos` (ver
  `docs/backlog.md` B14-13). No es una fuga de lectura, pero deja el registro sin `workspace_id` fijado.

## RLS (Row Level Security)

- **No se ha auditado ni modificado la BD remota** en este lote (mutar el esquema/políticas de una BD
  compartida requiere autorización explícita, fuera del alcance de una ejecución autónoma).
- Pendiente (`docs/backlog.md` B14-3/B14-4): confirmar contra la BD real qué políticas están activas, si
  `021_rls_por_rol.sql` depende de helpers definidos en `APPLY_NOW.sql` en el orden correcto, y si queda
  algún `USING (true)` residual de `001_initial_schema.sql`. Aplicar cualquier fix vía **Management API +
  `supabase migration repair`**, nunca `supabase db push` (ver memoria del proyecto).

## Monitoreo de errores (Sentry)

- `tracesSampleRate` es consciente de entorno (`0.1` en producción, `1.0` en dev) en los 3 configs
  (`src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`).
- `sendDefaultPii: false` en los 3 — la app maneja datos de socios/deportistas, potencialmente menores.

## Open redirect

- `src/app/auth/callback/page.tsx` acepta cualquier `next` que empiece por `/`, lo que permite
  `//attacker.com` como destino (M1 del diagnóstico original). Pendiente de fix: usar allowlist o
  comprobación de mismo origen.

## Validación en profundidad

- Los 8 formularios de dominio (Entrenador, Sede, Jugador, Equipo, Ejercicio, Documento, Parámetro,
  Sesión) validan con Zod (`zodResolver`) antes de llegar al servicio — cierra parcialmente M2 (antes solo
  RLS validaba). Los servicios en sí no re-validan con Zod antes del insert (dependen de la validación del
  form + constraints de BD).
