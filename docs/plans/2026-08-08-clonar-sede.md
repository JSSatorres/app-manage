# Clonar sede Implementation Plan

**Goal:** Permitir crear una sede nueva con nombre y dirección, clonando de forma selectiva y atómica contenido permitido de otra sede del mismo workspace.

**Architecture:** Una RPC PostgreSQL transaccional será la única escritora de la clonación: valida identidad, rol, pertenencia tenant y selección, crea la sede destino y devuelve mapas origen→destino junto a un resumen. La capa React valida y construye la selección, llama a la RPC mediante el servicio de sedes y refresca las consultas afectadas; el modo de alta existente seguirá usando `createSede` cuando no se active la clonación.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Supabase PostgreSQL (RPC, RLS y migraciones), Zod, React Hook Form, TanStack Query, Vitest + Testing Library, Playwright + agent-browser.

## Perfil de verificación

- Nivel: full
- Motivo: operación transaccional multi-tenant con RPC `SECURITY DEFINER`, datos persistentes y remapeos de IDs; afecta UI y autorizaciones.
- Comandos: `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run src/__tests__/schemas/sede.test.ts src/__tests__/services/sedes.service.test.ts src/__tests__/services/tenant-scope.test.ts src/__tests__/components/SedeCloneContentSelector.test.tsx src/__tests__/components/SedeForm.test.tsx src/__tests__/components/SedesListView.test.tsx`; `npm.cmd test -- --run`; `npm.cmd run build`; `npx.cmd playwright test e2e/sede-clone.spec.ts --project=chromium --project="Mobile Chrome"`; prueba autenticada de escritorio y móvil y cruce read-only DB↔RPC↔UI.
- Evidencias esperadas: lint, TypeScript, tests y build verdes; E2E Chromium/Mobile Chrome verde; cruce en development entre resumen RPC, filas persistidas y UI; rechazo demostrado para anónimo, rol no gestor, otro workspace y payload inválido.

## Incidencias de verificación

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

- **Major — 08/08/2026 20:32:47 (Europe/Madrid):** la verificación autenticada y el cruce de datos de Task 7 están bloqueados. `npx.cmd playwright test e2e/sede-clone.spec.ts` completó con 2 escenarios anónimos verdes (Chromium y Mobile Chrome) y 12 omitidos: no existen `E2E_CLONE_STORAGE_STATE`, `E2E_CLONE_NON_MANAGER_STORAGE_STATE` ni `E2E_CLONE_FOREIGN_SEDE_NAME`. La navegación con `agent-browser` en ambos viewports redirige `/sedes` a `/login`; no se usó OAuth por interfaz. El historial remoto confirma `20260808190000` aplicado, pero sin sesiones/fixtures no se pudieron contrastar conteos, mappings, exclusiones de personas/documentos/ejercicios ni rollback atómico. Corrección necesaria: provisionar estados de sesión de gestor y no gestor, una fixture completa de origen y una referencia de sede ajena, además de acceso de solo lectura para el cruce de tablas; repetir el spec y la verificación DB.

- **R3 — 09/08/2026 (Europe/Madrid):** causa: el spec dependía de storage states externos y omitía los escenarios autenticados. Corrección: `globalSetup` inicia sesión de contraseña contra Supabase development con el usuario de test, valida sus memberships conocidas y genera dos estados temporales gitignored con la misma sesión y `sportapp_active_workspace_id` distinto; también resuelve por API una sede de tenant ajeno. El spec ya falla de forma visible si el bootstrap o la sede origen no existen. Evidencia de ejecución pendiente; no se muestran ni versionan secretos.

  - Verificación inicial: la autenticación y los estados se generaron, pero se guardaron bajo el origen de Supabase en lugar del origen local de la app; los 10 escenarios autenticados agotaron la espera de `Nueva sede` y los 4 de acceso/rol pasaron. Corrección aplicada: el token queda en localStorage del origen `E2E_BASE_URL`, con la misma clave `sb-<project-ref>-auth-token` que usa el cliente. Reejecución pendiente.

- **R4 — 09/08/2026 (Europe/Madrid):** el primer intento de `npx.cmd playwright test e2e/sede-clone.spec.ts --project=chromium --project="Mobile Chrome"` no inició casos: Playwright intentó crear un segundo `next dev` mientras el servidor local en `localhost:3000` ya estaba activo. Corrección mínima de infraestructura aplicada en `playwright.config.ts`: `reuseExistingServer: true`. El único reintento inició los 14 casos contra development `rgmrqkoudyotkpqgezzv`: 8 verdes y 6 fallidos (las tres pruebas de clonación, en Chromium y Mobile Chrome). Causa comprobada: `selectFirstCloneSource` itera también sedes E2E vacías creadas en paralelo; al seleccionarlas la UI informa «La sede de origen no tiene contenido disponible para clonar» y desmonta `Seleccionar equipos`, pero el helper espera ese checkbox hasta agotar 30 s. `agent-browser` con el storage state de gestor confirmó en escritorio los controles y que `Ciudad Deportiva Norte` no tiene equipos, sesiones, parámetros ni documentos; el estado cargado en la sesión móvil independiente redirigió a `/login`, por lo que la comprobación visual móvil queda sin evidencia adicional. No hubo llamada `clone_sede` exitosa, así que no procede cruce read-only de conteos/mappings/exclusiones/atomicidad. Incidencia para R5: endurecer el helper del spec ante el estado vacío y provisionar o localizar una fixture de origen completa antes de volver a verificar; no se modificó código de producto ni se expusieron secretos.

- **R5 — 09/08/2026 (Europe/Madrid):** causa: los escenarios autenticados elegían por índice la primera sede disponible y compartían ejecución paralela, por lo que una sede E2E vacía creada por otro caso podía convertirse en origen. Corrección: el `globalSetup` autenticado resuelve por API una sede del workspace admin distinta de `E2E*`, con equipos y nombre único, y persiste en `.auth/clone-context.json` solo ID/nombre de la fixture, workspace y prefijo único de limpieza. El spec selecciona ese ID tras comprobar el nombre exacto, ejecuta su bloque autenticado en serie y elimina únicamente registros del workspace y ejecución actual con ese prefijo validado. Evidencia: `npx.cmd playwright test e2e/sede-clone.spec.ts --project=chromium --project="Mobile Chrome"` (única ejecución R5) se detuvo antes de iniciar los 14 escenarios en `manager source sede with equipos`: la sesión admin no ve ninguna sede no-`E2E*` con al menos un equipo. Fixture exacta faltante: una sede con nombre único y no prefijado `E2E`, del workspace `Club Atlético Test`, visible para el usuario admin de test y con al menos un registro `equipos.sede_id` asociado. Sin clonación realizada, no procede cruce read-only ni comprobación visual adicional.

---

### Veredicto histórico — BLOCKED, resuelto el 09/08/2026 (Europe/Madrid)

Este veredicto recoge un bloqueo intermedio ya resuelto. Tras aportar la evidencia `full` completa indicada en el cierre final, TASK-008 quedó `finalizada` y B5-6 pasó a `[x]`.

1. **Major propio:** `src/__tests__/components/SedeCloneContentSelector.test.tsx:47` omite `trainerIds`; `npx.cmd tsc --noEmit` falla por ese test.
2. **Major — flujo full E2E/DB↔UI no demostrado:** EACCES/autenticación impiden completar la evidencia y falta una sede fuente no-`E2E` con equipos en `Club Atlético Test`. Casos finales: 0. No se demostraron mappings, exclusiones, atomicidad, roles ni cruce tenant.
3. **Major ajeno:** `src/__tests__/app/economia.page.test.tsx` no aporta `QueryClientProvider`; la suite queda en 396/397 tests verdes.
4. **Infraestructura:** el build queda bloqueado por Google Fonts.
5. **Migración:** `npx.cmd supabase migration list --linked` confirma que el historial local/remoto de `20260808190000` coincide. El hardening previo está registrado, pero no se revalidó en este intento final.

**Siguiente intervención humana exacta:** crear o designar en development una sede de origen con nombre único no prefijado `E2E`, perteneciente a `Club Atlético Test`, visible para el usuario admin de test y con al menos un `equipos.sede_id`; facilitar la sesión/autorización necesaria para ejecutar el cruce read-only DB↔RPC↔UI. Después, corregir el fixture propio que omite `trainerIds`, aislar o corregir el test ajeno de economía, resolver la disponibilidad de Google Fonts y repetir el perfil `full` antes de cualquier Fase 4 o cierre.

## Contrato y límites no negociables

- La sede destino es siempre nueva: toma exclusivamente `nombre` y `direccion` del formulario y conserva los defaults `responsable_id = null` y `configuracion_visual = {}`.
- La selección contiene arrays de UUID únicos para equipos, entrenadores, jugadores, sesiones, parámetros y asociaciones de documentos. Se rechazan claves desconocidas, IDs duplicados, IDs ajenos al workspace/origen y una sesión cuyo equipo no esté seleccionado. Al seleccionar una sesión, la UI y la normalización del payload incluyen obligatoriamente su equipo y todos sus entrenadores para satisfacer el contrato transaccional de la RPC sin cambiar SQL.
- Se duplican equipos con `workspace_id`; sus vínculos entrenador/jugador se remapean al equipo nuevo. Las personas no se duplican y se asocian de forma idempotente a la sede nueva.
- Las sesiones se clonan únicamente junto con su equipo: conservan fecha y estado válido; omiten `feedback_post_entreno`; `sesion_detalle` conserva orden, tiempos, variante y `ejercicio_id` existente; `sesion_entrenadores` reutiliza entrenadores existentes. Se excluyen adjuntos, incluidos `sesion_documentos` y `documento_equipos`.
- Los parámetros se duplican como hijos de la sede destino. Los documentos conservan su fila base y solo se recrean pivotes `documento_sedes` válidos del workspace. Nunca se clonan ejercicios, documentos, usuarios legacy ni adjuntos.
- La RPC valida `auth.uid()`, membresía y rol `superadmin`, `admin` o `gerente_sede`; fija `search_path`, revoca `PUBLIC`/`anon` y concede solo a `authenticated`. Un fallo debe revertir todo.

## Autorización de migración — gate actual

- Entorno: development
- Estado: PENDIENTE
- Decisión: el historial inferior conserva la aplicación autorizada del 08/08/2026, pero `/auto` no hereda esa aprobación. Cualquier nueva ejecución SQL, `migration repair` o cambio remoto exige una autorización inequívoca nueva justo antes de mutar el remoto.
- Proyecto previsto: `rgmrqkoudyotkpqgezzv`, branch `main`, única BD canónica de pruebas aunque el proveedor muestre la etiqueta `Production`.
- Comandos previstos si el preflight demuestra que son necesarios: aplicar exclusivamente `supabase/migrations/20260808190000_clonar_sede.sql` mediante Management API; `npx.cmd supabase migration repair 20260808190000 --status applied --linked`; `npx.cmd supabase migration list --linked`; y `npx.cmd supabase gen types typescript --linked`. No usar `supabase db push`.
- Tablas/recursos: función RPC de clonación, privilegios `EXECUTE` y el historial remoto de migraciones.
- Operaciones: crear la función transaccional tenant-safe, restringir sus privilegios, aplicar mediante Management API y reconciliar el historial de migraciones con development.
- Riesgos: una función o grants incorrectos pueden exponer datos cross-tenant; la aplicación contra una BD con drift puede dejar historial incoherente. `CREATE OR REPLACE FUNCTION` puede sustituir una versión previa: antes de aplicar se recuperará y conservará evidencia sanitizada de su DDL, propietario y grants; ante incompatibilidad se detendrá sin aplicar.
- Rollback/recuperación: si el preflight confirma que no existe función previa, el rollback exacto autorizado es `DROP FUNCTION public.clone_sede(uuid, uuid, text, text, jsonb);` seguido de `npx.cmd supabase migration repair 20260808190000 --status reverted --linked`. Si existe una función previa, no se ejecutará un rollback automático ni destructivo: se restaurará exclusivamente su DDL y sus grants capturados en el preflight, tras autorización adicional inequívoca, y solo entonces se reconciliará el historial. Producción es siempre manual.
- Historial de evidencia: 08/08/2026 (Europe/Madrid), un preflight anterior se detuvo antes de cualquier llamada autenticada porque el proceso no recibió `SUPABASE_ACCESS_TOKEN` (`PREFLIGHT_BLOCKED`). No se aplicó SQL, no se reparó el historial y no se regeneraron tipos.
- Historial de reintento: 08/08/2026 19:30:01 (Europe/Madrid). Se detectó un token no vacío en una fuente local habitual (`.env.local`), pero no se pudo demostrar entonces que la referencia efectiva fuera exclusivamente `rgmrqkoudyotkpqgezzv` (`REF_CONTRADICTION`). No se aplicó SQL, no se reparó el historial, no se consultó Realtime/RLS/grants y no se regeneraron tipos.
- Auditoría actual: 08/08/2026 19:35:32 (Europe/Madrid). La comprobación sanitizada confirmó que `.env`, `supabase/.temp/project-ref` y `supabase/.temp/linked-project.json` coinciden con el proyecto development autorizado; el token está presente exclusivamente en `.env.local` y ausente del proceso. Sin embargo, la referencia `SUPABASE_DEV_PROJECT_REF` de `.env.local` no coincide con el destino autorizado tras normalización de dotenv. Se detuvo el preflight antes de crear un header Bearer o realizar una llamada a la Management API. No se aplicó SQL, no se reparó el historial, no se regeneraron tipos ni se modificó la migración. No se almacena ni expone ningún secreto ni referencia no autorizada. El Estado de autorización se mantiene en `AUTORIZADA`; falta reconciliar la configuración local antes de reintentar.
- Reconciliación local: 08/08/2026 (Europe/Madrid). `SUPABASE_DEV_PROJECT_REF` de `.env.local` se normalizó explícitamente de la representación URL `https://<ref>.supabase.co` a `<ref>` y coincidió de forma exacta con `rgmrqkoudyotkpqgezzv`, igual que `.env` y `supabase/.temp/project-ref`. Por tanto, `REF_CONTRADICTION` era una diferencia de representación URL→ref, no un cambio de destino. El entorno rechazó la escalación para la operación remota persistente antes de efectuar cualquier llamada autenticada; no se aplicó SQL, no se reparó el historial y no se regeneraron tipos.
- Ejecución autorizada: 08/08/2026 20:00:43 (Europe/Madrid). Preflight autenticado exclusivamente contra `rgmrqkoudyotkpqgezzv`: las referencias normalizadas de `.env.local`, `project-ref` y `linked-project.json` coincidieron; proyecto `ACTIVE_HEALTHY`, las 16 tablas y todas las columnas/constraints requeridas existen, RLS quedó habilitado en 16, hay 37 policies y ninguna tabla afectada en Realtime. La función no existía y la versión `20260808190000` no estaba en el historial remoto. Se aplicó por Management API solo `supabase/migrations/20260808190000_clonar_sede.sql`; el primer postflight detectó `EXECUTE` heredado por `service_role`, se corrigió la migración con `REVOKE ALL ... FROM PUBLIC, anon, service_role` y se reaplicó exclusivamente el mismo archivo (SHA-256 final `97036AEC18CB6D66D6713A87E0AB80E721F8D295614D36E00E901BE4EDD460BD`). Postflight verde: firma esperada, `SECURITY DEFINER`, `search_path=public, pg_temp`, owner `postgres`, `authenticated` permitido y `PUBLIC`/`anon`/`service_role` denegados; RLS/policies/Realtime sin cambios. `npx.cmd supabase migration repair 20260808190000 --status applied --linked` y `migration list --linked` confirmaron la versión aplicada. Se generaron tipos desde el remoto; el archivo local ya contenía la misma firma `clone_sede`, se preservó sin sobrescribir cambios ajenos (UTF-8/LF) y `npx.cmd tsc --noEmit` terminó verde. Sin `supabase db push`.
- Autorización adicional: 08/08/2026 (Europe/Madrid), el usuario autorizó literalmente: «autorizo a hacer db push en este proyecto», limitada a development `rgmrqkoudyotkpqgezzv`. No se usó: el flujo híbrido ya había aplicado y reconciliado esta migración, por lo que un push posterior habría sido duplicado.

## Replan de pendientes reales — 09/08/2026

Este bloque sustituye el orden operativo de las Tasks 1–8 históricas sin borrar su trazabilidad. El estado compartido ya contiene SQL, tipos, schema, servicio, hooks, UI y cobertura base; solo se ejecutan los slices siguientes.

### P1: Cerrar la dependencia sesión→entrenadores con TDD

- **Files:** `src/types/sedes.ts`, `src/schemas/sede.schema.ts`, `src/services/sedes.service.ts`, `src/__tests__/schemas/sede.test.ts`, `src/__tests__/services/sedes.service.test.ts`.
- **RED:** una sesión seleccionada expone sus entrenadores requeridos y el payload normalizado no puede omitirlos.
- **GREEN:** ampliar las opciones clonables y la normalización local, manteniendo la RPC y sus defensas como autoridad final.
- **Verify:** `npm.cmd test -- --run src/__tests__/schemas/sede.test.ts src/__tests__/services/sedes.service.test.ts src/__tests__/services/tenant-scope.test.ts`; `npx.cmd tsc --noEmit`.

### P2: Hacer visible y accesible la dependencia en el selector

- **Files:** `src/components/sedes/SedeCloneContentSelector.tsx`, `src/components/sedes/SedeForm.tsx`, `src/__tests__/components/SedeCloneContentSelector.test.tsx`, `src/__tests__/components/SedeForm.test.tsx`.
- **RED:** seleccionar una sesión auto-incluye equipo y entrenadores, los bloquea mientras sean dependencia y lo explica en español mediante texto/ARIA; deseleccionar la sesión libera solo dependencias no elegidas por el usuario.
- **GREEN:** implementar la mínima normalización controlada con tokens Banquillo editorial, teclado, foco, responsive y dark mode; no cambiar permisos ni alta simple.
- **Verify:** `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx src/__tests__/components/SedeForm.test.tsx`.

### P3: Confirmar mutación e invalidaciones

- **Files:** `src/hooks/queryKeys.ts`, `src/hooks/useSedes.ts`, tests dirigidos existentes.
- **RED/GREEN:** demostrar que la query se habilita solo con workspace/origen válidos, la mutación entrega el payload normalizado y un éxito invalida sedes, equipos, sesiones, parámetros y documentos sin regresión de `createSede`.
- **Verify:** tests dirigidos, lint y typecheck.

### P4: Preflight remoto read-only y decisión de gate

- Validar de forma sanitizada refs locales/enlazadas contra `rgmrqkoudyotkpqgezzv`, salud, historial `20260808190000`, firma/DDL/owner/grants, tablas/columnas/constraints, RLS/policies y publicaciones Realtime.
- Si SQL, grants e historial ya coinciden, registrar `NO APLICA` y no mutar nada. Si existe drift, detenerse y pedir el gate completo; no ejecutar SQL, repair ni regeneración que escriba antes de autorización.

### P5: Gate y aplicación remota solo si P4 detecta drift

- Mostrar destino, recursos, operaciones/comandos exactos, riesgos de datos/bloqueos, RLS/Realtime y rollback. Cambiar `Estado` solo con respuesta explícita nueva.
- Aplicar exclusivamente el artefacto específico y reconciliar historial; nunca `db push`. Regenerar tipos a temporal, comparar y preservar cambios concurrentes antes de sustituir el generado.

### P6: E2E autenticado y cruce DB↔RPC↔UI

- Endurecer fixtures/helpers para elegir o provisionar de forma segura una sede origen completa; validar alta simple, clonación completa/parcial, dependencia de entrenadores, rol/tenant/payload manipulados y atomicidad.
- Ejecutar Chromium y Mobile Chrome, inspección visual real y consultas read-only que crucen resumen/mappings con filas persistidas y exclusiones. Los datos E2E creados deben identificarse y limpiarse de forma segura dentro del propio test.

### P7: Verifier FULL independiente

- Ejecutar estático, tests dirigidos, suite completa, build, E2E, intención visual y cruce remoto. Remediar fallos propios con executor fresco y repetir el perfil completo.

### P8 (final): Documentación y cierre

- Solo tras P7 verde: sincronizar B5-6, TASK-008, tarea maestra, este plan y `docs/crud-audit.md`; registrar fecha Europe/Madrid, rama leída sin ejecutar git, evidencia y estado real de migración.

### Task 1: Preparar contrato SQL y pruebas de seguridad sin aplicar la migración

**Files:**
- Create: `supabase/migrations/20260808190000_clonar_sede.sql`
- Modify: `src/__tests__/services/tenant-scope.test.ts`
- Modify: `src/__tests__/services/sedes.service.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Step 1: Write the failing tests** — Añadir fixtures y expectativas para el contrato RPC: transacción completa, sede destino con defaults, mapas equipo/sesión, reutilización de personas/documentos/ejercicios y los rechazos anónimo, rol no gestor, workspace/ID ajeno, IDs repetidos, clave desconocida y sesión sin equipo.

**Step 2: Run test to verify it fails** — Run: `npm run test -- --run src/__tests__/services/tenant-scope.test.ts src/__tests__/services/sedes.service.test.ts` · Expected: FAIL porque aún no existe el contrato RPC ni su servicio.

**Step 3: Write minimal implementation** — Preparar, sin ejecutar, la migración con `clone_sede(...)` `SECURITY DEFINER`, `SET search_path`, validaciones tenant/rol/payload, CTEs o bloques PL/pgSQL para inserts y mapas origen→destino, `EXCEPTION` transaccional y respuesta `{ sede, mappings, resumen }`. Incluir `REVOKE ALL ... FROM PUBLIC, anon` y `GRANT EXECUTE ... TO authenticated`; no ejecutar Management API ni `supabase db push`.

**Step 4: Run static SQL/test checks without applying** — Run: `npm run test -- --run src/__tests__/services/tenant-scope.test.ts src/__tests__/services/sedes.service.test.ts` · Expected: los tests de contrato siguen fallando hasta que el servicio simule/invoque la RPC; verificar manualmente que el archivo no aplica SQL remoto.

**Step 5: Record migration gate** — Mantener `Estado: PENDIENTE` en este plan y parar antes de cualquier aplicación remota. No hay commit: GIT=off.

### Task 2: Gate explícito y aplicación exclusiva en development

**Files:**
- Modify: `docs/plans/2026-08-08-clonar-sede.md`
- Modify: `supabase/migrations/20260808190000_clonar_sede.sql` (solo si el SQL preparado requiere corrección tras revisión)

**Step 1: Request and record authorization** — Obtener del usuario una autorización inequívoca para development y actualizar `Estado` a `AUTORIZADA`, con fecha Europe/Madrid, proyecto destino y SQL exacto a aplicar.

**Step 2: Verify the preconditions** — Confirmar con Supabase Management API la identidad del proyecto development, el drift y el estado remoto de migraciones; documentar cualquier incidencia major/critical arriba. No usar `supabase db push`.

**Step 3: Apply only after the gate** — Aplicar el SQL preparado exclusivamente con Supabase Management API y reconciliar el historial de migraciones. Producción queda fuera de alcance y manual.

**Step 4: Verify DB behavior** — Ejecutar las pruebas autorizadas contra development para comprobar atomicidad, grants y RLS/RPC; Expected: solo `authenticated` gestor del workspace puede clonar y no quedan filas parciales.

**Step 5: Stop on absent authorization** — Si la autorización no llega, no aplicar nada y continuar solo las tareas locales que no dependan de la RPC activa. No hay commit: GIT=off.

### Task 3: Definir tipos, schema y servicio de clonación

**Files:**
- Modify: `src/types/sedes.ts`
- Modify: `src/schemas/sede.schema.ts`
- Modify: `src/services/sedes.service.ts`
- Modify: `src/__tests__/schemas/sede.test.ts`
- Modify: `src/__tests__/services/sedes.service.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write the failing tests** — Cubrir en `sede.test.ts` el input de clonación, UUID únicos, categorías admitidas y la dependencia sesión→equipo; en `sedes.service.test.ts`, la llamada `cloneSede` con el payload exacto, propagación de error y tipado del resumen/mappings.

**Step 2: Run test to verify it fails** — Run: `npm run test -- --run src/__tests__/schemas/sede.test.ts src/__tests__/services/sedes.service.test.ts` · Expected: FAIL por símbolos y validaciones inexistentes.

**Step 3: Write minimal implementation** — Añadir en `src/types/sedes.ts` los tipos de selección, opciones clonables, `CloneSedeInput`, mapas y resumen; en `sede.schema.ts`, el schema Zod que rechaza payloads inválidos antes de la RPC; en `sedes.service.ts`, `fetchCloneableSedeContent(workspaceId, sourceSedeId)` tenant-scoped y `cloneSede(input)` que invoca la RPC sin duplicar lógica de seguridad del servidor.

**Step 4: Run test to verify it passes** — Run: `npm run test -- --run src/__tests__/schemas/sede.test.ts src/__tests__/services/sedes.service.test.ts` · Expected: PASS.

**Step 5: Typecheck touched modules** — Run: `npx tsc --noEmit` · Expected: PASS. No hay commit: GIT=off.

### Task 4: Exponer queries, mutación e invalidaciones de caché

**Files:**
- Modify: `src/hooks/queryKeys.ts`
- Modify: `src/hooks/useSedes.ts`
- Modify: `src/__tests__/services/sedes.service.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Step 1: Write the failing tests** — Verificar que el hook solicita el contenido del origen solo en modo clonación con workspace/origen válido, llama a `cloneSede` y, tras éxito, invalida sedes, equipos, sesiones, parámetros y documentos del workspace.

**Step 2: Run test to verify it fails** — Run: `npm run test -- --run src/__tests__/services/sedes.service.test.ts` · Expected: FAIL por claves/hook de clonación inexistentes.

**Step 3: Write minimal implementation** — Declarar claves estables para contenido clonable y crear en `useSedes.ts` la query y mutación con errores en español, retorno del resumen y las invalidaciones anteriores; conservar sin cambios el contrato de `createSede`.

**Step 4: Run test to verify it passes** — Run: `npm run test -- --run src/__tests__/services/sedes.service.test.ts` · Expected: PASS.

**Step 5: Lint the changed TypeScript** — Run: `npm run lint -- src/hooks/queryKeys.ts src/hooks/useSedes.ts` · Expected: PASS. No hay commit: GIT=off.

### Task 5: Crear selector accesible de contenido clonable

**Files:**
- Create: `src/components/sedes/SedeCloneContentSelector.tsx`
- Create: `src/__tests__/components/SedeCloneContentSelector.test.tsx`

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Step 1: Write the failing tests** — Probar selector de origen del mismo workspace, selección por categoría, selección individual, seleccionar todo, estados triestado y que sesiones sin equipo seleccionado se desmarcan/bloquean con explicación accesible; cubrir carga, vacío y error.

**Step 2: Run test to verify it fails** — Run: `npm run test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx` · Expected: FAIL porque el componente no existe.

**Step 3: Write minimal implementation** — Implementar `SedeCloneContentSelector` controlado, con labels y descripciones en español, semántica ARIA, controles de selección y normalización de la selección antes de elevarla al formulario. No permitir que la UI constituya la única defensa de integridad.

**Step 4: Run test to verify it passes** — Run: `npm run test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx` · Expected: PASS.

**Step 5: Lint the component** — Run: `npm run lint -- src/components/sedes/SedeCloneContentSelector.tsx` · Expected: PASS. No hay commit: GIT=off.

### Task 6: Integrar clonación opcional en la creación de sede

**Files:**
- Modify: `src/components/sedes/SedeForm.tsx`
- Modify: `src/components/sedes/SedesListView.tsx`
- Modify: `src/__tests__/components/SedeForm.test.tsx`
- Modify: `src/__tests__/components/SedesListView.test.tsx`

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`.

**Step 1: Write the failing tests** — Demostrar que la alta simple conserva nombre/dirección y llama a `createSede`; que activar clonación exige origen/selección válida, envía `cloneSede`, presenta el resumen y no habilita el flujo en edición.

**Step 2: Run test to verify it fails** — Run: `npm run test -- --run src/__tests__/components/SedeForm.test.tsx src/__tests__/components/SedesListView.test.tsx` · Expected: FAIL por el modo de clonación inexistente.

**Step 3: Write minimal implementation** — Integrar el toggle y selector en `SedeForm`, delegar la mutación desde `SedesListView`, mantener el formulario y callbacks existentes en alta simple/edición y mostrar resumen/errores en español tras la operación.

**Step 4: Run test to verify it passes** — Run: `npm run test -- --run src/__tests__/components/SedeForm.test.tsx src/__tests__/components/SedesListView.test.tsx` · Expected: PASS.

**Step 5: Typecheck and lint UI** — Run: `npx tsc --noEmit`; `npm run lint -- src/components/sedes/SedeForm.tsx src/components/sedes/SedeCloneContentSelector.tsx src/components/sedes/SedesListView.tsx` · Expected: PASS. No hay commit: GIT=off.

### Task 7: Verificar el flujo vertical y el cruce con development

**Files:**
- Create: `e2e/sede-clone.spec.ts`
- Modify: `src/__tests__/services/tenant-scope.test.ts`

**Skills:** `tdd`, `javascript-testing-patterns`, `agent-browser`.

**Step 1: Write the failing E2E and tenant tests** — Escenarios: alta vacía sin regresión; clonación con equipos, personas, sesión/detalle, parámetros y documento; comprobación de IDs remapeados y exclusiones; intento cross-tenant/no gestor/anónimo y fallo inducido sin persistencia parcial.

**Step 2: Run test to verify it fails** — Run: `npx playwright test e2e/sede-clone.spec.ts` · Expected: FAIL antes de disponer del flujo completo y de la migración autorizada en development.

**Step 3: Execute the full verification** — Run: `npm run lint`; `npx tsc --noEmit`; `npm run test -- --run`; `npm run build`; `npx playwright test e2e/sede-clone.spec.ts` · Expected: PASS. Si no existe autorización de migración, marcar los E2E/DB como bloqueados, no simular su resultado y conservar la tarea en progreso.

**Step 4: Browser and database evidence** — Con `agent-browser`, validar el flujo autenticado en escritorio y Mobile Chrome: controles, triestado, mensajes, resumen y ausencia de overflow. Cruzar con development que los conteos/mappings coinciden y que no crecieron tablas de personas, documentos o ejercicios.

**Step 5: Record material failures** — Añadir en «Incidencias de verificación» únicamente los fallos major/critical, con fecha, evidencia, causa, corrección y verificación. No hay commit: GIT=off.

### Task 8 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md` (si la verificación confirma el flujo)
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-clonar-sede-08-08-2026.md`
- Modify: `docs/plans/2026-08-08-clonar-sede.md`

**Step 1: Update delivery status** — Al cerrar realmente el flujo, marcar B5-6/TASK-008 como finalizados y registrar evidencia, fecha Europe/Madrid y estado de migración; si el gate sigue pendiente, conservar `[~]` y `en_progreso`.

**Step 2: Update domain and design documentation when applicable** — Reflejar en `docs/crud-audit.md` el nuevo flujo solo tras las pruebas verdes y documentar cualquier convención nueva en la guía correspondiente, si se introdujo alguna.

**Step 3: Verify documentation links** — Comprobar que registro, tarea maestra, backlog y este plan enlazan entre sí y que no se comunica como aplicada una migración pendiente.

**Step 4: Record final verification** — Añadir comandos, resultados y limitaciones reales. No hay commit: GIT=off.
## Cierre final — 09/08/2026

- Estado: `finalizada`; B5-6 `[x]`; rama leída `main`; GIT=off, sin commit, PR ni push.
- Verifier FULL acotado: 77/77 dirigidos, 556/556 suite completa, lint, TypeScript y build PASS.
- E2E autenticado: Chromium 8/8 y Mobile Chrome 8/8. Se verificaron clonación completa/parcial, resumen y remapeos, tenant, permisos, dependencias de sesión y scroll real; cleanup y puertos quedaron limpios.
- Migraciones propias alineadas `local=remote`: `20260808190000_clonar_sede.sql` y `20260809130000_clone_sede_omissions.sql`.
- La autorización adicional de `db push` quedó registrada pero no se usó. `20260809170000_schedule_document_asset_reconciliation.sql` y `20260809180000_economic_movement_invariants.sql` son drift ajeno e independiente de TASK-008; no se aplicaron y requieren gates propios. La guía de datos impide un `db push` global con ese drift.
