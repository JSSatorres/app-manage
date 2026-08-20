# Corregir listado de Almacenamiento en Documentos Implementation Plan

**Goal:** Hacer que los archivos privados subidos aparezcan inmediatamente en una lista operable y reducir las lecturas repetidas al cargar los proveedores de Documentos.

**Architecture:** Mantener `documentos` como entidad editorial y `content_assets` como recurso técnico. La lectura editorial resolverá documentos asociados a la sede más globales del workspace y expondrá sus `contentAssetId`; los catálogos reutilizarán esos IDs en vez de repetir el recorrido por pivotes para cada proveedor. El formulario recibirá la sede activa como valor inicial solo en altas.

**Tech Stack:** Next.js 16, React 19, TypeScript estricto, React Query, Supabase, React Hook Form + Zod, Vitest + Testing Library, Playwright/agent-browser.

## Perfil de verificación

- Nivel: full
- Motivo: corrige persistencia visible, filtrado multi-tenant por workspace/sede, subida privada y mutaciones de Documentos.
- Comandos: `npm run lint`; `npx tsc --noEmit`; tests dirigidos de Documentos; `npm test -- --run`; `npm run build`; `npm run test:e2e -- e2e/documentos-multifuente.spec.ts` y validación autenticada desktop/móvil si existe sesión reutilizable.
- Evidencias esperadas: RED previo reproducible; documento global y documento asociado visibles con sede activa; contador/lista/acciones correctos tras subir; una sola resolución editorial compartida en vez de una por proveedor; suite y build verdes; UI sin estado tutorial cuando hay archivos.

## Incidencias de verificación

- **Major — ronda 1 — 16/08/2026 — RESUELTA:** lint y tests dirigidos pasaban, pero typecheck/build fallaban porque el nuevo contrato obligatorio `Documento.contentAssetId` no se propagó a `sesion-documentos.service.ts`, dos fixtures de sesión y el tipo del mock `workspaceState`. Causa: el mapper vecino construía `Documento` sin seleccionar `content_asset_id`. Corrección: SELECT, tipo y mapper alineados; fixtures y mock tipados. Ronda 2: TypeScript PASS, 38/38 pruebas dirigidas PASS y build PASS.
- **Major — revisión final — 16/08/2026 — RESUELTA:** la edición permitía cambiar la URL de un enlace gestionado, pero el activo técnico seguía siendo el anterior. La URL pasa a ser identidad de solo lectura al editar YouTube/Drive y el submit conserva el valor persistido incluso ante manipulación del formulario; las altas siguen permitiendo introducir una URL. Regresión cubierta en `DocumentoForm.test.tsx`.
- **Major — revisión final — 16/08/2026 — RESUELTA:** la lista unificada pedía solo los 10 primeros activos de cada proveedor y después paginaba ese subconjunto en cliente. Se sustituyeron los cuatro catálogos por una única consulta sin filtro de proveedor, con `limit/offset`, recuento exacto y paginación servidor de la lista unificada; además reduce cuatro lecturas de activos a una.
- **Major — revisión final — 16/08/2026 — RESUELTA:** al unificar el listado había desaparecido `StorageUsageCard`. Se reincorporó sin sustituir el selector general de tres métodos; vuelve a mostrar cuota/ampliación y su acción específica respeta el bloqueo de Storage.
- **Major — revisión final — 16/08/2026 — RESUELTA:** carga y errores del catálogo o de la lectura editorial por sede se confundían con el estado vacío. La vista combina ambos estados, ofrece reintento y conserva la lista si ya hay resultados.
- **Major — revisión final — 16/08/2026 — RESUELTA:** la página podía quedar fuera de rango al cambiar workspace/sede. La paginación queda ligada al scope y deriva la página 0 en el mismo render del cambio. Cierre estático final: 65/65 pruebas dirigidas, lint, TypeScript y build PASS.
- **Major ajena — rondas 1–2 — 16/08/2026 — ABIERTA:** la suite global pasó de 622 PASS / 7 FAIL a 616 PASS / 11 FAIL durante cambios concurrentes de `global-request-lock`; fallan pruebas de economía, landing y navegación por provider/guards aún no integrados. No hay fallos en Documentos y no se corrige ni revierte ese trabajo desde esta tarea.

---

## Diagnóstico y decisiones

- Reproducción observada: las RPC de reserva y finalización responden 200, pero la pestaña queda en `Almacenamiento (0)` y no monta `DocumentoProviderList`.
- Causa funcional: el alta admite `sedeIds=[]`; ese documento global queda fuera de `fetchAssetIdsBySede` pese a que la lectura editorial promete incluir globales.
- Causa de rendimiento: cuatro `useContentAssets` ejecutan de forma independiente `documento_sedes` y lecturas de `documentos` antes de consultar cada proveedor.
- Se conserva la paginación por proveedor y la distinción `empty-setup`/`empty-filtered`.
- No se aplica migración. El SQL local ya enlaza `documentos.content_asset_id` dentro de `reserve_document_upload` y `npx.cmd supabase migration list --linked` confirmó en modo solo lectura que `20260808180000` está alineada `local=remote`; el 502 inicial fue transitorio.
- Prohibido tocar o revertir la corrección concurrente de `createDocumentoLink` para YouTube/Drive.

### Task 1: Corregir el alcance editorial y exponer el asset técnico

**Skills:** `tdd`, `javascript-testing-patterns`, `clean-code`.

**Files:**
- Modify: `src/types/documentos.ts`
- Modify: `src/services/documentos.service.ts` en `DocumentoRow`, `mapDocumento` y `fetchDocumentosBySedeIds`; no modificar `createDocumentoLink`.
- Test: `src/__tests__/services/documentos.service.test.ts` o el test de servicio vecino que ya cubra tenant scope.

**Step 1: Escribir la prueba fallida** — Cubrir sede con documento asociado, documento global del mismo workspace y documento de otra sede; la interfaz pública devuelve los dos primeros, excluye el tercero y expone `contentAssetId`.

**Step 2: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/services/documentos.service.test.ts` (o ruta real descubierta) · Expected: FAIL porque la lectura actual omite globales cuando existen IDs asociados y el mapper no expone el asset.

**Step 3: Implementar el mínimo** — Componer lecturas server-side de asociados y globales, fusionar por ID antes de cargar pivotes, mantener scope `workspace_id` y no traer documentos pertenecientes solo a otra sede. Añadir `contentAssetId: string | null` al dominio y mapper.

**Step 4: Ejecutar y confirmar GREEN** — Expected: PASS sin cambios en altas externas concurrentes.

### Task 2: Reutilizar el alcance en los catálogos de proveedor

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`, `vercel-react-best-practices`, `clean-code`.

**Files:**
- Modify: `src/services/content-assets.service.ts`
- Modify: `src/hooks/useContentAssets.ts`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Test: `src/__tests__/services/content-assets.service.test.ts`
- Test: `src/__tests__/components/DocumentosListView.test.tsx`

**Step 1: Escribir una prueba fallida de servicio** — Al proporcionar IDs editoriales ya resueltos, `fetchContentAssets` filtra por ellos y no consulta `documento_sedes` ni vuelve a leer `documentos`.

**Step 2: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/services/content-assets.service.test.ts` · Expected: FAIL porque no existe el contrato de alcance precalculado.

**Step 3: Implementar el contrato mínimo** — Aceptar un scope opcional tipado de asset IDs, conservar el fallback actual para otros consumidores y mantener provider/workspace/range/count. Un array vacío debe producir lista vacía sin una consulta `.in()` inválida y conservar el metadato de proveedor del workspace.

**Step 4: Escribir la prueba fallida de componente** — `DocumentosListView` deriva IDs de `documentos.data`, los entrega a YouTube/Drive/Storage/legacy, muestra el asset de Storage y conserva `Ver`, `Editar`, `Eliminar` y `Subir archivo`.

**Step 5: Implementar y confirmar GREEN** — Run: tests de servicio + vista · Expected: PASS y ninguna resolución de pivotes por proveedor.

### Task 3: Preseleccionar la sede activa al subir

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management`, `clean-code`.

**Files:**
- Modify: `src/components/documentos/DocumentoForm.tsx`
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Test: `src/__tests__/components/DocumentoForm.test.tsx`

**Step 1: Escribir la prueba fallida** — Al abrir un alta con `defaultSedeIds=[sedeActiva]`, el selector contiene esa sede; al editar prevalecen las asociaciones del documento y al cerrar/reabrir no se filtra estado anterior.

**Step 2: Ejecutar y confirmar RED** — Run: `npm test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: FAIL porque el formulario siempre resetea nuevas altas a `[]`.

**Step 3: Implementar el mínimo** — Añadir prop tipada `defaultSedeIds`, usarla solo sin `initialValue` y pasar `[activeSede.id]` desde la vista.

**Step 4: Ejecutar y confirmar GREEN** — Expected: PASS; el usuario puede modificar la selección antes de guardar.

### Task 4: Verificar el flujo completo y la red

**Skills:** `agent-browser` para inspección visual/E2E, además de las skills de tests de las tareas anteriores.

**Files:**
- Modify si hace falta: `e2e/documentos-multifuente.spec.ts`
- Record only major/critical incidents: este plan.

**Step 1: Ejecutar estático y tests dirigidos** — `npm run lint`; `npx tsc --noEmit`; tests de Tasks 1–3 · Expected: PASS.

**Step 2: Ejecutar suite y build** — `npm test -- --run`; `npm run build` · Expected: PASS preservando cambios concurrentes.

**Step 3: Ejecutar E2E/inspección autenticada** — Abrir Almacenamiento con sede activa, comprobar lista existente, subir otro archivo de fixture autorizado, observar contador/fila sin recarga, editar atributos en modal y eliminar con confirmación; repetir viewport 375×667. No crear fixtures remotas ni escribir en Supabase sin autorización específica.

**Step 4: Medir peticiones** — Confirmar en red/test instrumentado que los catálogos ya no repiten `documento_sedes`/`documentos` por proveedor; documentar número observado sin prometer una cifra fija para lookups/cuota.

### Task 5 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-corregir-listado-almacenamiento-documentos-16-08-2026.md`
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md`
- Modify si introduce convención: `docs/design-guides/frontend_styleguide.md` y/o `docs/design-guides/data_styleguide.md`

**Step 1: Registrar evidencia** — Anotar gates ejecutados, resultado visual y cualquier limitación real.

**Step 2: Actualizar backlog/auditoría** — Marcar el bug resuelto sin sobrescribir ediciones ajenas; describir alcance global + sede activa y reutilización de scope.

**Step 3: Mantener estado correcto** — Dejar TASK-009 en `en_progreso` hasta confirmación humana; `finalizada` exige fecha y rama.

**Step 4: Handoff** — Resumir causa, archivos, pruebas, verificación visual, cambios remotos (ninguno) y trabajo pendiente.
