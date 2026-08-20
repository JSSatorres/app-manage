# Lista unificada y métodos de subida de Documentos — Implementation Plan

**Goal:** Reorganizar Documentos para mostrar una única lista de contenido, o un estado vacío común, y abrir desde “Subir” un selector con YouTube, Google Drive y Almacenamiento sin convertir los orígenes en filtros.

**Architecture:** Mantener el modelo multifuente existente sobre `documentos` y `content_assets`, componiendo los activos asociados en una lista única que incluya también contenido `external_legacy`. Separar la elección del mecanismo de alta en un diálogo accesible que delega al `DocumentoForm` actual mediante su `sourceProvider`; no añadir OAuth/Picker de Drive ni un cuarto método para legacy. La verificación FULL descubrió drift RLS legado en `documentos`, por lo que se preparó una migración mínima sujeta al gate obligatorio antes de aplicarla.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui, TanStack Query, Vitest + Testing Library y Playwright.

## Perfil de verificación

- Nivel: full
- Motivo: aunque el cambio principal es de composición UI, atraviesa los flujos persistentes de alta, visualización y borrado, además de cuota/RBAC y el E2E multifuente existente.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run src/__tests__/components/DocumentosListView.test.tsx src/__tests__/components/DocumentoForm.test.tsx`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/documentos-multifuente.spec.ts`.
- Evidencias esperadas: estático limpio; suites dirigida y completa verdes; build de Next.js 16 correcto; E2E dirigido verde contra el project ref de pruebas autorizado; inspección de intención que confirme lista única, estado vacío, selector con exactamente tres métodos, acciones existentes y comportamiento responsive/accesible.

## Incidencias de verificación

- Ronda 1 · 16/08/2026 · **major — suite completa**. Impacto: el perfil FULL queda rojo aunque los 35 tests dirigidos de Documentos pasan. Evidencia: `npm test -- --run` termina con 641/648; fallan 7 casos en `economia.page.test.tsx`, `publicMetadata.test.tsx` y `MovimientosEconomicosTable.test.tsx` porque consumidores de `useRequestLock` se renderizan sin `RequestLockProvider`. Causa provisional: regresión concurrente ajena a Documentos. Corrección y prueba verde: pendientes de coordinación con el propietario de esos cambios.
- Ronda 1 · 16/08/2026 · **major — E2E/BD bloqueado por configuración**. Impacto: no se demuestran los 14 escenarios Chromium/Mobile ni el cruce BD↔UI. Evidencia: Playwright arranca fuera del sandbox, pero los dos `beforeAll` fallan y 12 tests no se ejecutan porque el entorno carece de `SUPABASE_SERVICE_ROLE_KEY`; las claves públicas sí existen. Corrección: provisionar la clave sólo en entorno seguro/git-ignored para `rgmrqkoudyotkpqgezzv` y repetir el perfil FULL.
- Ronda 1 · 16/08/2026 · **major — limpieza E2E pendiente**. Impacto: posible fixture clone temporal persistente en la BD de pruebas. Evidencia: `.auth/clone-context.json` continúa presente tras el fallo y el teardown no pudo usar service role. Corrección: ejecutar `cleanupStoredCloneFixture` con la credencial autorizada, confirmar eliminación local/remota y repetir E2E.
- Ronda 2 · 16/08/2026 · **major — E2E dirigido no supera el primer escenario**. Impacto: Chromium y Mobile Chrome no avanzan a los 12 escenarios restantes. Evidencia: el selector de `e2e/documentos-multifuente.spec.ts:75` busca el botón “Subir” de forma no exacta y Playwright encuentra también “Subir archivo”; 2 fallos y 12 no ejecutados. Causa: selector E2E ambiguo tras introducir el nuevo CTA. Corrección: pendiente de executor fresco y repetición FULL.
- Ronda 2 · 16/08/2026 · **major — cleanup de fixture Documentos fallido**. Impacto: no se confirma la eliminación del workspace temporal de Documentos. Evidencia: `cleanupDocumentosFixture` devuelve “No se pudo borrar el workspace temporal de documentos”; el clone global sí quedó limpio y `clone-context.json` está ausente. Causa/corrección: pendientes de diagnóstico acotado y prueba remota verde.
- Ronda 3 · 16/08/2026 · **major — campo URL sin nombre accesible**. Impacto: ambos navegadores pasan el vacío/selector pero el E2E se detiene antes de completar altas y los escenarios posteriores. Evidencia: timeout en `getByLabel("Enlace (URL)")`; el snapshot muestra sólo placeholder. Causa: el `id` inyectado por `FormField` no llega al `Input` controlado y el label queda desvinculado. Corrección: pendiente de executor fresco con test de accesibilidad; repetir FULL.
- Resolución Ronda 2 · 16/08/2026 · **cleanup E2E verde**. Causa: categorías económicas `is_predefined` creadas automáticamente impedían el cascade del workspace temporal. Corrección: el fixture desmarca sólo esas categorías y limpia dependencias en orden; el reintento no reportó error de `cleanupDocumentosFixture` y terminó sin `.auth/clone-context.json`.
- Incidencia externa Ronda 3 · 16/08/2026 · **major — baseline global ajeno**. Evidencia: suite completa 652/653; único fallo en `StripeRefundDialog.test.tsx` por ausencia del `role="status"` esperado. No atribuible a Documentos y fuera del alcance autorizado; los siete fallos previos de RequestLock ya no reaparecen.
- Resolución Ronda 3 · 16/08/2026 · **accesibilidad URL verde**. Corrección: `DocumentoForm` comparte un `useId()` estable entre label e input para YouTube/Drive; tests parametrizados localizan el control por “Enlace (URL)”. Evidencia: dirigidos 42/42, suite global 655/655, lint, typecheck y build verdes.
- Ronda 4 · 16/08/2026 · **major — API administrativa E2E devuelve HTML**. Impacto: los dos `beforeAll` fallan antes de abrir la UI y 12 escenarios no se ejecutan. Evidencia: `auth.admin.createUser` recibe una respuesta HTML (`Unexpected token '<'`) en lugar de JSON pese a obtener la `service_role` en memoria para el ref autorizado. No se creó fixture de Documentos y `clone-context.json` terminó ausente. Causa/corrección: diagnóstico operativo de status/content-type/host y credencial/ruta administrativa pendiente; no atribuible todavía a la UI.
- Resolución Ronda 4 · 16/08/2026 · **Auth administrativo sano**. Diagnóstico no mutante: URL/ref exactos, una clave legacy `service_role`, health y admin users 200 JSON sin redirects, y SDK `listUsers` verde. El HTML previo se clasifica como incidente externo transitorio.
- Ronda 5 · 16/08/2026 · **critical — RLS bloquea el alta de Documentos**. Impacto: tras pasar vacío/selector, Chromium y Mobile no pueden completar YouTube; 2 escenarios fallan y 10 quedan sin ejecutar en serial. Evidencia: al guardar, el diálogo muestra `new row violates row-level security policy for table "documentos"`. Causa/corrección: discovery obligatorio de políticas, membresía del fixture y flujo de inserción; si exige migración, aplicar el gate de autorización antes de prepararla/aplicarla.
- Ronda 5 · 16/08/2026 · **major — ocho workspaces E2E históricos pendientes**. Evidencia: persisten ocho workspaces `E2E documentos …` creados alrededor de 20:48–20:49 UTC; la ejecución actual sí dejó `clone-context.json` ausente y ningún usuario `e2e.documentos.*`. Cleanup pendiente de confirmar que la autorización explícita cubre esos ocho identificadores exactos.

## Autorización de migración

- Entorno: BD única de pruebas, project ref `rgmrqkoudyotkpqgezzv`, rama `main` (etiquetada “Production” por Supabase, pero declarada por el propietario como entorno exclusivo de pruebas).
- Estado: AUTORIZADA
- Decisión: el usuario respondió inequívocamente `AUTORIZADA` el 17/08/2026 (Europe/Madrid), exclusivamente para el artefacto, project ref y procedimiento descritos en este bloque.
- Artefacto preparado, no aplicado: `supabase/migrations/20260816233707_fix_documentos_workspace_rls.sql`.
- Aplicación prevista: ejecutar exactamente el contenido del artefacto en el SQL Editor/Management API del project ref indicado; sólo si termina correctamente, registrar la versión con `npx.cmd supabase migration repair 20260816233707 --status applied --linked`. No usar `db push`, `migration up` ni `--include-all`, porque existen migraciones locales pendientes ajenas.
- Tablas/recursos: únicamente policies RLS de `public.documentos`; reutiliza las funciones ya aplicadas `public.is_workspace_storage_reader(uuid)` y `public.is_workspace_storage_writer(uuid)` y consulta `public.sedes` para validar pertenencia al workspace.
- Operaciones: `DROP POLICY IF EXISTS` de policies legacy/conocidas; `CREATE POLICY` separadas para `SELECT`, `INSERT`, `UPDATE` y `DELETE` `TO authenticated`. Lectura para roles lectores canónicos; escritura sólo para `superadmin`, `admin` y `gerente_sede`; `WITH CHECK` impide una sede de otro workspace.
- Riesgos: DDL transaccional con lock fuerte y breve sobre `public.documentos`; operaciones concurrentes pueden bloquearse durante la transacción. Riesgo funcional principal: denegar o ampliar roles de forma incorrecta; el artefacto alinea los roles con `content_assets` y no concede escritura a `entrenador`/`jugador`. No modifica filas, grants, funciones, membresías, assets ni Storage.
- RLS/Realtime: cambia quién puede leer/mutar filas de `documentos`; no cambia publication ni configuración Realtime. Las altas `content_assets` ya usan los mismos helpers canónicos. Tras aplicar, comprobar `pg_policies`, permisos EXECUTE de helpers y E2E Chromium/Mobile.
- Rollback/recuperación: en una transacción, eliminar las cuatro policies nuevas (`documentos_workspace_select|insert|update|delete`) y recrear exactamente `documentos_select`/`documentos_mutate` desde `021_rls_por_rol.sql`; después reparar el historial a la versión correspondiente sólo si el rollback se ejecuta. No requiere restaurar datos porque la migración no los altera.

---

## Contratos e invariantes

- Con cualquier documento asociado, presentar una sola lista; no mantener pestañas, secciones o filtros por proveedor.
- La lista agrega YouTube, Google Drive, Almacenamiento y `external_legacy`. Legacy es sólo una fila de lectura existente: nunca aparece como cuarto método de alta.
- Sin documentos de ningún origen, presentar “Sube documentos a tu manera” y un CTA que inicia el mismo flujo de subida.
- Con datos, presentar el botón “Subir” junto al encabezado/lista.
- “Subir” abre un selector con exactamente estos nombres visibles: “YouTube”, “Google Drive” y “Almacenamiento”. Elegir uno abre `DocumentoForm` con `sourceProvider` `youtube`, `google_drive` o `supabase_storage`, respectivamente.
- Google Drive conserva el alcance V1 por URL; no implementar OAuth, Picker ni upload real.
- Tras una alta satisfactoria, las invalidaciones existentes deben hacer aparecer el documento en la misma lista sin importar el origen.
- Preservar preview/visualización, edición, eliminación segura de Storage, cuota y RBAC existentes.
- UI y mensajes en español, interacción por teclado, foco/título/descripción accesibles y layout usable en móvil.
- No tocar servicios, tipos ni schemas. La única excepción de Supabase es el artefacto RLS `20260816233707`, preparado tras evidencia FULL y que no puede aplicarse sin autorización explícita registrada arriba.
- Antes de cada cambio, leer `docs/design-guides/frontend_styleguide.md` y la documentación relevante de Next.js 16: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`, `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`, `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md` y `node_modules/next/dist/docs/03-architecture/accessibility.md`.

### Task 1: Sustituir las vistas por proveedor por estados de lista unificada

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Modify: `src/__tests__/components/DocumentosListView.test.tsx`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Modify: `src/components/documentos/DocumentoProviderList.tsx`
- Modify or remove only if no longer referenced: `src/components/documentos/DocumentoProviderEmptyState.tsx`

**Step 1: Write the failing tests** — Añadir casos que suministren activos asociados de YouTube, Drive, Storage y legacy a la vez y exijan una sola lista con todos ellos, sin tabs ni bloques por proveedor; añadir el caso sin ningún activo que exija “Sube documentos a tu manera”. Comprobar que con datos existe “Subir” y que el vacío expone un CTA accesible equivalente.

**Step 2: Run tests to verify they fail** — Run: `npm test -- --run src/__tests__/components/DocumentosListView.test.tsx` · Expected: FAIL por la composición actual en pestañas y los vacíos por proveedor.

**Step 3: Implement the minimal unified composition** — Agregar exclusivamente los activos vinculados a los `Documento` del contexto actual; deduplicar por id si el contrato de consulta lo permite; renderizar una sola `DataTable`/lista neutral al proveedor e incluir legacy. Conservar los metadatos de origen como información de fila, no como navegación. Resolver el vacío a partir del agregado completo. Mantener el botón/CTA “Subir” preparado para el callback del Task 2.

**Step 4: Preserve responsive and accessible list semantics** — Reutilizar `DataTable` y botones de acción actuales, mantener nombres accesibles y evitar columnas/layouts que oculten las acciones en móvil.

**Step 5: Run directed checks** — Run: `npm test -- --run src/__tests__/components/DocumentosListView.test.tsx` and `npm run lint` · Expected: PASS.

### Task 2: Añadir selector accesible de método y conectarlo al formulario existente

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Create: `src/components/documentos/DocumentoUploadMethodDialog.tsx`
- Create: `src/__tests__/components/DocumentoUploadMethodDialog.test.tsx`
- Modify: `src/__tests__/components/DocumentosListView.test.tsx`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Reuse without broad refactor; modify only if a real contract gap appears: `src/components/documentos/DocumentoForm.tsx`

**Step 1: Write the failing selector tests** — Exigir que al pulsar “Subir” (desde lista o vacío) se abra un diálogo con exactamente tres opciones: YouTube, Google Drive y Almacenamiento; verificar título/descripción accesibles, cierre y navegación por teclado.

**Step 2: Write the failing integration tests** — Para cada opción, seleccionarla y comprobar que el selector se cierra y `DocumentoForm` se abre con el `sourceProvider` exacto. Comprobar que Drive sigue solicitando/registrando enlace y que ninguna opción actúa como filtro de la lista.

**Step 3: Run tests to verify they fail** — Run: `npm test -- --run src/__tests__/components/DocumentoUploadMethodDialog.test.tsx src/__tests__/components/DocumentosListView.test.tsx` · Expected: FAIL porque el selector aún no existe.

**Step 4: Implement the minimal dialog and wiring** — Usar el `Dialog` shadcn existente y botones semánticos para elegir método. Gestionar en `DocumentosListView` el selector abierto, proveedor elegido y apertura de `DocumentoForm`; al cerrar/guardar, conservar las invalidaciones existentes que refrescan lista y activos.

**Step 5: Run directed checks** — Run: `npm test -- --run src/__tests__/components/DocumentoUploadMethodDialog.test.tsx src/__tests__/components/DocumentosListView.test.tsx src/__tests__/components/DocumentoForm.test.tsx` and `npm run lint` · Expected: PASS.

### Task 3: Adaptar regresiones multifuente y E2E al nuevo flujo

**Skills:** `tdd`, `javascript-testing-patterns`; para E2E, seguir el contrato Playwright del proyecto.

**Files:**
- Modify: `src/__tests__/components/DocumentosListView.test.tsx`
- Modify or remove only if the production component is retired: `src/__tests__/components/DocumentosProviderTabs.test.tsx`
- Modify or remove only if the production component is retired: `src/__tests__/components/DocumentoProviderEmptyState.test.tsx`
- Modify: `e2e/documentos-multifuente.spec.ts`
- Modify only if necessary to align seeded assets with associated documents: `e2e/fixtures/documentos.ts`

**Step 1: Extend regression tests before changing behavior** — Cubrir en la lista unificada Ver/preview, Editar y Eliminar; conservar la ruta de eliminación segura de Storage, cuota y restricciones RBAC. Sustituir expectativas específicas de tabs/vacíos antiguos por las del selector y lista común; no borrar cobertura funcional sólo porque cambió el diseño.

**Step 2: Run unit tests to expose stale assumptions** — Run: `npm test -- --run src/__tests__/components/DocumentosListView.test.tsx src/__tests__/components/DocumentosProviderTabs.test.tsx src/__tests__/components/DocumentoProviderEmptyState.test.tsx` · Expected: FAIL únicamente en expectativas obsoletas de la navegación por proveedor.

**Step 3: Adapt the E2E flow** — Sembrar documentos realmente asociados cuando el escenario necesite filas visibles; comprobar estado vacío común, lista única con varios orígenes, apertura/cambio entre los tres métodos, altas YouTube/Drive por URL y conservación de preview/borrado/cuota/RBAC. Usar el project ref canónico de pruebas `rgmrqkoudyotkpqgezzv`; no relajar el guard de entorno.

**Step 4: Run directed unit and static checks** — Run: `npm test -- --run src/__tests__/components/DocumentosListView.test.tsx src/__tests__/components/DocumentoUploadMethodDialog.test.tsx src/__tests__/components/DocumentoForm.test.tsx` then `npm run lint` and `npx tsc --noEmit` · Expected: PASS.

**Step 5: Self-check scope** — Confirmar que no se añadieron migraciones, filtros por origen, OAuth/Picker de Drive ni cambios ajenos al dominio Documentos.

### Task 4 (final, solo después de verificación verde): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md` sólo si existe una entrada que describa exactamente este rediseño o debe registrarse su cierre sin falsear B10/B11 pendientes.
- Modify: `docs/crud-audit.md` para reflejar lista unificada + selector de tres altas si el texto actual aún describe pestañas por proveedor.
- Do not modify unless a convention or stack really changed: `docs/design-guides/frontend_styleguide.md`.

**Step 1: Record only verified behavior** — Tras un resultado FULL verde, actualizar el estado/descripcion documental del módulo Documentos. Mantener explícitamente pendientes las tareas de Drive OAuth/Picker, cron o E2E que no hayan quedado demostradas.

**Step 2: Check documentation consistency** — Verificar que la documentación ya no presenta YouTube/Drive/Storage como filtros o secciones que oculten otros orígenes y que no afirma cambios de persistencia inexistentes.

**Step 3: Final handoff** — Resumir archivos, evidencia de verificación, decisiones de alcance y siguiente paso; no ejecutar git ni crear commits.
