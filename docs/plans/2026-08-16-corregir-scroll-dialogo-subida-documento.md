# Corregir scroll del diálogo de subida de documento Implementation Plan

**Goal:** Permitir que el cuerpo del diálogo «Subir archivo» del almacenamiento privado se desplace verticalmente y mantenga accesibles sus acciones en escritorio y móvil.

**Architecture:** Mantener el límite de altura y el recorte definidos por el primitivo `DialogContent`, reparando únicamente la cadena flex del formulario consumidor. El `form` ocupará y podrá ceder el espacio disponible, `DialogBody` será el único cuerpo desplazable y el footer seguirá fuera de esa región, sin tocar servicios, hooks, schemas ni el primitivo compartido.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estricto, shadcn/ui, Tailwind CSS v4, React Hook Form, Vitest, Testing Library.

## Perfil de verificación

- Nivel: standard
- Motivo: corrección ordinaria de layout en un Client Component, sin auth, permisos, persistencia, RLS, Realtime ni migraciones. El contrato visual del frontend exige además comprobar el comportamiento responsive y el build de Next.js 16.
- Comandos: `npm.cmd run lint`; `npx.cmd tsc --noEmit`; `npm.cmd test -- --run src/__tests__/components/DocumentoForm.test.tsx`; `npm.cmd test -- --run`; `npm.cmd run build`; `npm.cmd run dev` seguido de inspección con `agent-browser` en escritorio y 375×667.
- Evidencias esperadas: estático, prueba dirigida, suite y build en verde; el cuerpo del diálogo admite scroll vertical, el footer y «Subir documento» son alcanzables, y no aparece overflow horizontal en ninguno de los dos viewports.

## Incidencias de verificación

### Ronda 1 — 16/08/2026

- **major · typecheck global ajeno al fix.** `npx.cmd tsc --noEmit` falla por tres usos sin `contentAssetId` en `SesionBloquesEditor.test.tsx`, `SesionEjecutarView.test.tsx` y `sesion-documentos.service.ts`. Impacto: impide cerrar el gate estático completo, aunque los archivos del scroll no aparecen en los errores. Estado: pendiente fuera del alcance de esta corrección; no se modifica trabajo ajeno.
- **major · suite global ajena al fix.** El `test-runner` obtuvo 612/620 tests en verde: siete fallos por ausencia de `RequestLockProvider` y uno incorporado por trabajo concurrente de `defaultSedeIds` en `DocumentoForm`. Impacto: impide cerrar la regresión completa. Evidencia del cambio solicitado: el test dirigido original pasó 8/8 y la regresión de scroll aislada sigue pasando 1/1. Estado: pendiente fuera del alcance; se preservan los cambios concurrentes.
- **major · intención visual bloqueada por autenticación.** `/documentos` redirige a «Iniciar sesión» en el servidor local existente; `.env.test.local` no proporciona `E2E_STORAGE_STATE` ni credenciales E2E utilizables. Impacto: no se pudieron comprobar en navegador escritorio/375×667 las métricas reales de scroll y overflow. Estado: en investigación read-only de una sesión ya configurada; no se automatiza OAuth ni se inventan credenciales.

### Cierre del bucle de verificación — BLOCKED

- El discovery read-only confirmó que falta la sesión canónica `.auth/state.json`, no existe bypass autorizado para `/documentos` y las variables disponibles no satisfacen el helper genérico de autenticación de Documentos.
- Hay dos storage states antiguos de clonación (`.auth/clone-manager.json` y `.auth/clone-non-manager.json`, 09/08/2026), pero no son un perfil validado para la sesión actual y no se reutilizaron como evidencia. No se ejecutaron fixtures ni se usó `service_role`.
- No se lanzan rondas idénticas adicionales ni se remedian fallos ajenos: el cambio solicitado permanece con lint, test dirigido, regresión aislada y build en verde; typecheck, suite global e intención visual autenticada mantienen bloqueado el perfil `standard` completo.
- `docs/backlog.md` queda sin cerrar hasta disponer de gates globales verdes y una sesión autenticada reutilizable para repetir la intención visual en escritorio y 375×667.

---

## Contexto y diagnóstico

- Evidencia de entrada: `C:\Users\juans\AppData\Local\Temp\codex-clipboard-da6a2daa-59e8-469f-a0f0-e9172da2523a.png`. El diálogo «Subir archivo» rebasa el viewport: aparecen Archivo, Título, Categoría, Sedes, Equipos y parte de Visibilidad/Entrenadores, pero los campos y acciones inferiores no son alcanzables.
- Ruta real: `/documentos` → `src/app/(dashboard)/documentos/page.tsx` → `src/components/documentos/DocumentosListView.tsx` → `src/components/documentos/DocumentoForm.tsx`.
- El proveedor privado abre el formulario con `sourceProvider="supabase_storage"`; `DocumentoForm` lo convierte en modo archivo.
- `src/components/ui/dialog.tsx` ya limita la altura de `DialogContent`, usa `overflow-hidden` y declara `DialogBody` con `flex-1 overflow-y-auto`.
- Causa raíz confirmada: en `src/components/documentos/DocumentoForm.tsx:303-304`, el `form` no forma una columna flex acotada y `DialogBody` no puede encogerse con `min-h-0`. Su altura intrínseca queda recortada por `DialogContent`, dejando el footer de `DocumentoForm.tsx:548` inaccesible.
- Precedente del proyecto: `src/components/sedes/SedeForm.tsx:261-262` mantiene el `form` como `flex min-h-0 flex-1 flex-col` y el `DialogBody` con `min-h-0`; `src/__tests__/components/SedeForm.test.tsx:94-106` fija ese contrato.

### Hipótesis falsables

1. **Confirmada:** si falta la cadena `flex`/`min-h-0` en `DocumentoForm`, el cuerpo conserva su altura intrínseca; al aplicar el patrón de `SedeForm`, el cuerpo se acota y el footer vuelve a ser alcanzable.
2. **Descartada:** si el primitivo no tuviera altura máxima, el diálogo crecería sin límite; `DialogContent` ya define límites desktop/móvil.
3. **Parcial, no causal:** si el contenido específico del proveedor privado fuera la causa, solo fallaría esa variante; en realidad su mayor longitud revela un defecto estructural común a cualquier variante suficientemente larga.
4. **Descartada:** si un portal de `MultiSelect` causara el recorte, el flujo normal anterior seguiría dimensionado; el corte ya se produce en la composición `DialogContent` → `form` → `DialogBody`.

## Criterios de aceptación

1. Al abrir «Subir archivo» con `sourceProvider="supabase_storage"`, el contenido largo queda dentro de un cuerpo con desplazamiento vertical.
2. La cabecera y el footer no forman parte del cuerpo scrollable; «Subir documento» sigue accesible al recorrer el diálogo.
3. En escritorio y en 375×667 se puede alcanzar «Entrenadores específicos» y la acción final sin overflow horizontal.
4. Las variantes Drive y YouTube, el primitivo `Dialog`, el upload y la persistencia conservan su comportamiento.
5. No se introduce migración ni se modifica esquema, datos, permisos, RLS o Realtime.

## Restricciones

- GIT=off: no ejecutar comandos git, no crear rama, no commits ni push.
- LF siempre; UI en español; ediciones quirúrgicas.
- Leer antes de implementar `AGENTS.md`, `docs/design-guides/frontend_styleguide.md` y las guías Next.js 16 `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` y `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`.
- Aplicar `tdd` y `javascript-testing-patterns`; no añadir dependencias.
- No modificar `src/components/ui/dialog.tsx`, servicios, hooks, schemas, upload ni persistencia.
- No añadir un E2E automatizado para este alcance `standard`; la intención visual responsive se valida al final con navegador.

### Task 1: Reparar la región desplazable de `DocumentoForm` con una regresión TDD

**Skills:** `tdd`, `javascript-testing-patterns`

**Files:**
- Modify: `src/__tests__/components/DocumentoForm.test.tsx`
- Modify: `src/components/documentos/DocumentoForm.tsx:303-304`

**Step 1: Escribir el test que reproduce el fallo**

Añadir dentro del `describe` existente una sola regresión estructural. JSDOM no calcula layout ni métricas reales de overflow, por lo que el seam correcto es el contrato mínimo que hace posible el scroll en navegador:

```tsx
it("limita la subida privada para que el cuerpo del diálogo sea desplazable", () => {
  render(
    <DocumentoForm
      open
      onOpenChange={vi.fn()}
      title="Subir archivo"
      sourceProvider="supabase_storage"
      onSubmit={vi.fn()}
    />,
  );

  const dialog = screen.getByRole("dialog", { name: "Subir archivo" });
  const form = dialog.querySelector("form");
  const body = dialog.querySelector('[data-slot="dialog-body"]');

  expect(form).toHaveClass("flex", "flex-1", "min-h-0", "flex-col");
  expect(body).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
  expect(body).not.toContain(
    screen.getByRole("button", { name: "Subir documento" }),
  );
});
```

**Step 2: Ejecutar el test para verificar RED** — Run: `npm.cmd test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: FAIL porque el `form` aún no expone `flex flex-1 min-h-0 flex-col` y `DialogBody` aún no expone `min-h-0`.

**Step 3: Aplicar el cambio mínimo**

- Dar al `form` existente la misma cadena de layout acotado que `SedeForm`: columna flex, crecimiento y contracción con `min-h-0`.
- Añadir `min-h-0` al `DialogBody` existente, conservando su `flex-1 overflow-y-auto` heredado.
- Mantener `DialogFooter` como hermano posterior de `DialogBody`, sin mover campos ni acciones.

**Step 4: Ejecutar el test para verificar GREEN** — Run: `npm.cmd test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: PASS.

**Step 5: Autocomprobación dirigida** — Run: `npm.cmd run lint -- src/components/documentos/DocumentoForm.tsx src/__tests__/components/DocumentoForm.test.tsx` y `npx.cmd tsc --noEmit` · Expected: ambos PASS, sin errores ni avisos introducidos por los dos archivos.

**Step 6: Limpiar y revisar el alcance** — Confirmar que no quedan logs/instrumentación temporal, que solo cambiaron los dos archivos declarados y que no se tocó el primitivo compartido ni la capa de datos.

### Task 2 (final, solo después de `verifier: PASA`): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md` — registrar y marcar como completada la corrección bajo B11-0, siguiendo la convención `[x]` y sin duplicar B10-7 (Drive).
- No change: `docs/crud-audit.md` — no cambia cobertura CRUD ni persistencia.
- No change: `docs/design-guides/*` — se reutiliza una convención ya existente; no se introduce stack ni patrón nuevo.

**Pasos:**

1. Ejecutar esta tarea únicamente cuando la verificación standard completa haya devuelto `PASA`.
2. Añadir bajo B11-0 una entrada concisa con fecha 16/08/2026 que identifique el scroll del diálogo de subida privada y marcarla `[x]`.
3. Mantener intactas las tareas ajenas y no crear artefactos GTS `task/`, porque las fuentes canónicas de este repositorio son `docs/backlog.md` y `docs/plans/`.
4. Confirmar formato Markdown y coherencia entre backlog, plan y evidencia final, sin usar git.
