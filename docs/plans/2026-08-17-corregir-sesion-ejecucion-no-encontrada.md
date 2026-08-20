# Corregir sesión de ejecución no encontrada — Implementation Plan

**Goal:** Restaurar la apertura de sesiones cuyos equipos legacy carecen de `workspace_id`, sin relajar el aislamiento multi-tenant, y evitar que nuevas altas o ediciones vuelvan a dejar ese campo nulo.

**Architecture:** Mantener la comprobación directa actual de `equipo.workspace_id` como camino principal de `getSesionById` y añadir únicamente para filas legacy una prueba positiva de pertenencia mediante `sesión → equipo.sede_id → sede.workspace_id`. Corregir además los payloads de escritura de equipos para persistir el workspace ya exigido por el contrato de entrada. No se cambia el runner, la ruta Next.js ni el esquema.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase/PostgREST, Vitest.

## Diagnóstico reproducible

- Síntoma exacto: `SesionEjecutarView` muestra «No se encontró la sesión solicitada.» porque `useSesion(...).data` recibe `null`, aunque las consultas HTTP respondan 200.
- Causa confirmada: `createEquipo` y `updateEquipo` omiten `input.workspaceId`; después `getSesionById` exige que el equipo tenga el workspace activo. PostgREST responde 200 con `data: null`/`[]` cuando la fila no satisface el filtro.
- Seam de regresión: servicios `getSesionById`, `createEquipo` y `updateEquipo`. Permite reproducir la misma cadena causal de manera determinista sin depender de red o datos remotos.
- Hipótesis descartadas: `params` dinámicos de Next.js 16 (la página usa `Promise` + `await`), ausencia de bloques (produciría otro mensaje) y falta de permiso de ejecución (produciría otro mensaje antes de consultar).
- Sin migración: el esquema ya contiene `equipos.workspace_id`. El backfill histórico es higiene opcional y queda fuera de alcance; la compatibilidad por sede restaura las sesiones existentes sin mutar datos.

## Contratos e invariantes

- Nunca devolver una sesión solo porque el equipo existe: la pertenencia al workspace debe quedar probada de forma positiva.
- Conservar como camino principal `equipos.id + equipos.workspace_id = workspaceId`.
- Ejecutar el fallback solo cuando el camino principal devuelve `data: null` sin error.
- El fallback solo acepta la sesión si `equipo.sede_id` existe y una sede con ese `id` satisface `sedes.workspace_id = workspaceId`.
- Ante equipo inexistente, sede ausente, sede de otro workspace o error de cualquiera de las consultas: devolver `data: null` o el error conforme al contrato actual.
- `createEquipo` y `updateEquipo` deben persistir `workspace_id: input.workspaceId` sin cambiar sus demás payloads.
- No modificar RLS, migraciones, rutas, componentes ni hooks.

## Perfil de verificación

- Nivel: full
- Motivo: cambia lecturas y escrituras persistentes con comprobación multi-tenant; requiere demostrar aislamiento, regresión del servicio, compilación y el flujo real de ejecución.
- Comandos: `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run src/__tests__/services/get-by-id.test.ts src/__tests__/services/equipos.service.test.ts src/__tests__/components/SesionEjecutarView.test.tsx`; `npm.cmd test -- --run`; `npm.cmd run build`; E2E dirigido según `docs/design-guides/frontend_styleguide.md` y `docs/design-guides/data_styleguide.md`, incluyendo `e2e/sesiones-ejecucion.spec.ts` si el entorno/auth de test está disponible; comprobación read-only BD↔UI/API cuando proceda.
- Evidencias esperadas: los tests nuevos fallan antes del fix y pasan después; se conserva el rechazo de otro workspace; lint, typecheck, suite y build pasan; el runner abre una sesión legacy autorizada y sigue rechazando una de otro workspace.

## Incidencias de verificación

- Ronda 1 · 17/08/2026 · `major` · E2E canónico inestable: `npm.cmd run test:e2e -- e2e/sesiones-ejecucion.spec.ts` falló con concurrencia por esperas de 5 s durante la carga de dashboard/sesiones, aunque `--workers=1` pasó 16/16. Impacto: el comando contractual no es determinista. Evidencia: primera ejecución 12 PASS/1 FAIL/3 no ejecutados; segunda 2 PASS/2 FAIL; serial 16/16 PASS. Pendiente de remediación y repetición full.
- Ronda 1 · 17/08/2026 · `major` · falta evidencia E2E del fallback legacy: la fixture remota comprobada tiene `teamWorkspaceNull:false` y no hay equipos legacy accesibles (`legacyTeams:0`). Impacto: el E2E verde cubre el runner, pero no la rama nueva. Pendiente de fixture efímera/aislada segura y repetición full.
- Ronda 2 · 17/08/2026 · `critical` · RESUELTA en R3. Causa: el fallback no exigía explícitamente `legacyEquipo.workspace_id IS NULL`; un equipo asignado a otro workspace pero apuntando a una sede activa podía superar la validación. Corrección: recuperar `sede_id,workspace_id`, continuar solo con `workspace_id === null` y añadir regresión equipo-ajeno+sede-activa. Evidencia verde: test RED reprodujo la autorización indebida; después 12/12 del servicio, dirigidos 28/28, suite 679/679 e inspección independiente PASS.
- Ronda 2 · 17/08/2026 · `major` · RESUELTA para el alcance dirigido en R3. El segundo run dejó dos casos admin en carga; probes posteriores mostraron requests Supabase 200 y HMR/Fast Refresh concurrente sin error de consola. No se ocultó con retries. Evidencia verde independiente: dos ejecuciones canónicas dirigidas consecutivas 16/16 (33,6 s y 31,0 s).
- Ronda 2 · 17/08/2026 · `major` · se repite la ausencia de fixture legacy real. La BD de test no contiene una candidata accesible y `.env.test.local` no dispone de `SUPABASE_SERVICE_ROLE_KEY`; no se puede sembrar/limpiar `sesion_bloques` con el rol authenticated. No hubo mutaciones remotas. Condición de desbloqueo: credencial temporal limitada al project ref canónico o fixture legacy existente y reversible.
- Ronda 3 · 17/08/2026 · `major` · BLOCKED: estático, dirigidos, suite, build, seguridad y dos E2E dirigidos están verdes, pero el perfil full exige demostrar BD→UI con equipo legacy real. La fixture disponible tiene `workspace_id` no nulo, no hay legacy accesible y falta `SUPABASE_SERVICE_ROLE_KEY`. Condición mínima: proporcionar una fixture legacy existente/autorizada o la credencial temporal restringida a `rgmrqkoudyotkpqgezzv` para sembrar UUIDs aislados, limpiar exactamente bloques→sesión→equipo→ejercicio y repetir cruce BD→UI + dos E2E dirigidos. No se ejecutaron mutaciones ni quedan residuos.

---

### Task 1: Recuperar sesiones legacy con validación positiva por sede

**Skills:** `diagnose`, `tdd`, `javascript-testing-patterns`

**Files:**
- Modify: `src/__tests__/services/get-by-id.test.ts`
- Modify: `src/services/sesiones.service.ts` (`getSesionById`)

**Precondiciones:**
- Leer `AGENTS.md`, `.agents/protocol/operating-protocol.md`, `docs/design-guides/frontend_styleguide.md` y `docs/design-guides/data_styleguide.md` completos.
- Antes de escribir, leer la guía instalada relevante de Next.js 16 en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`; confirmar que esta tarea no requiere tocar la ruta.
- Leer completas las skills `tdd` y `javascript-testing-patterns`.

**Step 1: Preparar el seam de consultas secuenciales**

Ampliar el helper mock por tabla de `get-by-id.test.ts` para poder consumir una secuencia `QueryResponse[]` en las dos llamadas a `equipos`, preservando el comportamiento de los tests existentes que usan una sola respuesta.

**Step 2: Escribir primero las regresiones RED**

- Caso autorizado: sesión con `equipo_id = "equipo-legacy"`; primera respuesta de `equipos` `{ data: null, error: null }`; segunda `{ data: { sede_id: "sede-active" }, error: null }`; `sedes` devuelve `{ data: { id: "sede-active" }, error: null }`; entrenadores vacíos. Esperar que `result.data.id` sea `"sesion-1"`.
- Caso de aislamiento: mismo equipo legacy, pero `sedes` devuelve `{ data: null, error: null }`. Esperar `result.data === null`.
- Afirmar filtros: la primera consulta a equipos incluye `workspace_id = WORKSPACE_ID`; la segunda incluye `id = "equipo-legacy"`; la consulta a sedes incluye `id = "sede-active"` y `workspace_id = WORKSPACE_ID`.
- Conservar el test existente que rechaza un equipo de otro workspace.

**Step 3: Ejecutar el test para demostrar el fallo**

Run: `npm.cmd test -- --run src/__tests__/services/get-by-id.test.ts`

Expected: FAIL únicamente en los casos legacy nuevos porque `getSesionById` todavía termina tras fallar el scope directo.

**Step 4: Implementar el fallback mínimo y seguro**

En `getSesionById`, conservar el query directo de equipo. Solo para `data: null` sin error, consultar el `sede_id` del mismo equipo y después exigir una sede con ese `id` y `workspace_id` activo. Reutilizar los patrones de errores y retorno del servicio vecino; no confiar solo en RLS ni reutilizar un fallback sin filtro de workspace.

**Step 5: Verificar GREEN y autocomprobación barata**

Run: `npm.cmd test -- --run src/__tests__/services/get-by-id.test.ts`

Expected: PASS, incluidos los casos autorizado, otro workspace y fallos de consultas.

Run: `npm.cmd run lint`

Expected: PASS.

### Task 2: Persistir el workspace en altas y ediciones de equipos

**Skills:** `diagnose`, `tdd`, `javascript-testing-patterns`

**Files:**
- Modify: `src/__tests__/services/equipos.service.test.ts`
- Modify: `src/services/equipos.service.ts` (`createEquipo`, `updateEquipo`)

**Precondiciones:**
- Leer `AGENTS.md`, `.agents/protocol/operating-protocol.md`, `docs/design-guides/frontend_styleguide.md` y `docs/design-guides/data_styleguide.md` completos.
- Antes de escribir, leer la documentación instalada relevante de Next.js 16 en `node_modules/next/dist/docs/`; confirmar que la tarea es de servicio y no requiere cambiar APIs de framework.
- Leer completas las skills `tdd` y `javascript-testing-patterns`.

**Step 1: Escribir primero las regresiones RED**

En los tests existentes de creación y edición, proporcionar `workspaceId: "ws-active-111"` y exigir que los payloads enviados a Supabase incluyan `workspace_id: "ws-active-111"`, manteniendo todas las demás expectativas.

**Step 2: Ejecutar el test para demostrar el fallo**

Run: `npm.cmd test -- --run src/__tests__/services/equipos.service.test.ts`

Expected: FAIL en las expectativas de `workspace_id`, que actualmente se omite.

**Step 3: Implementar el payload mínimo**

Añadir `workspace_id: input.workspaceId` a los objetos de `insert` y `update`. No añadir defaults, queries extra, backfill ni cambios de esquema.

**Step 4: Verificar GREEN y regresión dirigida**

Run: `npm.cmd test -- --run src/__tests__/services/equipos.service.test.ts src/__tests__/services/get-by-id.test.ts src/__tests__/components/SesionEjecutarView.test.tsx`

Expected: PASS.

Run: `npm.cmd run lint`

Expected: PASS.

### Task 3 (final, solo después de verificación full verde): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md` (B14-13)
- Modify: `docs/crud-audit.md` (nota de equipos)
- Keep: `docs/design-guides/*` sin cambios, salvo que la implementación haya introducido una convención nueva (no prevista)

**Steps:**

1. Marcar B14-13 como completada únicamente después del veredicto `PASA` del verifier.
2. Documentar que nuevas altas/ediciones guardan `workspace_id` y que la lectura de sesiones legacy valida la pertenencia por sede.
3. Aclarar que no se ejecutó backfill ni migración y que la higiene de filas históricas puede planificarse aparte con su gate de BD.
4. No marcar ni modificar la tarea del runner B2-5, porque el runner no era la causa.

No hay commits ni comandos git: `GIT=off`.
