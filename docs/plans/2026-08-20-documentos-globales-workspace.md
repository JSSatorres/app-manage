# Documentos globales del workspace — Implementation Plan

**Goal:** Permitir marcar un documento (vídeo de YouTube, enlace de Drive o archivo) como
**global del workspace** desde el propio formulario, de forma que se vea en **todas las sedes**
del club, y que la lista lo identifique como tal.

**Architecture:** El backend **ya soporta** documentos globales: un documento con
`documentos.sede_id IS NULL`, `workspace_id = <workspace>` y **cero filas** en `documento_sedes`
es devuelto por `fetchDocumentosBySedeIds()` para cualquier sede activa
(`src/services/documentos.service.ts:246-284`), y la RLS `documentos_workspace_insert/update`
admite explícitamente `sede_id IS NULL`
(`supabase/migrations/20260816233707_fix_documentos_workspace_rls.sql:19-47`). El hueco es
**100 % de UX**: el formulario preselecciona la sede activa (`defaultSedeIds`) y la única forma de
crear un documento global es vaciar a mano el `MultiSelect` de «Sedes», algo que no es
descubrible; además, al vaciarlo se deshabilitan «Equipos» y «Entrenadores específicos». Por eso
este plan **no toca la base de datos ni el servicio**: añade un interruptor **Global** en
`DocumentoForm` (mismo patrón que `EjercicioForm.tsx:200-212`), hace coherentes los campos
dependientes y etiqueta el documento como global en la lista.

**Contrato invariante (NO cambiarlo):** hacia fuera del formulario, **global ⇔ `sedeIds: []`**.
`DocumentoFormSubmit` **no** gana campos nuevos y `DocumentosListView` sigue enviando
`sedeId: value.sedeIds[0] ?? null` (`src/components/documentos/DocumentosListView.tsx:145,166,177`).
`esGlobal` es **estado interno del formulario**: se registra en RHF vía `Controller` y se lee con
`useWatch`, pero **no** se añade a `src/schemas/documento.schema.ts` ni a `src/types/documentos.ts`
ni al servicio. Motivo: `zodResolver` descarta las claves ajenas al schema, así que `values.esGlobal`
llegaría `undefined` a `handleSubmit`; `useWatch` lee del store de RHF y no se ve afectado.

**Tech Stack:** Next.js 16 · React 19 · React Hook Form + Zod (`zodResolver`) · shadcn/ui
(`Switch`, `Checkbox`, `MultiSelect` propio) · Vitest + Testing Library · Playwright.

## Perfil de verificación

- **Nivel:** `full`
- **Motivo:** afecta a la **visibilidad multi-tenant** de contenido entre sedes de un workspace.
  No hay migración ni cambio de RLS ni de servicio, pero un fallo haría que un documento se viera
  en sedes que no le corresponden (o al revés), por lo que se exige build + E2E + cruce UI↔datos.
- **Comandos:**
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --run`
  - `npm run build`
  - `npm run test:e2e -- documentos-multifuente`
- **Evidencias esperadas:**
  1. Con el interruptor **Global** activado, `onSubmit` recibe `sedeIds: []` y `equipoIds: []`.
  2. Al editar un documento global, el interruptor aparece **activado** y el selector de sedes
     oculto, aunque haya una sede activa.
  3. En la lista, un documento sin sedes se etiqueta **«Todas las sedes (global)»** y no
     «Sin asociaciones configuradas».
  4. E2E: un documento creado como global aparece en la lista de **dos sedes distintas** del mismo
     workspace.

## Incidencias de verificación

### [major] E2E de documentos no ejecutable: falta `SUPABASE_SERVICE_ROLE_KEY` — 20/08/2026, Task 4

- **Impacto:** el perfil `full` exige E2E, pero `e2e/documentos-multifuente.spec.ts` no puede
  ejecutarse: su `beforeAll` llama a `documentosEnvironment()`
  (`e2e/fixtures/documentos.ts:41-55`), que exige `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. Esta última no está definida en
  `.env`, `.env.local` ni `.env.test.local` (en `.env.example` solo hay un placeholder vacío).
- **Alcance:** **pre-existente y ajeno a este cambio**. Falla igual para los 7 tests que ya
  existían en el archivo, no solo para el nuevo.
- **Evidencia:** `npm run test:e2e -- documentos-multifuente` → `2 failed, 14 did not run`;
  `Error: Documentos E2E requiere NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y
  SUPABASE_SERVICE_ROLE_KEY para fixtures aisladas. at documentosEnvironment
  (e2e\fixtures\documentos.ts:47:11)`.
- **Estado:** el test nuevo queda escrito y guardado con
  `test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, …)`, de modo que se ejecutará solo cuando la
  credencial esté configurada. La evidencia 4 del perfil (documento global visible desde dos
  sedes) **no queda cubierta por E2E** en esta ronda; se sustituye por la verificación estática +
  tests unitarios + revisión del contrato de datos. **Sigue pendiente** de ejecutar el E2E en un
  entorno con la service role key.

---

## Sin migración

Este plan **no requiere migración**. No se crea la columna `es_global` en `documentos`: el modelo
existente (`sede_id NULL` + pivote `documento_sedes` vacío) ya expresa «global» y está cubierto por
tests de servicio (`src/__tests__/services/documentos.service.test.ts:286-287`,
«incluye documentos asociados y globales del workspace con su activo técnico»).
**Decisión prohibida:** no añadir columnas, no tocar `supabase/migrations/`, no modificar
`src/services/documentos.service.ts` ni `src/services/content-assets.service.ts`.

---

### Task 1: Interruptor «Global» en el formulario

**Files:**
- Modify: `src/components/documentos/DocumentoForm.tsx` (interface `DocumentoFormFields:53-62`,
  `defaultValues:170-179`, `reset:198-216`, `useWatch:183-185`, `submit:271-294`,
  campo Sedes `441-459`)
- Test: `src/__tests__/components/DocumentoForm.test.tsx`

**Comportamiento actual:** el `MultiSelect` de «Sedes» (línea 441) se precarga con
`defaultSedeIds` (la sede activa). Vaciarlo es la única vía —no descubrible— para crear un
documento global; su `allLabel="Sin sede (global)"` solo se ve como texto del botón cuando ya está
vacío.

**Comportamiento esperado:** un bloque con `Switch` **Global** encima del campo «Sedes» (mismo
marcado que `src/components/ejercicios/EjercicioForm.tsx:200-212`, texto «Global» + hint
«Visible en todas las sedes del club»). Con el interruptor activo, el campo «Sedes» **no se
renderiza** y el envío lleva `sedeIds: []`.

**Invariantes:**
- Al **crear**: `esGlobal` arranca en `false` (se mantiene la preselección de sede actual).
- Al **editar**: `esGlobal` arranca en `true` si y solo si el documento no tiene ninguna sede,
  es decir `initialValue.sedeIds.length === 0 && !initialValue.sedeId` — la misma condición que ya
  usa el `reset` de la línea 201-207 para dejar `sedeIds: []`.
- Activar el interruptor hace `setValue("sedeIds", [])`. Desactivarlo **no** restaura sedes: deja
  el selector vacío para que el usuario elija (evita reintroducir sedes que el usuario quitó).
- `esGlobal` **no** entra en `DocumentoFormSubmit` ni en ningún schema Zod.

**Step 1: Escribe los tests que fallan** en `src/__tests__/components/DocumentoForm.test.tsx`
(reutiliza `globalDocumento`, ya definido en las líneas 46-67, y el helper `getField`; los mocks de
`useSedesLookup` / `useEquiposLookup` / `useEntrenadoresLookupBySedes` de las líneas 13-37 ya
existen — el de sedes devuelve `Sede Central` con id `11111111-1111-4111-8111-111111111111`).

```tsx
it("al activar Global oculta el selector de sedes y envía sedeIds vacío", async () => {
  const onSubmit = vi.fn();
  const { baseElement } = render(
    <DocumentoForm
      open
      onOpenChange={vi.fn()}
      title="Nuevo documento"
      defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
      onSubmit={onSubmit}
    />,
  );

  expect(await screen.findByRole("button", { name: /Sede Central/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("switch", { name: /global/i }));

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Sede Central/i })).not.toBeInTheDocument(),
  );

  fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Documento Test" } });
  const file = new File(["contenido"], "documento.pdf", { type: "application/pdf" });
  fireEvent.change(baseElement.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [file] },
  });
  fireEvent.click(screen.getByRole("button", { name: /subir documento/i }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ sedeIds: [], equipoIds: [] });
});

it("marca Global al editar un documento sin sedes aunque haya sede activa", async () => {
  render(
    <DocumentoForm
      open
      onOpenChange={vi.fn()}
      title="Editar documento"
      initialValue={globalDocumento}
      defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
      onSubmit={vi.fn()}
    />,
  );

  await waitFor(() =>
    expect(screen.getByRole("switch", { name: /global/i })).toBeChecked(),
  );
  expect(screen.queryByRole("button", { name: /Sede Central/i })).not.toBeInTheDocument();
});

it("no marca Global al editar un documento con sede asignada", async () => {
  render(
    <DocumentoForm
      open
      onOpenChange={vi.fn()}
      title="Editar documento"
      initialValue={{
        ...globalDocumento,
        sedeId: "11111111-1111-4111-8111-111111111111",
        sedeIds: ["11111111-1111-4111-8111-111111111111"],
      }}
      defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
      onSubmit={vi.fn()}
    />,
  );

  await waitFor(() =>
    expect(screen.getByRole("switch", { name: /global/i })).not.toBeChecked(),
  );
  expect(await screen.findByRole("button", { name: /Sede Central/i })).toBeInTheDocument();
});
```

**Step 2: Ejecuta y confirma que fallan** — Run:
`npm test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: FAIL.

**Step 3: Implementación mínima en `DocumentoForm.tsx`**
1. `import { Switch } from "@/components/ui/switch";` junto a los demás imports de `ui`.
2. Añade `esGlobal?: boolean;` a `DocumentoFormFields` (línea 53-62). **No** toques
   `DocumentoFormSubmit` (línea 34-44) ni `src/schemas/documento.schema.ts`.
3. `defaultValues`: `esGlobal: false`.
4. En el `reset` del `useEffect` (línea 198):
   `esGlobal: initialValue ? initialValue.sedeIds.length === 0 && !initialValue.sedeId : false`.
5. Junto a los `useWatch` existentes (línea 183-185):
   `const esGlobal = useWatch({ control, name: "esGlobal" }) ?? false;`
6. Renderiza el bloque del `Switch` **antes** del `FormField` de «Sedes» (línea 441), envuelto en
   `Controller name="esGlobal"`, con
   `onCheckedChange={(checked) => { field.onChange(checked); if (checked) { setValue("sedeIds", []); setValue("equipoIds", []); } }}`.
   Añade `aria-label="Global"` al `Switch` para que `getByRole("switch", { name: /global/i })`
   lo encuentre.
7. Envuelve el `FormField` de «Sedes» (441-459) en `{!esGlobal && ( … )}`.
8. En `submit` (línea 283-293), fuerza el invariante:
   `sedeIds: esGlobal ? [] : (values.sedeIds ?? [])`.

**Step 4: Ejecuta y confirma que pasan** — Run:
`npm test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: PASS (los 3 nuevos
más los 14 existentes; los tests de payload de las líneas 223 y 290 deben seguir verdes sin
cambios, porque `DocumentoFormSubmit` no ha cambiado).

---

### Task 2: Campos dependientes coherentes cuando el documento es global

**Files:**
- Modify: `src/components/documentos/DocumentoForm.tsx` (`equiposQuery`/`entrenadoresQuery`
  líneas 187-188, campo Equipos 461-486, bloque de visibilidad 488-543)
- Test: `src/__tests__/components/DocumentoForm.test.tsx`

**Comportamiento actual:** `useEquiposLookup(sedeIds)` y `useEntrenadoresLookupBySedes(sedeIds)`
devuelven `[]` cuando `sedeIds` está vacío (`src/hooks/useEquiposLookup.ts:9-17`,
`src/hooks/useEntrenadoresLookupBySedes.ts:10-18`), y ambos `MultiSelect` quedan **deshabilitados**
con el mensaje «Elige una sede primero» (líneas 480-481 y 535-536). Es decir: hoy, un documento sin
sedes **no puede** asignarse a entrenadores concretos. El hint del checkbox dice «todos los
entrenadores **de las sedes**» (línea 510), que para un global es inexacto.

**Comportamiento esperado:**
- **Equipos:** un documento global no puede acotarse a equipos (los equipos pertenecen a una sede).
  El `FormField` de «Equipos» **no se renderiza** cuando `esGlobal` es `true`, y `equipoIds` queda
  en `[]`.
- **Entrenadores específicos:** sí debe funcionar en un documento global. Cuando `esGlobal` es
  `true`, el lookup se hace con **todas las sedes del workspace**, tomadas de
  `sedesQuery.data` (`useSedesLookup`, ya cargado en la línea 130 para `sedeOptions`).
- **Hint del checkbox** (línea 509-511): con `esGlobal`, «Si se activa, todos los entrenadores del
  club podrán ver este documento.»; sin él, se conserva el texto actual.

**Invariantes:**
- Los `useEffect` de saneo (líneas 240-259) siguen tal cual: al pasar a global, `equipoIds` se
  vacía solo porque el lookup de equipos devuelve `[]`; y `entrenadorIds` se conserva porque los
  entrenadores de todas las sedes son un **superconjunto** de los de la sede previa.
- No cambies la firma de `useEquiposLookup` ni de `useEntrenadoresLookupBySedes`.

**Step 1: Escribe el test que falla** — añade en `DocumentoForm.test.tsx`. Requiere sustituir el
mock plano de `useEntrenadoresLookupBySedes` (líneas 30-37) por uno que registre los `sedeIds`
recibidos, y el de `useSedesLookup` (13-20) por uno con **dos** sedes:

```tsx
// Sustituye el mock de useSedesLookup por dos sedes:
vi.mock("@/hooks/useSedesLookup", () => ({
  useSedesLookup: () => ({
    data: [
      { id: "11111111-1111-4111-8111-111111111111", nombre: "Sede Central" },
      { id: "22222222-2222-4222-8222-222222222222", nombre: "Sede Norte" },
    ],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

const entrenadoresLookupCalls: string[][] = [];
vi.mock("@/hooks/useEntrenadoresLookupBySedes", () => ({
  useEntrenadoresLookupBySedes: (sedeIds: string[]) => {
    entrenadoresLookupCalls.push(sedeIds);
    return { data: [], loading: false, errorMessage: null, refetch: vi.fn() };
  },
}));
```

```tsx
it("con Global consulta los entrenadores de todas las sedes y oculta los equipos", async () => {
  entrenadoresLookupCalls.length = 0;
  render(
    <DocumentoForm
      open
      onOpenChange={vi.fn()}
      title="Nuevo documento"
      defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
      onSubmit={vi.fn()}
    />,
  );

  fireEvent.click(await screen.findByRole("switch", { name: /global/i }));

  await waitFor(() =>
    expect(entrenadoresLookupCalls.at(-1)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]),
  );
  expect(screen.queryByText(/^Equipos$/)).not.toBeInTheDocument();
  expect(
    screen.getByText(/todos los entrenadores del club podrán ver este documento/i),
  ).toBeInTheDocument();
});
```

**Nota para el executor:** al cambiar los mocks compartidos, revisa que los tests existentes que
buscan `/Sede Central/i` sigan pasando (el `MultiSelect` muestra el nombre de la sede
seleccionada, no la lista completa). Si alguno se vuelve ambiguo, acota la consulta con
`getByRole("button", { name: ... })`; **no** relajes las aserciones existentes.

**Step 2: Ejecuta y confirma que falla** — Run:
`npm test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: FAIL.

**Step 3: Implementación mínima**
1. `const allSedeIds = useMemo(() => (sedesQuery.data ?? []).map((s) => s.id), [sedesQuery.data]);`
   junto a `sedeOptions` (línea 220).
2. `const entrenadorLookupSedeIds = esGlobal ? allSedeIds : sedeIds;` y pasa esa variable a
   `useEntrenadoresLookupBySedes(...)` (línea 187). **`useEquiposLookup` sigue recibiendo
   `sedeIds`** (que con global es `[]`, así que devuelve `[]` y el saneo limpia `equipoIds`).
3. Envuelve el `FormField` de «Equipos» (461-486) en `{!esGlobal && ( … )}`.
4. El hint del checkbox (509-511) pasa a ser condicional con `esGlobal`.
5. En el `MultiSelect` de entrenadores (528-538), la condición de `disabled` y `emptyMessage`
   usa `entrenadorLookupSedeIds.length === 0` en lugar de `sedeIds.length === 0`; ídem el `hint`
   del `FormField` (518-522).

**Step 4: Ejecuta y confirma que pasa** — Run:
`npm test -- --run src/__tests__/components/DocumentoForm.test.tsx` · Expected: PASS (toda la suite
del archivo).

---

### Task 3: La lista identifica los documentos globales

**Files:**
- Modify: `src/components/documentos/DocumentoProviderList.tsx` (`getAssociationsLabel:88-92`,
  tipo `DocumentoAssetAssociations:10-14`, celda `146-160`)
- Modify: `src/components/documentos/DocumentosListView.tsx` (`associationsByAssetId:83-118`)
- Test: `src/__tests__/components/DocumentosListView.test.tsx`

**Comportamiento actual:** `associationsByAssetId` (ListView 105-115) calcula
`sedes: documentSedeIds.map(...)`, que para un documento global es `[]`; `getAssociationsLabel`
(ProviderList 88-92) devuelve entonces **«Sin asociaciones configuradas»**. Un documento global se
presenta como si estuviera mal configurado, y el usuario no tiene forma de distinguirlo.

**Comportamiento esperado:** un documento sin sedes ni equipos se etiqueta
**«Todas las sedes (global)»**. Un documento con sedes concretas conserva la etiqueta actual.

**Invariantes:**
- La condición de «global» en la UI es la misma que en el servicio: **sin sedes** (`sedes: []`).
  No inventes otra fuente de verdad.
- `DocumentoAssetAssociations` gana `esGlobal: boolean`; se calcula en el ListView, no en la tabla.
- No cambies el orden ni el resto de columnas.

**Step 1: Escribe el test que falla** en `src/__tests__/components/DocumentosListView.test.tsx`
(sigue el patrón de mocks ya presente en ese archivo): un documento con `sedeIds: []` y
`sedeId: null` cuyo `contentAssetId` esté en el catálogo debe renderizar
`Todas las sedes (global)` y **no** `Sin asociaciones configuradas`.

```tsx
expect(await screen.findByText(/Todas las sedes \(global\)/i)).toBeInTheDocument();
expect(screen.queryByText(/Sin asociaciones configuradas/i)).not.toBeInTheDocument();
```

**Step 2: Ejecuta y confirma que falla** — Run:
`npm test -- --run src/__tests__/components/DocumentosListView.test.tsx` · Expected: FAIL.

**Step 3: Implementación mínima**
1. `DocumentoProviderList.tsx`: añade `esGlobal: boolean` a `DocumentoAssetAssociations` (10-14) y,
   en `getAssociationsLabel` (88-92), devuelve `"Todas las sedes (global)"` cuando
   `associations.esGlobal && values.length === 0`, antes del caso de lista vacía.
2. `DocumentosListView.tsx`: en el objeto `result[asset.id]` (111-115) añade
   `esGlobal: documentSedeIds.length === 0`.

**Step 4: Ejecuta y confirma que pasa** — Run:
`npm test -- --run src/__tests__/components/DocumentosListView.test.tsx` · Expected: PASS.

---

### Task 4: E2E — el documento global se ve en dos sedes distintas

**Files:**
- Modify: `e2e/documentos-multifuente.spec.ts`
- Modify (si hace falta un fixture nuevo): `e2e/fixtures/documentos.ts`

**Comportamiento esperado:** un gestor crea un vídeo de YouTube con el interruptor **Global**
activado desde la sede A; al cambiar a la sede B del **mismo workspace**, el documento aparece en
la lista con la etiqueta «Todas las sedes (global)».

**Pasos:**
1. Revisa cómo el spec actual crea altas de YouTube (test de la línea 100,
   «el alta de YouTube y Drive persiste activos del workspace…») y cómo se cambia de sede activa
   (busca el selector de sede en `e2e/support/`). **Reutiliza** esos helpers; no dupliques lógica
   de login (`e2e/support/auth.ts`).
2. Si el workspace de pruebas solo tiene una sede, crea la segunda con el fixture existente antes
   del caso, y límpiala al final igual que hacen los demás tests del archivo.
3. Añade **un** `test("un documento global se ve desde todas las sedes del workspace", …)` que:
   abra el alta de YouTube, active el `Switch` **Global**, guarde, y compruebe el título en la
   lista **con la sede A activa y con la sede B activa**.

**Comando:** `npm run test:e2e -- documentos-multifuente` · Expected: PASS.

**Si el entorno E2E no permite crear una segunda sede**, no fuerces el caso: deja el test con
`test.skip` documentando el motivo en un comentario y **avisa en el resumen final** para que la
verificación se haga con el cruce BD↔UI del `verifier` en su lugar.

---

### Task 5 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md` (si el módulo Documentos describe el alcance por sede)
- Modify: `docs/design-guides/frontend_styleguide.md` (solo si procede, ver abajo)

**Pasos:**
1. Añade y marca como `[x]` la entrada del backlog: «Documentos globales del workspace: interruptor
   Global en el alta/edición y etiqueta en la lista».
2. En `docs/crud-audit.md`, deja constancia de la regla de negocio:
   **un documento es global cuando `sede_id IS NULL` y no tiene filas en `documento_sedes`; se
   muestra en todas las sedes del workspace.**
3. En `frontend_styleguide.md`, documenta la convención solo si no está ya recogida: *el alcance
   «global» de una entidad con sedes se expresa con un `Switch` **Global** que oculta el selector
   de sedes (patrón compartido por `EjercicioForm` y `DocumentoForm`)*.
4. **No** añadas nada a `data_styleguide.md`: la capa de datos no cambia.

**Cerrar = actualizar la doc.**

**Task 5 — hecha (20/08/2026):** actualizados `docs/backlog.md` (B11-6, `[x]`),
`docs/crud-audit.md` (regla de negocio de documento global en la sección 7. Documentos) y
`docs/design-guides/frontend_styleguide.md` (convención del `Switch` Global en «Formularios»).
`docs/design-guides/data_styleguide.md` no se tocó.
