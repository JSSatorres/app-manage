# Corregir selector y scroll al clonar sede Implementation Plan

**Goal:** Evitar que «Seleccionar todo» muestre un estado mixto confuso y permitir recorrer verticalmente todo el contenido clonable dentro del modal «Nueva sede».

**Architecture:** El ajuste queda contenido en los componentes de Sedes: el selector global pasa a ser binario sin alterar el triestado útil de cada categoría, y `SedeForm` completa la cadena flex necesaria para que `DialogBody` sea la región desplazable. No se modifica el `Dialog` compartido, los contratos de datos, la RPC ni la migración aplicada.

**Tech Stack:** React 19, Next.js 16, TypeScript, shadcn/ui, Tailwind CSS v4, Vitest, Testing Library y Playwright/agent-browser.

## Perfil de verificación

- Nivel: standard
- Motivo: corrección visual e interactiva localizada en UI, sin persistencia, permisos ni migraciones.
- Comandos: `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx src/__tests__/components/SedeForm.test.tsx`; `npx.cmd playwright test e2e/sede-clone.spec.ts --project=chromium --project="Mobile Chrome"`; `npm.cmd run lint -- src/components/sedes/SedeCloneContentSelector.tsx src/components/sedes/SedeForm.tsx`; `npx.cmd tsc --noEmit`; `npm.cmd run build`.
- Evidencias esperadas: el selector global solo expone `aria-checked="true"` cuando todo está seleccionado y `false` en selecciones parciales; las categorías conservan su triestado; el cuerpo del modal tiene overflow vertical real y permite alcanzar todas las categorías en escritorio y móvil con cabecera/pie utilizables.

## Incidencias de verificación

- **Major ajeno — 09/08/2026:** `npx.cmd tsc --noEmit` falla en `src/__tests__/lib/serverEnv.test.ts:6` porque el fixture `{}` no satisface `ProcessEnv` al omitir `NODE_ENV`. No pertenece a TASK-008.
- **Major ajeno — 09/08/2026:** la suite completa deja 70 archivos y 428 tests verdes, pero `src/__tests__/lib/serverEnv.test.ts` no llega a ejecutar porque Vite no resuelve el módulo `server-only` importado por `src/lib/serverEnv.ts`.
- **Major de infraestructura E2E — 09/08/2026:** el spec dirigido no inició escenarios. La sandbox bloqueó red y el reintento autorizado llegó al bootstrap, donde `e2e/support/clone-auth.ts:600` recibió `PGRST116` porque la sede origen legacy produjo cero filas. La validación autenticada manual abrió `/sedes`, «Nueva sede» y el modo clonar, pero el canal CDP expiró antes de completar escritorio y 375×667. No se alteraron datos remotos.

---

## Diagnóstico confirmado

- `SedeCloneContentSelector` calcula cualquier selección parcial como `someSelected` y envía `indeterminate`/`aria-checked="mixed"` al checkbox global. El checkbox base solo representa ese valor.
- `DialogBody` ya usa `overflow-y-auto`, pero el `<form>` de `SedeForm` no es un contenedor flex limitado. El formulario mantiene altura intrínseca y `DialogContent` recorta el contenido con `overflow-hidden`.
- No tocar `src/components/ui/dialog.tsx`: el defecto está en la composición específica de `SedeForm` y modificar el primitivo compartido ampliaría innecesariamente el riesgo.

### Task 1: Hacer binario el selector global

**Files:**
- Modify: `src/__tests__/components/SedeCloneContentSelector.test.tsx`
- Modify: `e2e/sede-clone.spec.ts`
- Modify: `src/components/sedes/SedeCloneContentSelector.tsx`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write the failing regression test** — Seleccionar todos los equipos dejando el resto vacío y exigir que «Seleccionar todo» permanezca `aria-checked="false"`; conservar una prueba separada donde seleccionar absolutamente todo produce `true`. Ajustar la expectativa E2E histórica que hoy exige `mixed`.

**Step 2: Run test to verify it fails** — Run: `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx` · Expected: FAIL porque el control global todavía expone `mixed`.

**Step 3: Write minimal implementation** — Eliminar el estado indeterminado únicamente del checkbox global. Su valor será `allSelected`; cualquier selección parcial será visual y semánticamente desmarcada. Mantener sin cambios la selección por categoría, sus estados mixtos y la acción global de seleccionar/deseleccionar todo.

**Step 4: Run test to verify it passes** — Run: `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx` · Expected: PASS.

### Task 2: Restaurar el scroll del cuerpo del modal

**Files:**
- Modify: `src/__tests__/components/SedeForm.test.tsx`
- Modify: `e2e/sede-clone.spec.ts`
- Modify: `src/components/sedes/SedeForm.tsx`

**Skills:** `tdd`, `javascript-testing-patterns`.

**Step 1: Write the failing regression coverage** — Comprobar estructuralmente que el formulario ocupa la altura disponible con una columna flex y que el cuerpo es la región desplazable. En E2E, abrir «Nueva sede», activar clonación y demostrar que una categoría inferior puede alcanzarse mediante scroll en Chromium escritorio y Mobile Chrome.

**Step 2: Run tests to verify the failure** — Run: `npm.cmd test -- --run src/__tests__/components/SedeForm.test.tsx`; `npx.cmd playwright test e2e/sede-clone.spec.ts --project=chromium --project="Mobile Chrome"` · Expected: el contrato de layout/scroll falla antes del cambio.

**Step 3: Write minimal implementation** — Convertir el `<form>` específico de `SedeForm` en una columna flex con altura mínima cero y asegurar que `DialogBody` recibe el espacio limitado y desplaza verticalmente. Mantener `DialogHeader` y `DialogFooter` fuera del área desplazable, sin alturas mágicas, scroll horizontal ni cambios en `Dialog` compartido.

**Step 4: Run tests to verify they pass** — Repetir los comandos dirigidos · Expected: PASS en estructura y scroll real.

### Task 3: Verificar el seguimiento completo

**Files:**
- Verify: `src/components/sedes/SedeCloneContentSelector.tsx`
- Verify: `src/components/sedes/SedeForm.tsx`
- Verify: `e2e/sede-clone.spec.ts`

**Step 1: Static verification** — Run: `npm.cmd run lint -- src/components/sedes/SedeCloneContentSelector.tsx src/components/sedes/SedeForm.tsx`; `npx.cmd tsc --noEmit` · Expected: PASS.

**Step 2: Directed tests** — Run: `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx src/__tests__/components/SedeForm.test.tsx` · Expected: PASS.

**Step 3: Build** — Run: `npm.cmd run build` · Expected: PASS; si Google Fonts falla por red, registrar la incidencia de infraestructura y reintentar con conectividad, sin modificar producto.

**Step 4: Visual intent** — Con `agent-browser`, validar el modal autenticado en escritorio y 375×667: selección parcial global desmarcada, selección total marcada, triestado por categoría intacto, scroll vertical hasta la última sección, footer alcanzable y ausencia de overflow horizontal.

### Task 4 (final): Actualizar documentación

**Files:**
- Modify: `task/REGISTRO-TAREAS.md`
- Modify: `task/task-clonar-sede-08-08-2026.md`
- Modify: `docs/backlog.md`
- Modify: `docs/plans/2026-08-09-corregir-selector-scroll-clonar-sede.md`
- Modify if verified: `docs/crud-audit.md`

**Step 1: Record real evidence** — Anotar comandos y resultados reales, además de cualquier bloqueo material.

**Step 2: Keep status truthful** — Durante esta fase se mantuvo `TASK-008` en `en_progreso` y B5-6 en `[~]` hasta obtener verificación y cierre humano; no se inventó rama, commit, PR ni merge.

**Step 3: Synchronize references** — Enlazar este seguimiento desde el registro y la tarea maestra. No modificar design-guides: el cambio no introduce una convención nueva.

## Resultado de ejecución — 09/08/2026

- Estado: implementación propia verificada de forma dirigida; cierre `standard` bloqueado por incidencias globales/E2E ajenas descritas arriba.
- RED confirmado: el selector global devolvía `aria-checked="mixed"` ante selección parcial.
- GREEN: `npm.cmd test -- --run src/__tests__/components/SedeCloneContentSelector.test.tsx src/__tests__/components/SedeForm.test.tsx` → 2 archivos, 14/14 tests.
- Lint dirigido: PASS.
- Build Next.js 16: PASS fuera de sandbox tras un primer bloqueo de Google Fonts.
- Inspección: el global depende solo de `allSelected`; las categorías conservan `mixed`. El `<form>` usa `flex flex-1 min-h-0 flex-col` y `DialogBody` recibe `min-h-0`, sin modificar el primitivo `Dialog`.
- Estado histórico superado: el gate global/E2E quedó reparado; el cierre FULL del 09/08/2026 dejó TASK-008 `finalizada` y B5-6 `[x]`.
