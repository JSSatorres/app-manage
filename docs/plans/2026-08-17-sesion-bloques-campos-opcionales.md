> **Superado por `docs/plans/2026-08-20-bloques-contenido-opcional.md`.** Este plan nunca se
> ejecutó (no existe la migración `20260817100000`) y su alcance —título, duración y "cero
> bloques" también opcionales— contradice lo acordado el 20/08/2026: título y duración siguen
> siendo obligatorios, y sigue haciendo falta al menos un bloque para guardar la sesión. No lo
> ejecutes ni lo mezcles.

# Bloques de sesión totalmente opcionales — Implementation Plan

**Goal:** Que los bloques de una sesión sean 100 % complementarios: se puede guardar una sesión sin
bloques, y un bloque puede quedar sin título, sin duración, sin ejercicio y sin recurso.

**Architecture:** El bloqueo actual está triplicado — gate manual en `SesionForm`, mensajes de
obligatoriedad en `SesionBloquesEditor`, y `NOT NULL` + validaciones estrictas en la tabla
`sesion_bloques` y en la RPC `replace_sesion_bloques`. Se relajan las tres capas en el mismo orden
de dependencia (lib → tipos/schema → servicio → UI → migración), normalizando "vacío" a `null` en
el borde del formulario para no romper los `CHECK` de longitud/positividad que siguen vigentes
cuando el valor **sí** existe.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Zod · React Hook Form · Supabase (PostgreSQL,
RPC `security definer`) · Vitest + jsdom · Playwright.

## Perfil de verificación

- Nivel: **full**
- Motivo: incluye migración de esquema (`drop not null`) y reescritura de una función
  `security definer` que es el único camino de escritura de `public.sesion_bloques`; afecta
  persistencia y multi-tenant (validación de workspace del ejercicio).
- Comandos: `npm run lint` · `npx tsc --noEmit` · `npm test -- --run` · `npm run build` · consultas
  de solo lectura contra el remoto para confirmar nullabilidad y la firma de la RPC.
- Evidencias esperadas: estático limpio; suite unitaria verde con los nuevos casos "todo vacío";
  `information_schema.columns` mostrando `is_nullable = YES` en `titulo`, `duracion_minutos` y
  `ejercicio_id`; guardado real de una sesión con un bloque vacío y con cero bloques.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Comportamiento actual (descubierto)

1. `SesionForm.tsx:164-187` — `getBloquesReplaceInput` devuelve `null` si hay 0 bloques o si algún
   bloque no tiene título, duración entera positiva y `ejercicioId`.
2. `SesionForm.tsx:400-406` — si devuelve `null`, `return` anticipado: **no se guarda ni la sesión**,
   y se muestra «Completa al menos un bloque antes de guardar.».
3. `SesionBloquesEditor.tsx:35-44,161-165,184-188,220-222` — mensajes «El título es obligatorio.»,
   «La duración debe ser positiva.», «Selecciona un ejercicio.».
4. `SesionBloquesEditor.tsx:77,144` — no se puede eliminar el último bloque.
5. `SesionForm.tsx:423` — `duracionEstimada` de la sesión se **sobrescribe siempre** con la suma de
   los bloques, ignorando el campo «Duración (min)» del formulario y la duración calculada por franja.
6. Tabla `sesion_bloques`: `titulo`, `duracion_minutos`, `ejercicio_id` son `NOT NULL`; la RPC
   rechaza array vacío y exige `jsonb_typeof` `string`/`number` en esos tres campos.
7. `documento_id` (Recurso) **ya** es opcional en todas las capas — no se toca su contrato.

## Comportamiento esperado

- Guardar una sesión con **cero** bloques funciona (y en edición borra los bloques existentes).
- Un bloque puede persistir con `titulo = null`, `duracion_minutos = null`, `ejercicio_id = null`,
  `documento_id = null`.
- Ningún mensaje de obligatoriedad en la sección Bloques. Se conserva **solo** el error real de
  integridad: «El ejercicio del bloque N no está disponible en este workspace…» (se dispara solo
  cuando el usuario **sí** eligió un ejercicio, y la RPC lo valida igual).
- El botón Guardar nunca se bloquea por el estado de los bloques.

## Decisiones (contrato — no cambiar durante la ejecución)

- **D1** — Todo campo de bloque es opcional. `orden` sigue siendo obligatorio y continuo desde 1
  (es estructural: `unique (sesion_id, orden)`).
- **D2** — Un bloque **completamente vacío** (sin título, sin duración, sin ejercicio y sin
  documento) **no se persiste**: se descarta al construir el payload y `orden` se renumera 1..N
  sobre los supervivientes. «No hace falta nada» ⇒ si no hay nada, no se guarda fila.
- **D3** — Normalización en el borde del formulario: `titulo.trim() === ""` → `null`; duración no
  entera o `<= 0` → `null`. Así los `CHECK` existentes (`char_length between 1 and 120`,
  `duracion_minutos > 0`) siguen protegiendo los valores que **sí** llegan.
- **D4** — `sesiones.duracion_estimada` se deriva de los bloques **solo si la suma es > 0**. Si es
  0, prevalece el campo «Duración (min)» del formulario (sesión única/edición) o la duración
  calculada por franja (creación múltiple). Lo mismo en la RPC.
- **D5** — En BD solo se quita `NOT NULL`. Los `CHECK` se conservan tal cual: en PostgreSQL un
  `CHECK` que evalúa a `NULL` **pasa**, así que no hay que recrearlos.
- **D6** — Runner de ejecución: un bloque sin duración vale 0 ms (se avanza con «Saltar»); las
  etiquetas sin título muestran `Bloque {orden}`. No se cambia el contrato de
  `src/lib/sesionRunnerState.ts` (`SesionRunnerBlock.duracionMinutos` sigue siendo `number`): la
  conversión `?? 0` se hace en el borde, en `SesionEjecutarView`.

## Decisiones prohibidas

- **No** tocar `public.sesion_detalle` ni el flujo legado de importación.
- **No** tocar policies, `grant`/`revoke` ni RLS de `sesion_bloques` (la migración solo altera
  columnas y el cuerpo de la función; `create or replace function` conserva la ACL).
- **No** ejecutar `npx supabase db push` (el historial de migraciones está desincronizado con el
  remoto: se aplica SQL quirúrgico y luego `migration repair`).
- **No** editar a mano `src/types/database.types.ts`.
- **No** refactorizar nada ajeno a los bloques (protocolo §3.4).

## Nota de encoding (importante)

`src/schemas/sesion-bloques.schema.ts`, `src/__tests__/schemas/sesion-bloques.schema.test.ts` y
`src/__tests__/lib/sesionBloques.test.ts` tienen **mojibake mezclado** (`"invÃ¡lido"`,
`"Ã³rdenes"`, `"duraciÃ³n"`) junto a texto correcto (`"Activación con balón"`). Al editar esos
archivos, escribe los acentos **correctos en UTF-8** en las líneas que toques y no arrastres el
mojibake. No hagas una pasada global de reencoding: solo las líneas de la tarea. **LF siempre.**

---

### Task 1: `sumarDuracionBloques` tolera duraciones nulas + etiqueta de bloque

**Files:**
- Modify: `src/lib/sesionBloques.ts:11-13` (firma de `sumarDuracionBloques`), añadir
  `getBloqueEtiqueta`
- Modify: `src/types/sesion-bloques.ts:37-41` (`SesionBloqueSignatureInput.duracionMinutos`)
- Test: `src/__tests__/lib/sesionBloques.test.ts`

**Step 1: Escribe los tests que fallan** — añade a
`src/__tests__/lib/sesionBloques.test.ts`:

```ts
describe("sumarDuracionBloques", () => {
  it("ignora las duraciones nulas", () => {
    expect(
      sumarDuracionBloques([
        { duracionMinutos: 10 },
        { duracionMinutos: null },
        { duracionMinutos: 5 },
      ]),
    ).toBe(15);
  });

  it("devuelve 0 cuando ningún bloque tiene duración", () => {
    expect(sumarDuracionBloques([{ duracionMinutos: null }])).toBe(0);
  });
});

describe("getBloqueEtiqueta", () => {
  it("usa el título cuando existe", () => {
    expect(getBloqueEtiqueta({ titulo: "  Calentamiento  ", orden: 2 })).toBe("Calentamiento");
  });

  it("cae a «Bloque N» cuando el título está vacío o es nulo", () => {
    expect(getBloqueEtiqueta({ titulo: null, orden: 3 })).toBe("Bloque 3");
    expect(getBloqueEtiqueta({ titulo: "   ", orden: 1 })).toBe("Bloque 1");
  });
});
```

Importa `getBloqueEtiqueta` y `sumarDuracionBloques` desde `@/lib/sesionBloques` en el import de la
línea 2.

**Step 2: Ejecuta y comprueba que falla** — Run:
`npx vitest run src/__tests__/lib/sesionBloques.test.ts` · Expected: FAIL (no existe
`getBloqueEtiqueta`; typecheck de `null` en `sumarDuracionBloques`).

**Step 3: Implementación mínima** en `src/lib/sesionBloques.ts`:
- `sumarDuracionBloques(bloques: readonly { duracionMinutos: number | null }[]): number` sumando
  `bloque.duracionMinutos ?? 0`.
- `getBloqueEtiqueta(bloque: { titulo: string | null; orden: number }): string` → `titulo?.trim()`
  si tiene contenido, si no `` `Bloque ${bloque.orden}` ``.
- En `src/types/sesion-bloques.ts`, `SesionBloqueSignatureInput.duracionMinutos: number | null`
  (`getSesionBloquesSignature` serializa `null` sin cambios: la firma sigue siendo estable).

**Step 4: Verifica** — Run: `npx vitest run src/__tests__/lib/sesionBloques.test.ts` · Expected:
PASS (el test existente «deja inválido el borrador legacy si falta la duración» se ajusta en la
Task 2, cuando el schema deja de exigirla).

Skills: `tdd`, `javascript-testing-patterns`.

---

### Task 2: Relajar tipos y schema Zod de bloques

**Files:**
- Modify: `src/types/sesion-bloques.ts:1-18` (`SesionBloque`, `SesionBloqueReplaceInput`)
- Modify: `src/schemas/sesion-bloques.schema.ts:5-23`
- Test: `src/__tests__/schemas/sesion-bloques.schema.test.ts`
- Test: `src/__tests__/lib/sesionBloques.test.ts:29-35`

**Contrato de tipos resultante:**

```ts
export interface SesionBloque {
  id: string;
  sesionId: string;
  titulo: string | null;
  duracionMinutos: number | null;
  ejercicioId: string | null;
  documentoId: string | null;
  orden: number;
  createdAt: string;
}

export interface SesionBloqueReplaceInput {
  titulo: string | null;
  duracionMinutos: number | null;
  ejercicioId: string | null;
  documentoId: string | null;
  orden: number;
}
```

`SesionBloqueDraft` (líneas 20-27) **no cambia** salvo `titulo: string` → se mantiene `string` (el
input controlado siempre tiene un string; la conversión a `null` ocurre al construir el payload).

**Step 1: Reescribe los tests del schema** — en
`src/__tests__/schemas/sesion-bloques.schema.test.ts`:
- Sustituye `it("exige un ejercicio", …)` por
  `it("admite ejercicio nulo", () => expect(sesionBloqueSchema.safeParse({ ...bloqueValido, ejercicioId: null }).success).toBe(true))`.
- Añade
  `it("admite un bloque sin título, sin duración y sin ejercicio")` con
  `{ titulo: null, duracionMinutos: null, ejercicioId: null, documentoId: null, orden: 1 }` →
  `success === true`.
- En `it.each([0, -1, 10.5])` mantén el rechazo (una duración **presente** sigue siendo entera y
  positiva).
- Cambia `it("exige un bloque y órdenes continuos desde 1")` por
  `it("admite lista vacía y exige órdenes continuos desde 1")`:
  `expect(sesionBloquesSchema.safeParse([]).success).toBe(true)` y se conserva el caso de orden
  discontinuo (`orden: 3` en la segunda posición) → `false`. Escribe «órdenes» con acento correcto.
- En `src/__tests__/lib/sesionBloques.test.ts:29-35`, cambia el test a
  `it("mantiene válido el borrador legacy aunque falte la duración")` con
  `expect(sesionBloquesSchema.safeParse(bloques).success).toBe(true)`. Escribe «inválido»/«duración»
  con acento correcto si tocas esas cadenas.

**Step 2: Ejecuta y comprueba que falla** — Run:
`npx vitest run src/__tests__/schemas/sesion-bloques.schema.test.ts src/__tests__/lib/sesionBloques.test.ts`
· Expected: FAIL.

**Step 3: Implementación mínima** en `src/schemas/sesion-bloques.schema.ts`:
- `titulo: z.string().trim().min(1, "El título no puede estar vacío.").max(120).nullable()`
- `duracionMinutos: z.number().int(…).positive(…).nullable()`
- `ejercicioId: idSchema.nullable()`
- `documentoId: idSchema.nullable()` (sin cambios)
- `orden` sin cambios
- Quita `.min(1, "Añade al menos un bloque.")` del array; conserva el `superRefine` de orden
  continuo.
- Reescribe los mensajes tocados con acentos UTF-8 correctos (ver nota de encoding).

**Step 4: Verifica** — Run:
`npx vitest run src/__tests__/schemas/sesion-bloques.schema.test.ts src/__tests__/lib/sesionBloques.test.ts`
· Expected: PASS.

Skills: `tdd`, `javascript-testing-patterns`.

---

### Task 3: Servicio de bloques con columnas nullable

**Files:**
- Modify: `src/services/sesion-bloques.service.ts:15-24` (`SesionBloqueRow`), `:40-51`
  (`mapSesionBloque`)
- Test: `src/__tests__/services/sesion-bloques.service.test.ts`

**Step 1: Escribe el test que falla** — añade al `describe` existente un caso:

```ts
it("mapea bloques sin título, duración ni ejercicio", async () => {
  const { from } = createSupabaseMock({
    sesion_bloques: {
      data: [
        {
          id: "bloque-1",
          sesion_id: "sesion-1",
          titulo: null,
          duracion_minutos: null,
          ejercicio_id: null,
          documento_id: null,
          orden: 1,
          created_at: "2026-08-17T09:00:00Z",
        },
      ],
      error: null,
    },
  });
  vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

  const result = await fetchSesionBloques("sesion-1");

  expect(result.data).toMatchObject({
    source: "blocks",
    isExecutable: true,
    bloques: [{ id: "bloque-1", titulo: null, duracionMinutos: null, ejercicioId: null }],
  });
});
```

Y un caso de payload nulo en el reemplazo:

```ts
it("envía nulos en el payload de reemplazo", async () => {
  const { from, rpc, rpcCalls } = createSupabaseMock({}, { data: [], error: null });
  vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

  await replaceSesionBloques("sesion-1", [
    { titulo: null, duracionMinutos: null, ejercicioId: null, documentoId: null, orden: 1 },
  ]);

  expect(rpcCalls[0]?.args).toEqual({
    p_sesion_id: "sesion-1",
    p_bloques: [
      { titulo: null, duracion_minutos: null, ejercicio_id: null, documento_id: null, orden: 1 },
    ],
  });
});
```

**Step 2: Ejecuta y comprueba que falla** — Run:
`npx vitest run src/__tests__/services/sesion-bloques.service.test.ts` · Expected: FAIL (typecheck /
assert).

**Step 3: Implementación mínima** — en `SesionBloqueRow`: `titulo: string | null`,
`duracion_minutos: number | null`, `ejercicio_id: string | null`. `mapSesionBloque` sigue siendo un
paso directo (sin `??`, los nulos se propagan). El `map` del payload de `replaceSesionBloques`
(líneas 100-106) no cambia: ya es 1:1.

**Step 4: Verifica** — Run: `npx vitest run src/__tests__/services/sesion-bloques.service.test.ts`
· Expected: PASS.

Skills: `tdd`, `javascript-testing-patterns`.

---

### Task 4: `SesionBloquesEditor` sin obligatoriedad

**Files:**
- Modify: `src/components/sesiones/SesionBloquesEditor.tsx`
- Test: `src/__tests__/components/SesionBloquesEditor.test.tsx`

**Cambios exactos:**
1. Elimina `getBlockErrors` (líneas 35-44) y todos los bloques de render de error (161-165,
   184-188, 220-222) junto con los `aria-invalid` / `aria-describedby` que los referencian.
2. Elimina la prop `showErrors` de `SesionBloquesEditorProps` (línea 25) y de la desestructuración
   (línea 51).
3. `removeBlock` (76-79): quita la guarda `if (bloques.length <= 1) return;`. En el botón Eliminar
   (línea 144), `disabled={disabled}`.
4. Empty state (105-107): «Los bloques son opcionales. Añade uno si quieres estructurar la sesión.»
5. Etiquetas: `Título del bloque N (opcional)`, `Duración (min) del bloque N (opcional)`,
   `Ejercicio del bloque N (opcional)`.
6. Select de ejercicio (194-219): el texto del item/placeholder `none` pasa a
   **«Sin ejercicio asociado»** (mismo patrón que «Sin recurso asociado» del
   `SesionBloqueResourcePicker`). El `aria-label` del trigger sigue siendo
   `Ejercicio del bloque ${blockNumber}` (no lo cambies: hay tests y E2E que lo usan).

**Step 1: Reescribe los tests** — en `src/__tests__/components/SesionBloquesEditor.test.tsx`,
sustituye `it("añade un bloque y muestra mensajes semánticos para sus campos obligatorios")` por:

```ts
it("añade un bloque sin exigir ningún campo", async () => {
  // render con bloques=[] y onChange espía
  // click en "Añadir bloque"
  expect(screen.queryByText("El título es obligatorio.")).toBeNull();
  expect(screen.queryByText("La duración debe ser positiva.")).toBeNull();
  expect(screen.queryByText("Selecciona un ejercicio.")).toBeNull();
});

it("permite eliminar el último bloque", async () => {
  // render con un único bloque
  await userEvent.click(screen.getByRole("button", { name: "Eliminar bloque 1" }));
  expect(onChange).toHaveBeenCalledWith([]);
});
```

Adapta el `render` y los helpers al patrón ya usado en el archivo (no inventes utilidades nuevas).
Quita cualquier paso de la prop `showErrors` en los renders existentes.

**Step 2: Ejecuta y comprueba que falla** — Run:
`npx vitest run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: FAIL.

**Step 3: Aplica los cambios del componente** (lista de arriba).

**Step 4: Verifica** — Run: `npx vitest run src/__tests__/components/SesionBloquesEditor.test.tsx`
· Expected: PASS.

Skills: `tdd`, `javascript-testing-patterns`, `react-state-management` (solo la parte de props/estado
controlado por el padre).

---

### Task 5: `SesionForm` guarda siempre; bloques complementarios

**Files:**
- Modify: `src/components/sesiones/SesionForm.tsx:164-187` (`getBloquesReplaceInput`), `:400-423`
  (submit), `:817-832` (render del editor y «Duración total»), y el estado `showBloquesErrors`
- Test: `src/__tests__/components/SesionForm.test.tsx:404-432` y siguientes

**Contrato nuevo de `getBloquesReplaceInput`** (función pura, sigue siendo exportable/local igual
que hoy):

```ts
function getBloquesReplaceInput(bloques: SesionBloqueDraft[]): SesionBloqueReplaceInput[] {
  return bloques
    .map((bloque) => {
      const titulo = bloque.titulo.trim() || null;
      const duracionMinutos =
        Number.isInteger(bloque.duracionMinutos) && (bloque.duracionMinutos ?? 0) > 0
          ? bloque.duracionMinutos
          : null;
      return { titulo, duracionMinutos, ejercicioId: bloque.ejercicioId ?? null,
               documentoId: bloque.documentoId, orden: 0 };
    })
    .filter((b) => b.titulo !== null || b.duracionMinutos !== null ||
                   b.ejercicioId !== null || b.documentoId !== null)   // D2
    .map((b, index) => ({ ...b, orden: index + 1 }));                  // orden continuo
}
```

Nunca devuelve `null`. Ajusta el tipo de retorno a `SesionBloqueReplaceInput[]`.

**Cambios en `submit` (líneas 400-423):**
1. Borra el bloque `if (!bloquesInput) { … return; }` y el mensaje
   «Completa al menos un bloque antes de guardar.».
2. **Conserva** la validación de ejercicio fuera del workspace (407-422) tal cual.
3. Sustituye `const duracionEstimada = sumarDuracionBloques(bloquesInput);` por:
   ```ts
   const duracionBloques = sumarDuracionBloques(bloquesInput);
   const duracionEstimada = duracionBloques > 0 ? duracionBloques : values.duracionEstimada ?? null;
   ```
4. En la rama de creación múltiple (líneas 493-498), el `.map` solo debe sobrescribir
   `duracionEstimada` cuando `duracionBloques > 0`; si es 0, respeta la duración que
   `buildRepeticiones` calcula por franja (**D4**):
   ```ts
   buildRepeticiones(base, franjas, fechaInicioRep, fechaFinRep).map((sesion) =>
     duracionBloques > 0 ? { ...sesion, duracionEstimada: duracionBloques } : sesion,
   )
   ```
5. Elimina el estado `showBloquesErrors` y su `setShowBloquesErrors` (búscalo con Grep; se usa en el
   gate borrado, en la validación de ejercicio no disponible y en la prop del editor). En la
   validación de ejercicio no disponible basta con `setBloquesError(...)`.
6. Render (817-832): quita la prop `showErrors`; simplifica el párrafo de duración total a
   `sumarDuracionBloques(bloques)` (ya acepta nulos) y muéstralo solo si `bloques.length > 0`.

**Step 1: Reescribe los tests** — en `src/__tests__/components/SesionForm.test.tsx`:
- Reemplaza `it("modo edición: muestra el borrador legacy e impide guardar si falta la duración")`
  por `it("modo edición: guarda el borrador legacy aunque falte la duración")`: espera que
  `onSubmit` **sí** se llame y que **no** aparezca `/completa al menos un bloque/i`.
- Añade `it("guarda una sesión sin ningún bloque")`: elimina todos los bloques (o parte de un
  estado inicial vacío), envía, y comprueba que `onSubmit` se llamó y que
  `replaceSesionBloques` recibió `[]`.
- Añade `it("descarta los bloques completamente vacíos")`: dos bloques, uno solo con título y otro
  intacto → el payload de `replaceSesionBloques` tiene **un** elemento con `orden: 1`.
- Añade `it("respeta la duración del formulario cuando ningún bloque tiene duración")`: campo
  «Duración (min)» = 60, bloques sin duración → `onSubmit` recibe `duracionEstimada: 60`.
- **Conserva sin cambios** `it("modo edición: impide guardar un ejercicio legacy fuera del workspace")`.

Reutiliza los mocks/helpers ya presentes en el archivo (`replaceSesionBloques` está mockeado allí;
no montes infraestructura nueva).

**Step 2: Ejecuta y comprueba que falla** — Run:
`npx vitest run src/__tests__/components/SesionForm.test.tsx` · Expected: FAIL.

**Step 3: Aplica los cambios del componente.**

**Step 4: Verifica** — Run: `npx vitest run src/__tests__/components/SesionForm.test.tsx` ·
Expected: PASS.

Skills: `tdd`, `javascript-testing-patterns`, `react-state-management`.

---

### Task 6: Runner de ejecución tolerante a bloques sin datos

**Files:**
- Modify: `src/components/sesiones/SesionEjecutarView.tsx:38,58,64,70,75,80,85,108,112,124,125,129,132,139`
- Test: `src/__tests__/components/` (si ya existe un test de esta vista, extiéndelo; si no, **no**
  crees uno nuevo: la cobertura de esta vista se valida en el E2E `e2e/sesiones-ejecucion.spec.ts`)

**Cambios exactos (D6):**
1. Línea 38: `blocks: bloques.map(({ id, duracionMinutos }) => ({ id, duracionMinutos: duracionMinutos ?? 0 }))`.
2. Todas las lecturas de `bloque.titulo` / `viewedBlock.titulo` / `activeBlock.titulo` pasan por
   `getBloqueEtiqueta(bloque)` (importado de `@/lib/sesionBloques`), incluidos los `aria-label`
   (`Previsualizar …`, `Tiempo restante de …`) y el `bloqueTitulo` de `SesionBloqueRecurso`.
3. Línea 125: muestra la duración solo si existe —
   `{viewedBlock?.duracionMinutos != null && <p …>Duración: {viewedBlock.duracionMinutos} min</p>}`.
4. **No** cambies la guarda de la línea 203 (`isExecutable` + `length === 0`): una sesión sin
   bloques sigue mostrando «La sesión no tiene bloques ejecutables…», que ahora es un mensaje
   correcto, no un bloqueo.

**Step 1: Ejecuta el typecheck para localizar los usos** — Run: `npx tsc --noEmit` · Expected: FAIL
con errores de `string | null` en esta vista (esa es la lista de trabajo).

**Step 2: Aplica los cambios.**

**Step 3: Verifica** — Run: `npx tsc --noEmit && npm run lint` · Expected: PASS/limpio.

---

### Task 7: Preparar la migración (SIN aplicarla)

**Files:**
- Create: `supabase/migrations/20260817100000_sesion_bloques_campos_opcionales.sql`

**Reglas:** el archivo debe ser **idempotente** y ejecutable de una sola pasada (se aplicará por
Management API / SQL Editor, **nunca** con `db push`). LF y UTF-8. No incluye policies ni
`grant`/`revoke` de tabla (no cambian).

*Justificación del snippet: es una migración `security definer` que es el único camino de escritura
de la tabla; el SQL forma parte del contrato y debe copiarse literalmente.*

```sql
-- Bloques de sesión completamente opcionales: título, duración y ejercicio pasan a nullable
-- y replace_sesion_bloques acepta lista vacía y valores nulos.
-- Los CHECK existentes se conservan: en PostgreSQL un CHECK que evalúa a NULL pasa.

alter table public.sesion_bloques alter column titulo drop not null;
alter table public.sesion_bloques alter column duracion_minutos drop not null;
alter table public.sesion_bloques alter column ejercicio_id drop not null;

create or replace function public.replace_sesion_bloques(
  p_sesion_id uuid,
  p_bloques jsonb
)
returns setof public.sesion_bloques
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_sede_id uuid;
  v_role text;
  v_item jsonb;
  v_index integer := 0;
  v_titulo text;
  v_duracion integer;
  v_ejercicio_id uuid;
  v_documento_id uuid;
  v_orden integer;
  v_ordenes integer[] := '{}';
  v_ordenes_esperados integer[];
  v_duracion_total bigint := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select sd.workspace_id, sd.id
    into v_workspace_id, v_sede_id
  from public.sesiones s
  join public.equipos e on e.id = s.equipo_id
  join public.sedes sd on sd.id = e.sede_id
  where s.id = p_sesion_id
  for update of s;

  if not found then
    raise exception 'session unavailable';
  end if;

  select wm.role
    into v_role
  from public.workspace_members wm
  where wm.workspace_id = v_workspace_id
    and wm.user_id = v_user_id
  limit 1;

  if v_role is null
    or v_role not in ('superadmin', 'admin', 'gerente_sede', 'entrenador') then
    raise exception 'not authorized to replace session blocks';
  end if;

  if jsonb_typeof(p_bloques) <> 'array' then
    raise exception 'blocks must be an array';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_bloques)
  loop
    v_index := v_index + 1;

    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    if (select count(*) from jsonb_object_keys(v_item)) <> 5
      or exists (
        select 1
        from jsonb_object_keys(v_item) as payload_key(key_name)
        where payload_key.key_name not in (
          'titulo',
          'duracion_minutos',
          'ejercicio_id',
          'documento_id',
          'orden'
        )
      )
      or jsonb_typeof(v_item -> 'titulo') not in ('string', 'null')
      or jsonb_typeof(v_item -> 'duracion_minutos') not in ('number', 'null')
      or jsonb_typeof(v_item -> 'ejercicio_id') not in ('string', 'null')
      or jsonb_typeof(v_item -> 'orden') <> 'number'
      or jsonb_typeof(v_item -> 'documento_id') not in ('string', 'null') then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    v_titulo := nullif(btrim(v_item ->> 'titulo'), '');
    if v_titulo is not null and char_length(v_titulo) not between 1 and 120 then
      raise exception 'invalid block title at position %', v_index;
    end if;

    begin
      v_duracion := (v_item ->> 'duracion_minutos')::integer;
      v_ejercicio_id := (v_item ->> 'ejercicio_id')::uuid;
      v_orden := (v_item ->> 'orden')::integer;
      v_documento_id := (v_item ->> 'documento_id')::uuid;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'invalid block value at position %', v_index;
    end;

    if (v_duracion is not null and v_duracion <= 0) or v_orden < 1 then
      raise exception 'invalid block value at position %', v_index;
    end if;

    if v_ejercicio_id is not null and not exists (
      select 1
      from public.ejercicios e
      where e.id = v_ejercicio_id
        and e.workspace_id = v_workspace_id
    ) then
      raise exception 'exercise outside session workspace at position %', v_index;
    end if;

    if v_documento_id is not null and not exists (
      select 1
      from public.documentos d
      where d.id = v_documento_id
        and d.workspace_id = v_workspace_id
        and (d.sede_id is null or d.sede_id = v_sede_id)
    ) then
      raise exception 'document outside session scope at position %', v_index;
    end if;

    v_ordenes := array_append(v_ordenes, v_orden);
    v_duracion_total := v_duracion_total + coalesce(v_duracion, 0);
  end loop;

  select array_agg(value order by value)
    into v_ordenes
  from unnest(v_ordenes) as orden_entrada(value);

  select array_agg(value order by value)
    into v_ordenes_esperados
  from generate_series(1, jsonb_array_length(p_bloques)) as orden_esperado(value);

  if v_ordenes is distinct from v_ordenes_esperados then
    raise exception 'block orders must be unique and continuous from 1';
  end if;

  if v_duracion_total > 2147483647 then
    raise exception 'total duration exceeds integer range';
  end if;

  delete from public.sesion_bloques
  where sesion_id = p_sesion_id;

  insert into public.sesion_bloques (
    sesion_id,
    titulo,
    duracion_minutos,
    ejercicio_id,
    documento_id,
    orden
  )
  select
    p_sesion_id,
    nullif(btrim(block.titulo), ''),
    block.duracion_minutos,
    block.ejercicio_id,
    block.documento_id,
    block.orden
  from jsonb_to_recordset(p_bloques) as block(
    titulo text,
    duracion_minutos integer,
    ejercicio_id uuid,
    documento_id uuid,
    orden integer
  );

  if v_duracion_total > 0 then
    update public.sesiones
    set duracion_estimada = v_duracion_total::integer
    where id = p_sesion_id;
  end if;

  return query
  select sb.*
  from public.sesion_bloques sb
  where sb.sesion_id = p_sesion_id
  order by sb.orden;
end;
$$;

grant execute on function public.replace_sesion_bloques(uuid, jsonb) to authenticated;
```

**Notas de corrección del SQL (verificadas contra el original):**
- Con `p_bloques = '[]'`, `array_agg` sobre conjunto vacío devuelve `NULL` en **ambos** arrays y
  `NULL is distinct from NULL` es `false` ⇒ no lanza excepción. `jsonb_to_recordset('[]')` inserta 0
  filas. El `delete` previo sí borra los bloques existentes (comportamiento deseado en edición).
- `v_item ->> 'campo'` sobre un JSON `null` devuelve SQL `NULL`, así que los casts a `integer`/`uuid`
  producen `NULL` sin error.
- `duracion_estimada` solo se sobrescribe si el total es > 0 (**D4**).

**Step:** crea el archivo y **para**. No lo ejecutes. No corras `supabase db push`.

---

## Autorización de migración

- Entorno: development (project ref `rgmrqkoudyotkpqgezzv`, rama `main` — única BD, uso de prueba
  confirmado por el propietario el 08/08/2026)
- Estado: **PENDIENTE**
- Decisión: <se rellena con el texto literal del usuario y la fecha Europe/Madrid>
- Comando previsto: ejecución del contenido íntegro de
  `supabase/migrations/20260817100000_sesion_bloques_campos_opcionales.sql` vía Management API
  (`POST https://api.supabase.com/v1/projects/rgmrqkoudyotkpqgezzv/database/query`) o SQL Editor de
  una sesión web autenticada; después
  `npx.cmd supabase migration repair 20260817100000 --status applied --linked`
- Tablas/recursos: `public.sesion_bloques` (columnas `titulo`, `duracion_minutos`, `ejercicio_id`) y
  la función `public.replace_sesion_bloques(uuid, jsonb)`
- Operaciones: 3 × `alter column … drop not null` + `create or replace function`
- Riesgos: `ALTER TABLE` toma `ACCESS EXCLUSIVE` un instante (tabla pequeña, sin reescritura de
  datos); relajar `NOT NULL` es **irreversible sin limpieza** si entre tanto se insertan filas con
  nulos; ningún dato existente se modifica; RLS/policies/grants intactos; no hay Realtime sobre esta
  tabla. `create or replace function` conserva la ACL.
- Rollback/recuperación: `create or replace function` con el cuerpo original de
  `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql` y, tras eliminar o rellenar las
  filas con nulos, `alter table public.sesion_bloques alter column <col> set not null` en las tres
  columnas.

---

### Task 8 (solo con `Estado: AUTORIZADA`): Aplicar la migración y regenerar tipos

**Steps:**
1. Confirma el project ref exacto antes de escribir.
2. Ejecuta el SQL **íntegro** del archivo de la Task 7 (Management API o SQL Editor).
3. Verificación de solo lectura:
   ```sql
   select column_name, is_nullable
   from information_schema.columns
   where table_schema = 'public' and table_name = 'sesion_bloques'
     and column_name in ('titulo','duracion_minutos','ejercicio_id');
   -- esperado: is_nullable = YES en las tres
   ```
   y que la función existe con `prosecdef = true`.
4. `npx.cmd supabase migration repair 20260817100000 --status applied --linked`.
5. Best-effort: `npx.cmd supabase gen types typescript --linked > src/types/database.types.ts`
   (UTF-8 + LF). Si el CLI no puede autenticarse en este contexto, **no** edites el archivo a mano:
   registra el pendiente en el plan y sigue (nada en `src/` importa los tipos de `sesion_bloques`
   desde ese archivo generado; el servicio declara su propia `SesionBloqueRow`).

---

### Task 9 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md` — BLOQUE 2, añade `- [x] **B2-8**` describiendo que los bloques son
  complementarios (nada obligatorio, sesión guardable sin bloques) y matiza la redacción de `B2-1`
  y `B2-2` (ya no hay «duración positiva» obligatoria ni derivación incondicional de
  `duracion_estimada`).
- Modify: `docs/crud-audit.md` — si documenta la validación de bloques de sesión, actualiza el
  estado.
- Modify: `docs/design-guides/frontend_styleguide.md` — en «Runner de sesiones por bloques»,
  documenta que los bloques son opcionales, que un bloque vacío no se persiste (**D2**), que un
  bloque sin duración vale 0 ms en el runner y que las etiquetas caen a `Bloque {orden}`.
- Modify: `docs/design-guides/data_styleguide.md` — si documenta el contrato de
  `replace_sesion_bloques`, refleja que acepta lista vacía y nulos, y que `duracion_estimada` solo
  se deriva cuando la suma es > 0 (**D4**).

**Pasos:** marca la tarea como hecha, deja constancia de las convenciones nuevas y no incluyas
código de producción. **Cerrar = actualizar la doc.**
