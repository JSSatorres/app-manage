# Confirmar omisiones al clonar sede Implementation Plan

**Goal:** Corregir la llamada RPC y permitir una clonación parcial segura que avise antes de continuar cuando no puedan recrearse relaciones por faltar sus entidades padre.

**Architecture:** El cliente calcula un preflight explicativo a partir del contenido clonable y presenta una confirmación antes de mutar. La RPC sigue siendo la autoridad transaccional: asocia entrenadores/jugadores seleccionados a la sede, crea pivotes solo para equipos clonados, omite sesiones sin equipo destino y devuelve un resumen autoritativo de omisiones. Una nueva migración reemplaza la función ya aplicada sin cambiar su firma pública.

**Tech Stack:** React 19, Next.js 16, TypeScript estricto, React Hook Form, Zod, shadcn/ui, TanStack Query, Supabase/PostgreSQL, Vitest, Testing Library y Playwright/agent-browser.

## Perfil de verificación

- Nivel: full
- Motivo: cambia la semántica de una RPC transaccional multi-tenant, el contrato de selección y el flujo de confirmación previo a persistir.
- Comandos: tests dirigidos de schema/servicio/componentes; `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run`; `npm.cmd run build`; E2E Chromium/Mobile Chrome y cruce development UI↔RPC↔filas.
- Evidencias esperadas: desaparece el error `.rest`; ninguna relación apunta a un padre no clonado; personas seleccionadas sí quedan asociadas a la sede; sesiones sin equipo se omiten; el usuario puede continuar o cancelar con un aviso explícito; el resumen cliente coincide con la respuesta y con development.

## Incidencias de verificación

- Incidencia histórica resuelta: el build quedó inicialmente bloqueado por la descarga de Google Fonts; la verificación final completó build PASS.
- Incidencia histórica resuelta: el servidor inicial respondió 404 en `/sedes`; la ejecución final aislada completó Chromium 8/8 y Mobile Chrome 8/8 con cruce UI↔RPC↔BD.

---

## Autorización de migración

- Entorno: development
- Estado: AUTORIZADA
- Decisión: el usuario autorizó explícitamente el 09/08/2026: «Apruebo el plan y autorizo la nueva migración en development».
- Proyecto previsto: `rgmrqkoudyotkpqgezzv`, branch `main`, BD canónica de pruebas según la guía del proyecto.
- Comando previsto: aplicar exclusivamente `supabase/migrations/20260809130000_clone_sede_omissions.sql` mediante Management API o SQL Editor autorizado; después `npx.cmd supabase migration repair 20260809130000 --status applied --linked`, `npx.cmd supabase migration list --linked` y `npx.cmd supabase gen types typescript --linked`. No usar `supabase db push` por el drift documentado.
- Tablas/recursos: `public.clone_sede(uuid, uuid, text, text, jsonb)`, sus grants e historial de migraciones. La función puede escribir en las mismas tablas ya autorizadas por la migración original; no se añaden tablas ni columnas.
- Operaciones: `CREATE OR REPLACE FUNCTION`, conservar `SECURITY DEFINER`/`search_path`, relajar únicamente el rechazo sesión→equipo para convertirlo en omisión controlada, calcular el resumen de omisiones y restaurar ACL `authenticated`/owner con `PUBLIC`, `anon` y `service_role` revocados.
- Riesgos: una selección efectiva mal calculada podría crear relaciones incompletas, omitir más elementos de los previstos o debilitar el aislamiento tenant; `CREATE OR REPLACE FUNCTION` toma lock de catálogo breve.
- RLS/Realtime: no se modifican policies, flags RLS ni publicaciones Realtime; el pre/postflight debe demostrarlo.
- Rollback/recuperación: guardar DDL/grants actuales y preparar SQL inverso que restaure exactamente la definición `20260808190000`; reconciliar historial como `reverted` si se revierte. Producción queda fuera de alcance.

### Registro Task 6 — 09/08/2026

- Autorización: `AUTORIZADA`; decisión explícita del usuario conservada arriba.
- Preflight remoto: **BLOQUEADO, sin aplicación**. `npx.cmd supabase migration list --linked` (CLI 2.113.0, vinculado al proyecto previsto) devolvió ya aplicada la versión remota `20260809120000`.
- Evidencia local: existen dos artefactos con la misma versión: `20260809120000_clone_sede_omissions.sql` (SHA-256 verificado `C346B0D7A2E14B910C39AF877D08CB9640F329C6DE5B323F3A4BCF4E4DFAB7DE`) y `20260809120000_secure_storage_upgrade_requests.sql`. Por ello el historial remoto no permite demostrar que solo falte el artefacto autorizado.
- Replan seguro: el artefacto autorizado se renombró localmente, sin alterar su contenido ni hash, a `20260809130000_clone_sede_omissions.sql`. La versión `20260809120000` queda exclusivamente para `secure_storage_upgrade_requests`; debe repetirse preflight antes de aplicar el nuevo identificador.
- Resolución: la versión renombrada `20260809130000` pasó el preflight y se aplicó exclusivamente en development mediante `npx.cmd supabase db query --linked --file supabase/migrations/20260809130000_clone_sede_omissions.sql`; después se reconcilió con `npx.cmd supabase migration repair 20260809130000 --status applied --linked`.
- Incidencia operativa corregida: un primer intento por API rechazó el cuerpo SQL antes de ejecutarlo, pero marcó el historial por continuación no terminante de PowerShell. Se verificó que la función seguía sin `omisiones`, se reparó temporalmente a `reverted`, se aplicó por CLI y solo entonces se volvió a marcar `applied`.
- Postflight remoto: `migration list --linked` muestra `20260809130000` local/remoto; la función contiene `omisiones`; conserva `SECURITY DEFINER` y `search_path=public, pg_temp`; `authenticated` tiene `EXECUTE`, mientras `anon` y `service_role` no lo tienen. RLS, policies y Realtime no cambiaron.
- Tipos: la firma pública continúa siendo `clone_sede(uuid,uuid,text,text,jsonb)` y el retorno sigue siendo `jsonb`; no hay diferencia generada que requiera sobrescribir `src/types/database.types.ts`. `npx.cmd tsc --noEmit` pasa.

## Diagnóstico confirmado

- `cloneSede` extrae `supabase.rpc` y lo invoca sin receptor. El SDK accede a `this.rest.rpc`, de ahí el mensaje exacto `Cannot read properties of undefined (reading 'rest')`.
- La RPC ya asocia entrenadores/jugadores seleccionados directamente con la sede y solo crea pivotes de equipo dentro del bucle de equipos clonados.
- Selector, schema y RPC autoañaden o exigen el equipo de una sesión; por tanto, hoy no existe el concepto de omitir una sesión seleccionada sin equipo.
- No hay confirmación previa ni omisiones en el resultado; `SedesListView` usa además una selección cerrada antigua en vez del argumento normalizado entregado por el formulario.
- `task/BIBLE.md` no existe en este repositorio; las reglas se registran en la tarea maestra y este plan.

## Reglas confirmadas

- Entrenador o jugador seleccionado: asociarlo siempre a la sede destino.
- Si su equipo origen no fue seleccionado: no crear la pivote hacia equipo destino; registrar la relación omitida.
- Sesión seleccionada cuyo equipo no fue seleccionado: no crear la sesión ni sus detalles/relaciones; registrarla como omitida.
- Las dependencias de una sesión que sí se clona conservan la defensa actual: sus entrenadores necesarios deben incluirse según el contrato normalizado.
- Antes de llamar a la RPC, si existen omisiones, mostrar su resumen agrupado y las acciones «Continuar de todos modos» y «Cancelar y revisar».
- Cancelar conserva formulario y selección. Continuar ejecuta exactamente la selección revisada.
- Después del éxito, mostrar también el resumen autoritativo de omisiones devuelto por la RPC.

### Task 1: Corregir la invocación RPC sin perder el receptor

**Files:**
- Modify: `src/__tests__/services/sedes.service.test.ts`
- Modify: `src/services/sedes.service.ts`

**Skills:** `diagnose`, `tdd`, `javascript-testing-patterns`.

**Step 1: Write the failing regression test** — Usar un mock de cliente cuyo `rpc()` delega mediante `this.rest.rpc()` y verificar que `cloneSede` alcanza el transporte conservando el receptor.

**Step 2: Run RED** — `npm.cmd test -- --run src/__tests__/services/sedes.service.test.ts` · Expected: FAIL con el mismo acceso a `.rest` de la captura.

**Step 3: Minimal fix** — Invocar `supabase.rpc(...)` como método del cliente y tipar el resultado sin extraer el método. No usar `bind`, `any` ni duplicar el cliente.

**Step 4: Run GREEN** — Repetir el test dirigido · Expected: PASS y payload `clone_sede` intacto.

### Task 2: Modelar selección efectiva y omisiones

**Files:**
- Modify: `src/types/sedes.ts`
- Modify: `src/schemas/sede.schema.ts`
- Modify: `src/__tests__/schemas/sede.test.ts`
- Modify: `src/__tests__/services/sedes.service.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write RED** — Cubrir: persona seleccionada sin equipo sigue en IDs de sede; pivotes del equipo ausente se describen como omitidos; sesión sin equipo queda fuera de la selección efectiva y aparece en omisiones; sesión con equipo conserva sus dependencias.

**Step 2: Define contracts** — Añadir tipos discriminados de omisión y resultado/preflight con códigos estables, IDs, etiquetas en español y conteos agrupados. Extender `CloneSedeResult` sin romper los contadores existentes.

**Step 3: Implement pure analysis** — Crear una función pura y testeable que derive `effectiveSelection` y `omissions` desde contenido origen + selección del usuario. Zod valida IDs únicos/tenant-scoped pero deja de autoañadir el equipo de una sesión que será omitida.

**Step 4: Run GREEN** — Tests de schema/servicio · Expected: PASS.

### Task 3: Presentar confirmación explícita antes de clonar

**Files:**
- Modify: `src/components/sedes/SedeCloneContentSelector.tsx`
- Modify: `src/components/sedes/SedeForm.tsx`
- Modify: `src/__tests__/components/SedeCloneContentSelector.test.tsx`
- Modify: `src/__tests__/components/SedeForm.test.tsx`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write RED** — Seleccionar personas/sesiones con padres ausentes y comprobar que no se llama a `onCloneSubmit` hasta confirmar; el modal enumera qué se omitirá; cancelar conserva selección; continuar envía la selección efectiva.

**Step 2: Implement dialog** — Reutilizar `AlertDialog`/primitivos existentes. Copy en español, foco inicial seguro en «Cancelar y revisar», resumen agrupado, accesible y responsive. No mostrarlo cuando no hay omisiones.

**Step 3: Preserve selector autonomy** — Permitir desmarcar equipo sin borrar la intención de seleccionar la sesión; la sesión se presenta como omitida en el preflight, no se autoañade silenciosamente el equipo.

**Step 4: Run GREEN** — Tests de selector/formulario · Expected: PASS.

### Task 4: Usar el payload confirmado y mostrar el resultado

**Files:**
- Modify: `src/components/sedes/SedesListView.tsx`
- Modify: `src/__tests__/components/SedesListView.test.tsx`
- Modify if needed: `src/hooks/useSedes.ts`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write RED** — Verificar que el callback usa el argumento normalizado/confirmado del formulario, no el estado `cloneSelection` cerrado; tras éxito muestra contadores clonados y omitidos.

**Step 2: Implement minimal wiring** — Pasar exactamente `input.selection` a la mutación y mapear el resultado autoritativo a un mensaje comprensible. No recalcular omisiones después de mutar.

**Step 3: Run GREEN** — Tests de listado/hook dirigidos · Expected: PASS.

### Task 5: Preparar la RPC que omite dependencias ausentes

**Files:**
- Create: `supabase/migrations/20260809130000_clone_sede_omissions.sql`
- Modify: `src/__tests__/services/tenant-scope.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Step 1: Write contract RED** — Inspección SQL/tests tenant para selección efectiva, omisiones, grants y ausencia de pivotes huérfanas.

**Step 2: Prepare SQL locally** — Partir de la función vigente, calcular sesiones efectivas mediante equipos seleccionados, validar entrenadores solo para sesiones efectivas, conservar asociaciones sede-persona, omitir pivotes de equipos no clonados y devolver `omisiones` junto a mappings/resumen.

**Step 3: Security review** — Mantener auth, membership/rol, workspace, UUIDs únicos, `SECURITY DEFINER`, `search_path` y ACL endurecida. No aplicar todavía.

**Step 4: Gate** — En esta fase histórica se exigía detenerse antes de cualquier llamada remota mientras el estado fuese `PENDIENTE`; la autorización posterior quedó registrada y la migración propia se reconcilió sin `db push`.

### Task 6: Aplicar solo con autorización y verificar development

**Files:**
- Modify: `docs/plans/2026-08-09-confirmar-omisiones-clonar-sede.md`
- Modify if generated comparison changes: `src/types/database.types.ts`

**Step 1: Record authorization** — Cambiar el gate a `AUTORIZADA` únicamente con respuesta explícita nueva.

**Step 2: Preflight read-only** — Confirmar ref, historial, DDL/grants actuales, RLS/policies/Realtime y que solo falta `20260809130000`.

**Step 3: Apply exact artifact** — Aplicar solo el nuevo SQL por la vía autorizada del proyecto; reconciliar historial y regenerar tipos sin sobrescribir cambios ajenos.

**Step 4: Postflight** — Probar manager/no gestor/cross-tenant, atomicidad y conteos de omisiones; verificar ausencia de pivotes huérfanas.

### Task 7: Verificación vertical full

**Files:**
- Modify: `e2e/sede-clone.spec.ts`
- Verify: todos los archivos de Tasks 1–6

**Step 1: Directed tests** — Ejecutar schema, servicio, selector, formulario, listado y tenant scope.

**Step 2: Static/suite/build** — `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run`; `npm.cmd run build`.

**Step 3: E2E desktop/mobile** — Con fixture origen controlada: continuar/cancelar, personas sin equipo, sesión omitida, flujo sin omisiones y error RPC legible; comprobar que nunca aparece `.rest`.

**Step 4: DB↔UI** — Cruzar conteos clonados/omitidos y confirmar que no existen pivotes a equipos/sesiones ausentes.

### Task 8 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-clonar-sede-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md` si la verificación cambia el estado CRUD
- Modify: `docs/plans/2026-08-09-confirmar-omisiones-clonar-sede.md`

**Steps:** Registrar comandos y resultados reales; durante la ejecución se mantuvieron TASK-008/B5-6 en progreso hasta que gate y perfil FULL quedaron verdes. Cierre del 09/08/2026: TASK-008 `finalizada`, B5-6 `[x]`, reglas y estado remoto sincronizados; no surgió una convención reusable nueva para design-guides.
