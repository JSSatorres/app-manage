# Corregir alta de YouTube en Documentos Implementation Plan

**Goal:** Garantizar que un enlace de YouTube añadido desde `/documentos` se persista como recurso multifuente, siga visible al volver a la pantalla y permita añadir más vídeos, reparando además los enlaces ya afectados.

**Architecture:** Mantener `documentos` como entidad editorial y `content_assets` como recurso técnico. La creación reutilizará `createExternalContentAsset` para normalizar/deduplicar YouTube o Drive y guardará su `id` en `documentos.content_asset_id`; una migración de datos idempotente reconciliará enlaces gestionados creados después del backfill original. No se cambia schema, RLS ni grants.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Supabase/PostgreSQL, TypeScript, Vitest/Testing Library y Playwright.

## Diagnóstico

- Reproducción observada: el alta devuelve `201` para `documentos` y `204` para pivotes, pero al volver `/documentos` conserva `YouTube (0)` y el estado vacío.
- Causa raíz: `createDocumentoLink` inserta `external_url` en `documentos` sin crear `content_assets` ni establecer `content_asset_id`, mientras que pestañas, contadores y listado consultan exclusivamente `content_assets`.
- Feedback loop primario: test de servicio sobre la interfaz pública `createDocumentoLink`, que debe observar creación/deduplicación del asset y el `content_asset_id` incluido en el documento.
- Feedback loop final: E2E que crea el vídeo, sale y vuelve a `/documentos`, y cruza UI con las filas persistidas.
- Hipótesis descartadas como causa primaria: invalidación de React Query (ya invalida `documentos` y `content-assets`) y RLS (las requests actuales están autorizadas). Hipótesis secundaria a conservar: el filtro por sede puede ocultar un recurso sin pivote, por lo que el E2E debe usar sede activa y comprobar su asociación.

## Perfil de verificación

- Nivel: full
- Motivo: modifica un flujo de persistencia multi-tenant y aplica una migración de datos sobre Supabase; exige comprobar RLS/aislamiento, backfill y coherencia BD↔UI.
- Comandos: `npm run lint`; `npx tsc --noEmit`; `npm test -- --run src/__tests__/services/documentos.service.test.ts src/__tests__/services/content-assets.external.test.ts src/__tests__/components/DocumentosListView.test.tsx`; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/documentos-multifuente.spec.ts`; comandos Supabase seguros definidos en `docs/design-guides/data_styleguide.md`.
- Evidencias esperadas: RED previo que reproduce documento sin asset; suite dirigida y completa verdes; build verde; migración aplicada sin drift al proyecto `rgmrqkoudyotkpqgezzv`/`main`; documento afectado con `content_asset_id` no nulo y asset YouTube normalizado; E2E muestra `YouTube (1)`, la fila técnica del vídeo y CTA de nueva alta tras salir y volver.

## Incidencias de verificación

- Ronda 1 · 17/08/2026 · **major** · Perfil full / E2E y cruce BD↔UI bloqueados. Evidencia: lint, typecheck, 35 tests dirigidos, suite completa (656/656) y build pasan; el spec dirigido requiere crear/eliminar fixtures con `service_role` contra Supabase remoto, operación prohibida por el alcance reanudado, y no existe backend Supabase local aislado configurado. Estado: PENDIENTE. Remediación requerida: habilitar backend local aislado o autorizar explícitamente las fixtures remotas y reejecutar Chromium + Mobile Chrome.
- Ronda 1 · 17/08/2026 · **critical** · Incidente operativo de secretos durante verificación. Evidencia: el verifier reportó que una lectura demasiado amplia de `.env.test.local` emitió valores de credenciales en la salida interna de herramienta; los valores no se reproducen en este plan. No es un fallo del código ni consta versionado. Estado: PENDIENTE. Remediación requerida: rotación humana inmediata de las credenciales E2E afectadas y futuras comprobaciones limitadas a nombres/presencia booleana.

## Autorización de migración

- Entorno: development (única BD remota de prueba declarada por `AGENTS.md`)
- Estado: AUTORIZADA
- Decisión: el usuario respondió literalmente «AUTORIZO» el 16/08/2026 para aplicar exclusivamente esta migración en `rgmrqkoudyotkpqgezzv`, rama `main`, mediante los dos comandos registrados.
- Comando previsto: `npx.cmd supabase db query --linked --file supabase/migrations/20260816120000_reconcile_document_external_assets.sql`, seguido de `npx.cmd supabase migration repair 20260816120000 --status applied --linked`, contra el proyecto canónico `rgmrqkoudyotkpqgezzv`, rama `main`.
- Tablas/recursos: `public.documentos`, `public.content_assets`.
- Operaciones: `INSERT` idempotente de assets YouTube/Google Drive faltantes y `UPDATE` de `documentos.content_asset_id`; sin DDL, borrados, cambios de grants, RLS ni Realtime.
- Riesgos: clasificación o normalización incorrecta de URLs legacy, duplicados si la clave canónica no coincide, locks breves de escritura y asociación accidental entre workspaces si falta el predicado tenant.
- Rollback/recuperación: capturar antes los IDs de documento, workspace, recurso y asset; revertir únicamente los `content_asset_id` asignados por la migración y eliminar solo assets creados por ella que no tengan otras referencias. La consulta read-only previa encontró 0 candidatas, por lo que se espera un no-op de datos. No se aplicará nada hasta completar el gate.

---

### Task 1: Reproducir y corregir la persistencia de enlaces gestionados

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**

- Modify: `src/services/documentos.service.ts:446`
- Modify/Create: `src/__tests__/services/documentos.service.test.ts`
- Modify (solo si el comportamiento observable lo exige): `src/__tests__/components/DocumentosListView.test.tsx:158`
- Create: `supabase/migrations/20260816HHMMSS_reconcile_document_external_assets.sql` (timestamp libre y secuencial según el repo)

**Contrato y límites:**

- Antes de editar, leer `AGENTS.md`, ambas design guides y la documentación relevante de Next.js 16 en `node_modules/next/dist/docs/`.
- Para URL YouTube o Drive, reutilizar la interfaz pública existente `createExternalContentAsset`; no duplicar su normalización ni deduplicación.
- Insertar `documentos` con el `content_asset_id` obtenido y mantener intacta la sincronización actual de equipos/sedes/categorías.
- Conservar el camino `external_legacy` para URLs no gestionadas.
- La migración debe ser idempotente, acotada por `workspace_id`, no sobrescribir relaciones existentes, no introducir DDL/RPC/policies y reconciliar solo `documentos.content_asset_id IS NULL` con URL gestionada.
- Preparar el SQL, pero **no aplicar la migración** en esta tarea; tampoco ejecutar git.

**Step 1: RED — test tracer del servicio**

- Añadir un único test de comportamiento que invoque `createDocumentoLink` con URL YouTube y observe que se crea/reutiliza el asset normalizado y que el insert público del documento contiene su `content_asset_id`.
- Ejecutar: `npm test -- --run src/__tests__/services/documentos.service.test.ts`
- Esperado: FAIL por ausencia de creación/enlace del asset.

**Step 2: GREEN — implementación mínima**

- Componer la creación existente del asset con el insert existente del documento, sin cambiar contratos de UI ni añadir refresh manual.
- Ejecutar el test dirigido; esperado: PASS.

**Step 3: Segundo ciclo vertical — compatibilidad**

- Añadir y observar RED para una URL no gestionada o asset deduplicado (elige el caso que exponga el riesgo real del código vecino); implementar solo lo necesario y volver a verde.
- Ejecutar también `src/__tests__/services/content-assets.external.test.ts` y el test dirigido de `DocumentosListView` si se tocó.

**Step 4: Preparar reparación de datos**

- Crear la migración idempotente con comentarios de alcance/recuperación y validar su sintaxis conforme al flujo local, sin aplicarla.
- Reportar nombre exacto, operaciones SQL, filas candidatas mediante consulta de solo lectura, comando exacto de aplicación, riesgos RLS/Realtime y rollback para el gate.

**Step 5: Autocomprobación**

- Ejecutar lint sobre lo tocado (o `npm run lint` si no hay variante dirigida), `npx tsc --noEmit` y tests dirigidos. Todo debe quedar verde salvo el E2E remoto pendiente del gate.

### Task 2: Mostrar el CTA en estado poblado y bloquear la regresión E2E

**Skills:** `tdd`, `javascript-testing-patterns`, `agent-browser` para la validación E2E.

**Precondición:** `## Autorización de migración` debe figurar `Estado: AUTORIZADA`. Si permanece pendiente o denegada, no ejecutar esta tarea.

**Files:**

- Modify: `src/components/documentos/DocumentosListView.tsx:232`
- Modify: `src/__tests__/components/DocumentosListView.test.tsx:158`
- Modify: `e2e/documentos-multifuente.spec.ts:59`
- Modify (solo si la regeneración detecta cambio real): `src/types/database.types.ts`

**Step 1: Aplicar y comprobar la migración (completado el 16/08/2026)**

- Seguir literalmente el flujo Supabase CLI local y de drift de `docs/design-guides/data_styleguide.md`, exclusivamente contra `rgmrqkoudyotkpqgezzv`/`main` declarado como development de prueba.
- Ejecutar el comando autorizado y comprobar de solo lectura que los enlaces gestionados afectados tienen `content_asset_id`, asset de igual `workspace_id` y proveedor/resource canónicos, sin duplicados.
- Confirmar que no cambió RLS/Realtime/grants ni el schema público; regenerar tipos solo si hay delta real.

**Step 2: RED→GREEN del CTA con contenido**

- Añadir un test de componente que, con al menos un asset YouTube, observe la fila y un botón accesible `Añadir vídeo de YouTube` que abre el formulario del mismo proveedor.
- Ejecutar el test para observar RED real: hoy el CTA solo existe en `empty-setup`.
- Implementar el CTA mínimo en el estado poblado reutilizando el mismo handler/diálogo; no sustituirlo por editar/eliminar ni duplicar lógica de formulario.
- El bloque colapsable «Cómo funciona» puede conservar el contenido `Configura YouTube` montado, pero debe permanecer no visible mientras esté cerrado.

**Step 3: RED E2E del síntoma original**

- Extender el escenario existente: partir del estado vacío con sede activa, crear un vídeo YouTube, esperar cierre, navegar fuera y volver a `/documentos` en la misma sesión.
- Afirmar `YouTube (1)`, fila visible mediante su etiqueta YouTube y `resourceId`/URL canónica, ausencia de `Configura YouTube` y CTA para añadir otro vídeo. La lista técnica no expone actualmente el título editorial personalizado, que no forma parte de esta corrección.
- Cruzar por Supabase/API el documento (`content_asset_id` no nulo), el asset (`provider=youtube`) y las asociaciones tenant/sede.

**Step 4: GREEN y autocomprobación**

- Ajustar únicamente fixture/selectores si el test revela una carencia dentro del alcance; no añadir esperas arbitrarias ni `router.refresh()`.
- Ejecutar el E2E dirigido, tests dirigidos, lint y typecheck; reportar evidencia compacta.

### Task 3 (final, después de que el verifier dé PASA): Actualizar documentación

**Files:**

- Modify: `docs/backlog.md:178` (B11-0)
- Modify (si el cambio altera el inventario real): `docs/crud-audit.md:331`
- Modify: este plan, solo para registrar autorización e incidencias/resoluciones exigidas por el workflow

**Pasos:**

- Registrar la decisión de migración con fecha Europe/Madrid y evidencia exacta de aplicación.
- Actualizar B11-0 con la corrección verificada, backfill y E2E real; no cerrar gates de B11-0 que sigan pendientes.
- Actualizar `crud-audit` solo si su descripción del flujo quedó obsoleta. No cambiar design guides: el fix reutiliza convenciones existentes y no altera stack.
- No ejecutar git (`GIT=off`).
