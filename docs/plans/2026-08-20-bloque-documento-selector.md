# Selector de Documento en los bloques de sesión — Implementation Plan

**Goal:** Que el campo "Recurso (opcional)" de cada bloque de sesión se llame **Documento** y
liste de verdad los documentos del workspace (enlace de YouTube/Drive o archivo propio), que hoy
sale siempre vacío.

**Architecture:** El wiring ya existe de punta a punta (`sesion_bloques.documento_id` con FK a
`documentos`, tipos, Zod, servicio y picker). El fallo es de cableado en `SesionForm`: llama a
`fetchDocumentosDisponibles(sedeIds)` **sin `workspaceId`**, y el servicio corta con
`if (!workspaceId) return { data: [], error: null }` (`src/services/documentos.service.ts:314`).
Se arregla pasando el `workspaceId` que el componente ya recibe por props y usando la queryKey
tenant-aware `queryKeys.documentos.available`, replicando la convención vecina de
`EjercicioForm.tsx:62-63`. Encima, se renombra la nomenclatura de UI Recurso → Documento y se
añade un estado vacío que explica dónde crear documentos.

**Tech Stack:** Next.js 16 (App Router), React 19, shadcn/ui `Select`, React Query vía
`@/hooks/useQuery`, Vitest + jsdom + Testing Library.

## Perfil de verificación

- Nivel: `standard`
- Motivo: cambio de UI + cableado de consulta en cliente. **No hay migración** (la columna
  `sesion_bloques.documento_id` y su FK ya existen desde
  `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql:9`), no se tocan RLS, auth,
  pagos ni servicios de datos. El único matiz sensible es de multi-tenant, pero el cambio
  **endurece** el scoping (pasa a filtrar por `workspace_id` y a aislar la caché por tenant) y ya
  está cubierto por `src/__tests__/services/tenant-scope.test.ts:578-601`.
- Comandos: `npm run lint` · `npx tsc --noEmit` · `npm test -- --run` · `npm run build`
- Evidencias esperadas: los 4 comandos en verde; los tests dirigidos de `SesionForm`,
  `SesionBloquesEditor` y `SesionEjecutarView` verdes; `fetchDocumentosDisponibles` invocado con
  `(sedeIds, workspaceId)` y queryKey `queryKeys.documentos.available(workspaceId, sedeIds)`.
- E2E: **no aplica** en este perfil. Además, la suite E2E de documentos está bloqueada por falta
  de `SUPABASE_SERVICE_ROLE_KEY` (ver `e2e/documentos-multifuente.spec.ts`), así que no se usa
  como gate aquí.

## Incidencias de verificación

<!-- Se rellena durante /auto solo para fallos major/critical. -->

## Autorización de migración

No aplica: el plan no altera esquema, datos, grants ni RLS.

---

## Contexto descubierto (comportamiento actual)

| Pieza | Ruta | Estado |
|---|---|---|
| Columna BD | `sesion_bloques.documento_id uuid references public.documentos(id) on delete set null` | ✅ existe |
| Tipos | `src/types/sesion-bloques.ts:8,18,28` (`documentoId: string \| null`) | ✅ existe |
| Zod | `src/schemas/sesion-bloques.schema.ts:9` | ✅ existe |
| Servicio bloques | `src/services/sesion-bloques.service.ts:13,21,58` | ✅ existe |
| Picker | `src/components/sesiones/SesionBloqueResourcePicker.tsx` | ✅ existe, con textos "Recurso" |
| Carga de documentos | `src/components/sesiones/SesionForm.tsx:213-216` | ❌ **bug: sin `workspaceId`** |
| Consumo en ejecución | `src/components/sesiones/SesionBloqueRecurso.tsx` | ✅ existe, con textos "Recurso" |

`SesionForm` **ya recibe** `workspaceId: string | null` (`SesionForm.tsx:156,196`) y lo usa para
`ejerciciosQuery` (`SesionForm.tsx:208-211`); solo la consulta de documentos lo ignora.
`SesionesListView.tsx:234` ya lo pasa (`workspaceId={activeWorkspaceId}`).

**Decisiones prohibidas:**
- No crear migraciones ni tocar `supabase/migrations/`.
- No renombrar `documentoId` / `documento_id` ni el archivo `SesionBloqueResourcePicker.tsx`
  (el cambio es de textos visibles, no de contratos).
- No tocar `fetchDocumentosDisponibles` ni `fetchDocumentosBySedeIds` en el servicio.
- No añadir creación de documentos en línea desde el bloque: el alta sigue en el módulo
  `documentos` (ya soporta enlace YouTube/Drive y archivo propio).

---

### Task 1: `SesionForm` carga los documentos con el workspace activo

**Files:**
- Modify: `src/components/sesiones/SesionForm.tsx:213-216`
- Test: `src/__tests__/components/SesionForm.test.tsx`

**Step 1: Escribe el test que falla**

En `src/__tests__/components/SesionForm.test.tsx`, añade el mock parcial del servicio de
documentos junto al resto de `vi.mock` de la cabecera (usa `importOriginal` para no romper otros
imports del módulo):

```tsx
vi.mock("@/services/documentos.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/documentos.service")>()),
  fetchDocumentosDisponibles: vi.fn().mockResolvedValue({ data: [], error: null }),
}));
```

Importa `fetchDocumentosDisponibles` arriba y resetéalo en el `beforeEach` existente. Añade el
test, siguiendo el patrón exacto de "ejerciciosCall" (`SesionForm.test.tsx:547-552`):

```tsx
it("consulta los documentos disponibles con sede y workspace, con clave aislada por tenant", async () => {
  render(
    <SesionForm
      open
      onOpenChange={vi.fn()}
      title="Nueva sesión"
      sedeIds={["sede-1"]}
      workspaceId={WORKSPACE_ID}
      onSubmit={vi.fn()}
    />,
  );

  const documentosCall = useQueryMock.mock.calls.find(
    ([, queryKey]) => Array.isArray(queryKey) && queryKey[0] === "documentos",
  );
  expect(documentosCall?.[1]).toEqual(
    queryKeys.documentos.available(WORKSPACE_ID, ["sede-1"]),
  );
  await documentosCall?.[0]();
  expect(fetchDocumentosDisponibles).toHaveBeenCalledWith(["sede-1"], WORKSPACE_ID);
});
```

**Step 2: Ejecuta el test para verificar que falla** — Run:
`npm test -- --run src/__tests__/components/SesionForm.test.tsx` · Expected: FAIL (la queryKey
actual es `queryKeys.documentos.list(sedeIds, null, null)` y el servicio se llama con un solo
argumento).

**Step 3: Implementación mínima**

En `SesionForm.tsx:213-216`, pasa `workspaceId` al servicio y cambia a la queryKey tenant-aware,
igual que `EjercicioForm.tsx:62-63`:

```tsx
const documentosQuery = useQuery<Documento[]>(
  () => fetchDocumentosDisponibles(sedeIds, workspaceId),
  queryKeys.documentos.available(workspaceId, sedeIds),
);
```

**Step 4: Ejecuta los tests para verificar que pasan** — Run:
`npm test -- --run src/__tests__/components/SesionForm.test.tsx` · Expected: PASS

---

### Task 2: Renombrar Recurso → Documento en el editor de bloques

Solo textos visibles y `aria-label`. No cambies props, nombres de archivo ni tipos.

**Files:**
- Modify: `src/components/sesiones/SesionBloquesEditor.tsx:223`
- Modify: `src/components/sesiones/SesionBloqueResourcePicker.tsx:39,58,61,64,65,70,84,89,95,100`
- Test: `src/__tests__/components/SesionBloquesEditor.test.tsx:141-161`

**Step 1: Actualiza los tests para el nuevo copy (deben fallar)**

En `SesionBloquesEditor.test.tsx`, sustituye en el test
"muestra la selección de un recurso…" (renómbralo a "…de un documento…"):
- `/seleccionar recurso del bloque 1/i` → `/seleccionar documento del bloque 1/i`
- `/abrir recurso del bloque 1/i` → `/abrir documento del bloque 1/i`
- `/quitar recurso del bloque 1/i` → `/quitar documento del bloque 1/i`
- `/sin recurso asociado/i` → `/sin documento asociado/i`
- El test `"permite escribir notas libres sin exigir ejercicio ni recurso"` pasa a
  `"…ni documento"` (solo el nombre).

Añade además la comprobación de la etiqueta del campo:

```tsx
expect(screen.getByText("Documento (opcional)")).toBeInTheDocument();
```

**Step 2: Ejecuta para verificar que falla** — Run:
`npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: FAIL

**Step 3: Aplica el renombrado**

Mapa exacto de textos (español, sin tocar identificadores):

| Antes | Después |
|---|---|
| `<Label>Recurso (opcional)</Label>` (`SesionBloquesEditor.tsx:223`) | `<Label>Documento (opcional)</Label>` |
| aria-label `Seleccionar recurso del bloque N` | `Seleccionar documento del bloque N` |
| `Sin recurso asociado` (placeholder, render de `SelectValue` ×2 y `SelectItem value="none"`) | `Sin documento asociado` |
| aria-label `Abrir recurso del bloque N` / botón `Abrir recurso` | `Abrir documento del bloque N` / `Abrir documento` |
| aria-label `Quitar recurso del bloque N` / botón `Quitar recurso` | `Quitar documento del bloque N` / `Quitar documento` |
| `"No se pudo abrir el recurso."` (`SesionBloqueResourcePicker.tsx:39`) | `"No se pudo abrir el documento."` |

**Step 4: Ejecuta los tests para verificar que pasan** — Run:
`npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: PASS

---

### Task 3: Renombrar Recurso → Documento en la vista de ejecución

Coherencia de vocabulario: lo que se elige como "Documento" debe llamarse igual al ejecutarlo.

**Files:**
- Modify: `src/components/sesiones/SesionBloqueRecurso.tsx:23,32,36,42,47`
- Test: `src/__tests__/components/SesionEjecutarView.test.tsx:207-223`

**Step 1: Actualiza el test (debe fallar)**

En `SesionEjecutarView.test.tsx`, en el test "abre el recurso del bloque visto…" (renómbralo a
"abre el documento del bloque visto…"): `/abrir recurso/i` → `/abrir documento/i`.

**Step 2: Ejecuta para verificar que falla** — Run:
`npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: FAIL

**Step 3: Aplica el renombrado** (solo strings; el componente y su prop `documento` no cambian
de nombre)

| Antes | Después |
|---|---|
| `"No se pudo abrir el recurso."` | `"No se pudo abrir el documento."` |
| `"Este bloque no tiene recurso asociado."` | `"Este bloque no tiene documento asociado."` |
| aria-label `Recurso de {bloqueTitulo}` | `Documento de {bloqueTitulo}` |
| fallback `"Recurso asociado"` | `"Documento asociado"` |
| botón `Abrir recurso` | `Abrir documento` |

**Step 4: Ejecuta los tests para verificar que pasan** — Run:
`npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: PASS

---

### Task 4: Estado vacío y origen del documento en el selector

Cierra la petición: si no hay documentos, el usuario debe saber dónde crearlos (enlace de
YouTube/Drive o archivo propio); y al elegir, debe distinguir el origen de cada documento.

**Files:**
- Modify: `src/components/sesiones/SesionBloqueResourcePicker.tsx`
- Test: `src/__tests__/components/SesionBloquesEditor.test.tsx`

**Contrato de la etiqueta secundaria** (a partir de `Documento` en `src/types/documentos.ts`):

- `sourceType === "link"` → `"Enlace"`
- `sourceType === "file"` → `"Archivo"`
- Si `categoriaDoc` tiene valor, se antepone: `{categoriaDoc} · {origen}`

**Step 1: Escribe los tests que fallan**

En `SesionBloquesEditor.test.tsx`:

```tsx
it("indica el origen de cada documento en el selector", () => {
  renderEditor([
    { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
  ]);

  fireEvent.click(screen.getByRole("combobox", { name: /seleccionar documento del bloque 1/i }));
  const option = screen.getByRole("option", { name: /Guía del rondo/ });
  expect(option).toHaveTextContent("Enlace");
});

it("explica dónde crear documentos cuando no hay ninguno disponible", () => {
  render(
    <SesionBloquesEditor
      bloques={[{ id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 }]}
      ejercicios={ejercicios}
      documentos={[]}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByText(/no hay documentos disponibles/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /documentos/i })).toHaveAttribute("href", "/documentos");
});
```

Ajusta el test existente de Task 2 si el `name` exacto de la opción deja de coincidir: usa el
regex `/Guía del rondo/` en lugar de la cadena exacta.

**Step 2: Ejecuta para verificar que falla** — Run:
`npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: FAIL

**Step 3: Implementación mínima**

En `SesionBloqueResourcePicker.tsx`:
1. Dentro de cada `SelectItem`, bajo el `titulo`, añade un `<span>` con la etiqueta secundaria
   del contrato, con estilo silencioso (`text-xs text-muted-foreground`), siguiendo el estilo
   Tailwind vecino del propio componente.
2. Cuando `documentos.length === 0`, renderiza bajo el `Select` un párrafo de ayuda con
   `next/link`:
   `No hay documentos disponibles. Añádelos en Documentos: un enlace de YouTube o Google Drive, o un archivo de tu almacenamiento.`
   con el enlace apuntando a `/documentos` y el texto del enlace `Documentos`.
   Reutiliza las clases del texto auxiliar existente (`text-sm text-muted-foreground`).
3. No deshabilites el `Select` cuando la lista esté vacía: "Sin documento asociado" debe seguir
   siendo seleccionable.

**Step 4: Ejecuta los tests para verificar que pasan** — Run:
`npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: PASS

---

## Criterios de aceptación

1. Abrir "Nueva sesión" / "Editar sesión" con una sede y un workspace activos y desplegar el
   selector de un bloque muestra los documentos del workspace (los de la sede y los globales),
   no solo "Sin documento asociado".
2. La etiqueta del campo es **"Documento (opcional)"** y todo el copy del bloque habla de
   documento, tanto en el editor como en la vista de ejecución.
3. Cada opción muestra su origen (Enlace / Archivo), de modo que un vídeo de YouTube, un archivo
   de Google Drive y uno del almacenamiento propio se distinguen en la lista.
4. Sin documentos, el formulario indica que se crean desde el módulo Documentos y enlaza a él.
5. Al guardar, `documentoId` viaja igual que hoy a `replace_sesion_bloques`; no cambian contratos
   de datos.
