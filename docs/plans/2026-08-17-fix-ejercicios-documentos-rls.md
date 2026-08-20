# Corregir selector de documentos y RLS de ejercicios Implementation Plan

**Goal:** Hacer que el alta y edición de ejercicios ofrezcan únicamente los documentos globales del workspace activo y los asociados a la sede activa, y permitir que un administrador guarde ejercicios globales sin debilitar el aislamiento RLS.

**Architecture:** El formulario obtendrá workspace y sede desde `useWorkspaceContext`, usará una query key tenant-aware y delegará en un catálogo documental con dos ramas explícitas: asociaciones de la sede y globales exactos del workspace. El guardado conservará abierto el diálogo cuando falle la mutación base y hará visibles los errores de sincronización documental. Una migración aislada sustituirá `ejercicios_mutate` por policies separadas de `INSERT`, `UPDATE` y `DELETE`, con mínimo privilegio y sin tocar lectura, grants, pivotes ni Realtime.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, React Hook Form + Zod, TanStack Query mediante los wrappers locales, Supabase/PostgreSQL con RLS, Vitest + Testing Library y Playwright.

## Perfil de verificación

- Nivel: full
- Motivo: corrige un flujo autenticado de persistencia multi-tenant, cambia RLS de `public.ejercicios` y requiere una migración remota; el perfil no se puede rebajar.
- Comandos: `npm test -- --run src/__tests__/components/EjercicioForm.test.tsx src/__tests__/components/EjerciciosListView.test.tsx src/__tests__/hooks/useEjercicios.test.tsx src/__tests__/services/documentos.service.test.ts src/__tests__/services/ejercicio-documentos.service.test.ts src/__tests__/services/ejercicios-rls-migration.test.ts src/__tests__/services/tenant-scope.test.ts`; `npm run lint`; `npx.cmd tsc --noEmit`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/ejercicios-documentos-rls.spec.ts --project=chromium --project="Mobile Chrome"`; consultas read-only de `pg_policies`, `pg_class`, `pg_publication_tables` y filas creadas mediante clientes autenticados.
- Evidencias esperadas: RED previo para catálogo vacío, cierre indebido del diálogo y policy que rechaza el ejercicio global; tests dirigidos y suite completa verdes; build Next.js 16 verde; policy remota idéntica al artefacto versionado; matriz de roles/tenants verificada; selector visible en escritorio y 375×667; fila `ejercicios` y pivote `ejercicio_documentos` coherentes con la UI.

## Incidencias de verificación

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

### Major — Ronda 2 — 17/08/2026 — BLOQUEADA por infraestructura

- Impacto: la matriz RLS obligatoria sigue sin poder ejecutar los casos de `SuperAdmin` ni la limpieza autorizada de filas de otra sede; por tanto, Task 5 no puede dar PASA y Task 6/B14-4 no se cierran.
- Evidencia estática y local: `npm run lint` y `npx.cmd tsc --noEmit` PASA; los 49 tests dirigidos PASA; la suite completa PASA con 681 tests; `npm run build` PASA en 39,1 s. La migración y sus postchecks read-only PASA. No se ejecutó DML de negocio durante esta ronda.
- Evidencia de intención/E2E: el E2E dirigido termina con 2 fallos y 2 casos no ejecutados, ambos proyectos detenidos en `e2e/support/auth.ts:44`, antes de crear fixtures, por ausencia exclusiva de `E2E_SUPERADMIN_EMAIL` y `E2E_SUPERADMIN_PASSWORD`. `agent-browser` redirige a login porque no hay sesión reutilizable disponible.
- Remediación aplicada en Ronda 1: se resolvieron los 13 IDs estáticos `E2E_RLS_*` mediante scopes RLS-safe; cada actor descubre por consultas de solo lectura su usuario, sede y workspace, y el SuperAdmin descubre la segunda sede y el otro workspace. La credencial SuperAdmin sigue siendo indispensable y no admite un alias seguro.
- Estado y siguiente paso: BLOQUEADA exclusivamente por infraestructura. Una persona debe configurar `E2E_SUPERADMIN_EMAIL` y `E2E_SUPERADMIN_PASSWORD` en `.env.test.local` (gitignored), o facilitar una sesión reutilizable; después se repetirá el perfil FULL completo. No se ha marcado ninguna tarea como terminada.

---

## Estado del diagnóstico

- Flujo confirmado: `src/app/(dashboard)/ejercicios/page.tsx` → `EjerciciosListView` → `EjercicioForm` → `useEjercicios.createOne` → `createEjercicio` → `syncEjercicioDocumentos`.
- Síntoma 1: el selector muestra `No hay documentos disponibles` aunque existan documentos globales del club. `EjercicioForm` llama `fetchDocumentosDisponibles(sedeIds)` sin `activeWorkspaceId`; el servicio solo incorpora globales si recibe workspace y su query actual combina de forma incorrecta IDs asociados con `workspace_id IS NULL`.
- Síntoma 2: guardar un ejercicio global devuelve PostgreSQL/PostgREST `42501` sobre `ejercicios`. La policy remota `ejercicios_mutate` coincide con `supabase/migrations/021_rls_por_rol.sql:47-62` y exige `sede_propietaria_id = current_user_sede_id()` para cualquier rol no `SuperAdmin`; un global usa `sede_propietaria_id = NULL` y queda rechazado.
- Síntoma 3: `EjerciciosListView` cierra siempre el formulario tras `await createOne/updateOne`, incluso si estos devuelven `null`; tampoco pasa `createErrorMessage`/`updateErrorMessage` al formulario. `useEjercicios` consulta un `errorMessage` React obsoleto tras `mutate`, y `syncEjercicioDocumentos` ignora el error del `DELETE`.
- Feedback loop primario: tests de servicio y componente que ejecutan la query pública, simulan `42501` y observan que el diálogo permanece abierto con feedback.
- Feedback loop RLS: test de contrato del SQL antes de crear la migración y E2E posterior al gate que cruza UI, clientes autenticados y filas remotas.
- No hace falta instrumentación temporal: el preflight read-only ya identificó las dos causas raíz y la ruta completa. Si el código o catálogo remoto difieren al ejecutar, se detiene la tarea y se actualiza este plan antes de ampliar el alcance.

## Contratos e invariantes

### Catálogo documental del ejercicio

- Con `activeWorkspaceId` y sede activa: incluir documentos asociados por `documento_sedes.sede_id`, documentos legacy cuyo `documentos.sede_id` sea esa sede y documentos globales exactos con `documentos.workspace_id = activeWorkspaceId`, `documentos.sede_id IS NULL` y sin asociación a otra sede.
- Excluir documentos de otras sedes, de otros workspaces y cualquier fila `workspace_id IS NULL`; `NULL` nunca representa un global transversal.
- Sin sede activa pero con workspace: devolver solo globales exactos del workspace. Sin workspace: devolver `[]` sin lanzar una consulta no acotada.
- Deduplicar por `documentos.id`, mantener el mapeo `Documento` actual y conservar el orden por `updated_at DESC`.
- La query key debe contener workspace y sedes. Cambiar de club o sede no puede reutilizar el catálogo anterior.
- Error de consulta y lista vacía son estados distintos. El error se muestra en español junto al campo; no se traduce a `No hay documentos disponibles`.

### Guardado y asociaciones

- Una mutación base que devuelva `null` no sincroniza pivotes, no refresca como si hubiera éxito y no cierra el diálogo. El formulario muestra el error de create/update con prefijo español.
- `createOne`/`updateOne` deciden por el valor devuelto por `mutate`, nunca por `mutation.errorMessage` capturado antes del re-render.
- `syncEjercicioDocumentos` devuelve inmediatamente el error del borrado y no intenta insertar; también propaga el error de inserción.
- Si la fila base quedó persistida pero falla el pivote, no se invita a repetir un `INSERT` que podría duplicar el ejercicio: se refresca el listado, se cierra el alta/edición y se muestra un error parcial inequívoco en la vista (`El ejercicio se guardó, pero no se pudieron asociar sus documentos…`). Un nuevo intento se hace editando esa fila.
- Un guardado completo limpia el error parcial anterior. No se modifica el wrapper compartido `useMutation` ni otros dominios.

### Matriz RLS de mutación

| Actor/caso | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|
| `SuperAdmin`, global coherente o sede perteneciente al workspace de la fila | permitir | permitir | permitir |
| `AdminSede` cuya membresía raw es `admin`, global de ese workspace | permitir | permitir | permitir |
| `AdminSede` o `Entrenador`, ejercicio no global de `current_user_sede_id()` y sede perteneciente al workspace de la fila | permitir | permitir | permitir |
| `AdminSede` global de otro workspace | denegar | denegar | denegar |
| `Entrenador` global o de otra sede | denegar | denegar | denegar |
| `gerente_sede` global | denegar; no equipararlo a `admin` en el helper workspace-aware | denegar | denegar |
| `Jugador`, anónimo o cualquier actor fuera del scope anterior | denegar | denegar | denegar |

- Una fila global coherente tiene `es_global IS TRUE` y `sede_propietaria_id IS NULL`.
- Una fila de sede coherente tiene `es_global IS NOT TRUE`, `sede_propietaria_id IS NOT NULL` y una sede cuyo `workspace_id` coincide con `ejercicios.workspace_id`.
- No se toca `ejercicios_select`, aunque exista deuda histórica; tampoco `documentos`, `ejercicio_documentos`, grants, funciones helper, publicaciones Realtime, tipos generados ni B9-4.

## Autorización de migración

- Entorno: development — remoto canónico `rgmrqkoudyotkpqgezzv`, rama `main`, única BD y exclusivamente de prueba según `AGENTS.md`.
- Estado: AUTORIZADA
- Decisión: AUTORIZADA — autorización explícita del usuario recibida el 17/08/2026 (Europe/Madrid).
- Comando previsto: ejecutar en SQL Editor/Management API del proyecto indicado el contenido íntegro y comprobado de `supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql`; solo después de aplicación y postchecks verdes, ejecutar `npx.cmd supabase migration repair 20260817120000 --status applied --linked`.
- Tablas/recursos: únicamente `public.ejercicios` y sus policies de mutación. Se consultan, pero no se modifican, `public.sedes`, `public.workspace_members` y los helpers de rol/workspace existentes.
- Operaciones: `DROP POLICY` de `ejercicios_mutate`; `CREATE POLICY` separadas para `INSERT ... WITH CHECK`, `UPDATE ... USING/WITH CHECK` y `DELETE ... USING`. Sin DML de negocio, cambios de columnas/constraints, grants, pivotes ni publicación Realtime.
- Riesgos: lock breve de catálogo al sustituir policies; mutaciones concurrentes pueden esperar o fallar; un predicado incorrecto puede denegar escrituras legítimas o ampliar acceso entre tenants. No se espera pérdida ni reescritura de filas.
- Impacto RLS/Realtime: cambia solo autorización de escritura en `public.ejercicios`; SELECT queda intacto. El preflight confirmó que la tabla no está publicada en Realtime y la migración no debe alterar esa situación.
- Rollback/recuperación: si falla dentro de `BEGIN/COMMIT`, PostgreSQL revierte la transacción. Si los postchecks fallan tras aplicar, antes de `migration repair` se eliminan las tres policies nuevas y se restaura literalmente `ejercicios_mutate` de `supabase/migrations/021_rls_por_rol.sql:47-62`; después se repiten los postchecks. Si falla solo `migration repair`, no se vuelve a ejecutar el SQL: se conserva el estado aplicado, se registra el bloqueo y se reintenta únicamente la reconciliación del historial.
- Ejecución 17/08/2026 (Europe/Madrid): decisión del usuario `AUTORIZADA`; destino verificado `rgmrqkoudyotkpqgezzv`/`main` y SHA-256 del artefacto `1F4D8FEA47AA0228B5257A8FBDB9B255E4E70371775F040BF41BFF0514257561`.
- Aplicación: desde el hilo raíz, `npx.cmd supabase db query --linked --file supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql`; exit 0, sin errores. No se usó `db push`.
- Postchecks read-only: PASA. Existen las tres policies de mutación exactas/equivalentes; no permanece la policy histórica de mutación; `ejercicios_select` sigue intacta; RLS está enabled y no forced; grants intactos; `ejercicios` sigue fuera de Realtime y con replica identity `DEFAULT`; policies vecinas intactas. No fue necesario rollback.
- Historial: desde el hilo raíz, `npx.cmd supabase migration repair 20260817120000 --status applied --linked`; exit 0, salida `Repaired migration history: [20260817120000] => applied`.
- Confirmación read-only posterior: `npx.cmd supabase migration list --linked`; el primer intento en sandbox falló por `EPERM` al escribir telemetría local y la repetición autorizada fuera del sandbox terminó con exit 0. `20260817120000` figura alineada local/remoto; el listado no aplicó las migraciones históricas pendientes. El CLI informó ficheros locales omitidos por nombre no conforme, sin alterar el historial.
- Estado final del gate Task 4: PASA (SQL aplicado, postchecks verdes e historial reparado). La verificación FULL de Task 5 y la documentación final de Task 6 permanecen pendientes.

**Pregunta obligatoria justo antes de Task 4:** ¿Autorizas aplicar en development, exclusivamente sobre `rgmrqkoudyotkpqgezzv`/`main`, el SQL completo de `supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql` que reemplaza la policy de mutación de `public.ejercicios`, y después reconciliar el historial con `npx.cmd supabase migration repair 20260817120000 --status applied --linked`, aceptando el lock breve y el riesgo de denegación/ampliación accidental descritos, con rollback a la policy exacta de `021_rls_por_rol.sql:47-62` y sin cambios de Realtime?

## Reglas de ejecución

- Antes de tocar código, el executor lee completos `AGENTS.md`, `.agents/protocol/operating-protocol.md`, las dos design guides y `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` más `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- Cada tarea funcional usa RED → GREEN → refactor mínimo. No se ejecuta Git (`GIT=off`) ni se añaden dependencias.
- La migración se prepara en Task 3 pero no se aplica hasta Task 4 con `Estado: AUTORIZADA`. Nunca usar `supabase db push` ni mezclar migraciones pendientes de Documentos.
- UI y mensajes visibles en español; TypeScript estricto; LF; ediciones quirúrgicas.

### Task 1: Reproducir y corregir el catálogo documental tenant-aware

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**

- Modify: `src/components/ejercicios/EjercicioForm.tsx:56-63,167-181,225-227` — pasar el workspace, usar key centralizada y distinguir error de vacío.
- Modify: `src/hooks/queryKeys.ts:77-85` — añadir `queryKeys.documentos.available(workspaceId, sedeIds)`.
- Modify: `src/services/documentos.service.ts:202-301,304-361` — reforzar el workspace exacto y corregir `fetchDocumentosDisponibles` sin relajar `fetchDocumentosBySedeIds`.
- Modify: `src/__tests__/components/EjercicioForm.test.tsx` — contexto/query reales del formulario y estados del selector.
- Modify: `src/__tests__/services/documentos.service.test.ts` — mezcla de global, sede activa, otra sede, otro workspace y `workspace_id IS NULL`.
- Modify: `src/__tests__/services/tenant-scope.test.ts` — contrato de query tenant del catálogo disponible.

**Step 1: RED de servicio — catálogo exacto**

- Preparar documentos: asociado a sede activa y workspace A; legacy de sede activa y workspace A; global sin pivotes de workspace A; asociado solo a otra sede; global de workspace B; fila legacy con `workspace_id = NULL`.
- Invocar `fetchDocumentosDisponibles([SEDE_A], WORKSPACE_A)`.
- Afirmar que devuelve únicamente los tres primeros, deduplicados, y que las queries usan `workspace_id = WORKSPACE_A`; ninguna rama usa `workspace_id IS NULL` como permiso de visibilidad.
- Añadir casos seguros: `fetchDocumentosDisponibles([], WORKSPACE_A)` devuelve solo globales exactos; sin workspace devuelve `[]` sin llamar a Supabase.

**Step 2: verificar RED** — Run: `npm test -- --run src/__tests__/services/documentos.service.test.ts src/__tests__/services/tenant-scope.test.ts` · Expected: FAIL porque la implementación actual corta sin sede, admite `workspace_id IS NULL` y no combina correctamente asociados + globales.

**Step 3: RED de formulario — contexto, caché y error**

- Hacer que el mock de `useWorkspaceContext` exponga `activeWorkspaceId` y `activeSede`.
- Capturar la `queryFn` y `queryKey` entregadas a `useQuery`; probar llamada `fetchDocumentosDisponibles([SEDE_A], WORKSPACE_A)` y key `queryKeys.documentos.available(WORKSPACE_A, [SEDE_A])`.
- Con `docsQuery.data` poblado, abrir el `MultiSelect` y observar un global y un documento de sede.
- Con `docsQuery.errorMessage`, observar feedback `No se pudieron cargar los documentos disponibles: …`; no mostrarlo como lista vacía.

**Step 4: verificar RED** — Run: `npm test -- --run src/__tests__/components/EjercicioForm.test.tsx` · Expected: FAIL por falta de workspace en la llamada/key y porque el error documental no se renderiza.

**Step 5: GREEN mínimo**

- En `EjercicioForm`, leer `{ activeSede, activeWorkspaceId }`, pasar ambos scopes y usar la nueva key. Mantener el archivo como Client Component y props serializables según Next.js 16.
- En el servicio, resolver por separado IDs asociados/legacy y globales exactos; unir, deduplicar, cargar pivotes una sola vez y filtrar fuera globales asociados exclusivamente a otra sede.
- Corregir el filtro vecino de `fetchDocumentosBySedeIds` para que una fila asociada también pertenezca al workspace exacto; no introducir una ruta de compatibilidad con `workspace_id IS NULL` que contradiga la guía.
- Mantener error/null-guard, `SELECT_COLS`, `mapDocumento`, visibilidad de entrenador y APIs públicas existentes.

**Step 6: verificar GREEN** — Run: `npm test -- --run src/__tests__/services/documentos.service.test.ts src/__tests__/services/tenant-scope.test.ts src/__tests__/components/EjercicioForm.test.tsx` · Expected: PASS.

**Step 7: autocomprobación barata** — Run: `npm run lint`; `npx.cmd tsc --noEmit` · Expected: PASS.

**Commit:** omitido; `GIT=off`.

### Task 2: Conservar el diálogo ante 42501 y propagar fallos de asociación

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**

- Modify: `src/components/ejercicios/EjerciciosListView.tsx:18-29,112,141-162` — cablear errores y cerrar solo según el resultado real.
- Modify: `src/hooks/useEjercicios.ts:30-72` — eliminar la lectura obsoleta de `errorMessage`, comprobar pivotes y exponer error parcial.
- Modify: `src/services/ejercicio-documentos.service.ts:41-59` — propagar tanto `DELETE` como `INSERT`.
- Create: `src/__tests__/components/EjerciciosListView.test.tsx` — regresión de apertura/cierre y feedback.
- Create: `src/__tests__/hooks/useEjercicios.test.tsx` — secuencia base → pivote → refetch.
- Create: `src/__tests__/services/ejercicio-documentos.service.test.ts` — errores de borrado/inserción.

**Step 1: RED — mutación base rechazada**

- Montar `EjerciciosListView`, abrir `Nuevo ejercicio`, rellenar un payload válido y hacer que `createOne` resuelva `null` con `createErrorMessage` equivalente a `42501`.
- Afirmar que el diálogo `Nuevo ejercicio` sigue visible, no se limpia el estado y aparece un mensaje español que contiene el rechazo de guardado.
- Cubrir el camino de edición de la misma forma con `updateOne`/`updateErrorMessage`.

**Step 2: verificar RED** — Run: `npm test -- --run src/__tests__/components/EjerciciosListView.test.tsx` · Expected: FAIL porque la vista cierra el diálogo y no pasa los errores al formulario.

**Step 3: RED — sincronización documental**

- En el servicio, simular error del `DELETE`: el resultado debe conservar ese error y `INSERT` no debe ejecutarse.
- Simular `DELETE` correcto e `INSERT` fallido: el error de inserción debe llegar al caller.
- En el hook, una creación que devuelve `null` no llama a `syncEjercicioDocumentos`; una fila creada con sync fallida se devuelve como persistida, refresca la lista y expone el mensaje parcial; un sync correcto limpia dicho mensaje.

**Step 4: verificar RED** — Run: `npm test -- --run src/__tests__/services/ejercicio-documentos.service.test.ts src/__tests__/hooks/useEjercicios.test.tsx` · Expected: FAIL porque hoy se ignora el error de borrado y el hook silencia el resultado del pivote.

**Step 5: GREEN mínimo**

- Basar `createOne`/`updateOne` exclusivamente en `created`/`updated`; no consultar el estado React de error inmediatamente después de `mutate`.
- Añadir al hook un estado de error parcial acotado a documentos, limpiarlo al iniciar/terminar un guardado correcto y exponerlo con nombre inequívoco sin reemplazar `query.errorMessage`.
- Pasar `createErrorMessage` o `updateErrorMessage` a `EjercicioForm`. Cerrar solo si la mutación base devolvió fila; mostrar el error parcial en la lista cuando la fila existe pero el pivote falló.
- No modificar `useMutation`, no añadir una RPC ni intentar compensaciones destructivas dentro de esta tarea.

**Step 6: verificar GREEN** — Run: `npm test -- --run src/__tests__/components/EjerciciosListView.test.tsx src/__tests__/hooks/useEjercicios.test.tsx src/__tests__/services/ejercicio-documentos.service.test.ts src/__tests__/components/EjercicioForm.test.tsx` · Expected: PASS.

**Step 7: autocomprobación barata** — Run: `npm run lint`; `npx.cmd tsc --noEmit` · Expected: PASS.

**Commit:** omitido; `GIT=off`.

### Task 3: Preparar la migración RLS aislada y sus contratos, sin aplicarla

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**

- Create: `supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql` — solo policies de mutación de `public.ejercicios` y rollback comentado.
- Create: `src/__tests__/services/ejercicios-rls-migration.test.ts` — contrato estático del artefacto SQL.
- Create: `e2e/ejercicios-documentos-rls.spec.ts` — UI + matriz RLS + cruce BD, preparado pero no ejecutado hasta Task 5.
- Modify: `e2e/support/auth.ts:37-78` — admitir credenciales `superadmin` solo para el E2E dirigido, sin leer ni imprimir secretos.
- Reference only: `supabase/migrations/021_rls_por_rol.sql:47-62` — policy actual y rollback literal.

**Step 1: preflight read-only obligatorio**

- Contrastar local y remoto: columnas/nullability/FK de `ejercicios`; policies efectivas; grants; RLS enabled/forced; publicación Realtime; definiciones y `EXECUTE` de `current_user_rol()`, `current_user_sede_id()` y `current_user_ws_role(uuid)`.
- Confirmar que `current_user_rol()` usa `SuperAdmin`/`AdminSede`/`Entrenador`/`Jugador` y que `current_user_ws_role(workspace_id)` devuelve la membresía raw `admin` para distinguirla de `gerente_sede`.
- Si falta el helper workspace-aware o difiere el vocabulario, PARAR: no sustituirlo por un `EXISTS` recursivo ni ampliar a `gerente_sede`; actualizar el plan con la evidencia antes de fijar SQL.

**Step 2: RED del contrato SQL**

- El test lee la migración esperada y exige una transacción, drop de `ejercicios_mutate`, tres policies separadas con las cláusulas correctas, validación sede↔workspace, global solo para `AdminSede` raw `admin` y ausencia de `documentos`, `ejercicio_documentos`, `GRANT`, `ALTER PUBLICATION`, `workspace_id IS NULL` o `gerente_sede` como permiso.
- Incluir un assert de rollback literal contra la policy de `021` o contra un bloque comentado normalizado, para evitar perder la recuperación exacta.

**Step 3: verificar RED** — Run: `npm test -- --run src/__tests__/services/ejercicios-rls-migration.test.ts` · Expected: FAIL porque el archivo no existe.

**Step 4: GREEN — crear solo el artefacto local**

Usar este predicado de fila en `INSERT WITH CHECK`, `UPDATE USING` + `WITH CHECK` y `DELETE USING`; repetirlo dentro de cada policy sin crear helpers nuevos:

```sql
(
  (
    public.current_user_rol() = 'SuperAdmin'
    OR (
      public.current_user_rol() IN ('AdminSede', 'Entrenador')
      AND es_global IS NOT TRUE
      AND sede_propietaria_id = public.current_user_sede_id()
    )
    OR (
      public.current_user_rol() = 'AdminSede'
      AND public.current_user_ws_role(workspace_id) = 'admin'
      AND es_global IS TRUE
      AND sede_propietaria_id IS NULL
    )
  )
  AND (
    (es_global IS TRUE AND sede_propietaria_id IS NULL)
    OR (
      es_global IS NOT TRUE
      AND sede_propietaria_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sedes
        WHERE sedes.id = ejercicios.sede_propietaria_id
          AND sedes.workspace_id = ejercicios.workspace_id
      )
    )
  )
)
```

**Justificación del snippet:** el predicado RLS es el límite de seguridad; dejarlo literal evita que el executor interprete de forma distinta globalidad, rol raw o consistencia sede/workspace. Solo se puede adaptar si el preflight del Step 1 demuestra una diferencia real y el plan se actualiza antes.

- Nombres previstos: `ejercicios_insert_role_scope`, `ejercicios_update_role_scope`, `ejercicios_delete_role_scope`.
- Incluir `BEGIN`/`COMMIT`, drops idempotentes de la policy histórica y de los tres nombres nuevos, comentarios de alcance y el rollback exacto de `021`.
- No aplicar, no reparar historial, no regenerar tipos y no ejecutar otras migraciones.

**Step 5: verificar GREEN local** — Run: `npm test -- --run src/__tests__/services/ejercicios-rls-migration.test.ts` · Expected: PASS. Run adicional: `npm run lint`; `npx.cmd tsc --noEmit` · Expected: PASS.

**Step 6: preparar el E2E, sin tocar remoto todavía**

- El spec usa clientes Supabase autenticados, nunca `service_role`, y limpia con el mismo actor autorizado las filas temporales que creó.
- Flujo UI admin: crear documentos global y de sede activa en el mismo workspace, disponer de un documento de otra sede, abrir `Nuevo ejercicio`, comprobar inclusión/exclusión, seleccionar los permitidos y guardar un ejercicio global. Cruzar `workspace_id`, `es_global`, `sede_propietaria_id` y pivotes.
- Matriz directa: SuperAdmin global/sede; admin global propio/current sede; entrenador current sede pero no global/otra sede; gerente global denegado; jugador, anónimo y otro workspace denegados. Verificar `INSERT`, transición de `UPDATE` y `DELETE`, incluidos códigos RLS esperados.
- Si faltan credenciales de un rol o una segunda sede/workspace, el perfil FULL queda bloqueado; no convertir el caso en `skip` que permita un falso verde ni usar secretos en salida.

**Commit:** omitido; `GIT=off`.

### Task 4: Gate y aplicación controlada de la migración

**Skills:** `sql-optimization-patterns`.

**Precondición:** Tasks 1-3 verdes y artefacto SQL idéntico al revisado. `## Autorización de migración` comienza en `PENDIENTE`.

**Files:**

- Execute exactly: `supabase/migrations/20260817120000_fix_ejercicios_mutate_rls.sql`.
- Modify: `docs/plans/2026-08-17-fix-ejercicios-documentos-rls.md` — registrar respuesta, fecha, método y evidencia.

**Step 1: PARAR y formular la pregunta del gate**

- Mostrar literalmente destino, recursos, operaciones, comando, riesgos, RLS/Realtime y rollback descritos en `## Autorización de migración`.
- No aplicar ni avanzar a Task 5 mientras el estado no sea `AUTORIZADA`.

**Step 2: registrar la decisión**

- `AUTORIZADA`: copiar texto inequívoco del usuario y fecha Europe/Madrid.
- `DENEGADA`: dejar la migración preparada, registrar la decisión y terminar sin modificar remoto ni historial.
- Silencio/ambigüedad: conservar `PENDIENTE`; no asumir permiso.

**Step 3: aplicar solo si está AUTORIZADA**

- Verificar inmediatamente antes el project ref `rgmrqkoudyotkpqgezzv`, rama `main`, y comparar íntegramente el SQL del editor/API con el archivo local.
- Ejecutar el archivo completo en una sola operación transaccional mediante SQL Editor/Management API. Nunca `db push`.
- Hacer postcheck read-only de `pg_policies`, RLS enabled/no forced, grants y `pg_publication_tables`; comprobar que solo cambió la mutación de `public.ejercicios` y que las expresiones coinciden con el archivo.
- Solo con postcheck verde ejecutar `npx.cmd supabase migration repair 20260817120000 --status applied --linked`; después `npx.cmd supabase migration list --linked` debe mostrar `20260817120000` alineada local/remoto sin aplicar los pendientes históricos.
- Ante fallo de policy, ejecutar el rollback antes de reparar historial. Ante fallo solo de repair, no reejecutar SQL y registrar el estado exacto.

**Expected:** policies aplicadas y version alineada; ninguna fila, policy de SELECT, grant, pivote o publicación Realtime alterados.

**Commit:** omitido; `GIT=off`.

### Task 5: Ejecutar verificación FULL independiente

**Skills:** `testing`, `agent-browser` para la intención y `javascript-testing-patterns` para interpretar las pruebas, sin editar producción desde el verifier.

**Precondición:** migración `AUTORIZADA`, aplicada y reparada. Si está pendiente/denegada, esta tarea no puede dar PASA.

**Step 1: estático**

- Run: `npm run lint` · Expected: exit 0, sin errores.
- Run: `npx.cmd tsc --noEmit` · Expected: exit 0, sin errores.

**Step 2: tests dirigidos**

- Run: `npm test -- --run src/__tests__/components/EjercicioForm.test.tsx src/__tests__/components/EjerciciosListView.test.tsx src/__tests__/hooks/useEjercicios.test.tsx src/__tests__/services/documentos.service.test.ts src/__tests__/services/ejercicio-documentos.service.test.ts src/__tests__/services/ejercicios-rls-migration.test.ts src/__tests__/services/tenant-scope.test.ts`.
- Expected: PASS; deben aparecer explícitamente catálogo exacto, error 42501 con diálogo abierto, error parcial de pivote y contrato RLS.

**Step 3: suite y build**

- Run: `npm test -- --run` · Expected: toda la suite PASS.
- Run: `npm run build` · Expected: build Next.js 16/Turbopack PASS. Recordar que Next 16 no ejecuta lint dentro del build, por eso ambos gates son independientes.

**Step 4: intención autenticada**

- Con `agent-browser`, abrir `/ejercicios` como admin en escritorio y 375×667; abrir el formulario, esperar carga, buscar y seleccionar documentos permitidos, comprobar el estado de error recuperable y que el diálogo no se cierra ante un rechazo simulado/real.
- Cambiar de sede/workspace y confirmar que el catálogo se invalida y no conserva opciones del scope anterior.

**Step 5: E2E real y cruce BD↔UI**

- Run: `npm run test:e2e -- e2e/ejercicios-documentos-rls.spec.ts --project=chromium --project="Mobile Chrome"` · Expected: PASS en ambos proyectos, sin skips de la matriz obligatoria.
- Con consultas read-only, comprobar que el ejercicio global creado por admin pertenece al workspace exacto, que solo están los `ejercicio_documentos` elegidos, que no aparece un documento de otra sede/workspace y que las filas temporales quedan eliminadas.
- Volver a consultar `pg_policies` y Realtime al final; deben seguir coincidiendo con el artefacto/version y sin publicación.

**Step 6: veredicto/remediación**

- Un verifier independiente emite PASS/FAIL. Ante fallo, un executor fresco corrige solo la evidencia nueva y se repite el perfil FULL completo, máximo cinco rondas.
- Registrar en `## Incidencias de verificación` solo fallos major/critical, o minor repetidos/con cambio de alcance; el bloque permanece con su comentario si no ocurre ninguno.

**Commit:** omitido; `GIT=off`.

### Task 6 (final, solo después de que el verifier dé PASA): Actualizar documentación

**Skills:** ninguna adicional; tarea documental, sin código de producción.

**Files:**

- Modify: `docs/backlog.md:223-226` — cerrar B14-4 con policy/version/matriz y fecha verificadas.
- Modify: `docs/crud-audit.md:248-291` — reflejar creación/actualización/eliminación RLS y feedback de guardado de Ejercicios.
- Modify: `docs/crud-audit.md:311-340` — aclarar que el selector de ejercicios usa globales exactos del workspace + sede activa y excluye `workspace_id IS NULL`, otras sedes y otros workspaces.
- Modify: `docs/plans/2026-08-17-fix-ejercicios-documentos-rls.md` — autorización, evidencia final e incidencias/resoluciones exigidas.
- Modify only if a convention changed: `docs/design-guides/frontend_styleguide.md`, `docs/design-guides/data_styleguide.md` — no se espera cambio.

**Steps:**

1. Confirmar que Task 5 dio PASA FULL antes de marcar nada completado.
2. Marcar B14-4 `[x]` con referencia a `20260817120000`, el proyecto de development y la matriz comprobada. No cerrar ni modificar B9-4.
3. Actualizar `crud-audit` con comportamiento ya verificado, sin declarar atómica la sincronización de pivotes ni ampliar permisos a roles no probados.
4. Mantener las design guides intactas si no cambió stack/convención; registrar esa decisión en el HANDOFF.
5. Añadir al plan fecha, comandos, conteos, project ref, veredicto y resolución de cualquier incidencia registrada. Cerrar con HANDOFF de 3-4 líneas.
6. No ejecutar Git (`GIT=off`).

**Expected:** backlog, auditoría CRUD y plan describen exactamente el estado verificado; no se documenta como terminado ningún gate pendiente.

**Commit:** omitido; `GIT=off`.
