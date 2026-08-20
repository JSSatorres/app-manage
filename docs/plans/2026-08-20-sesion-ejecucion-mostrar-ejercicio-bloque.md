# Mostrar el ejercicio del bloque en Ejecutar sesión — Implementation Plan

**Goal:** Que la vista `Ejecutar sesión` muestre el ejercicio asociado a cada bloque (p. ej. `Rondo 4x1 básico`), que hoy se guarda en BD pero se descarta en el mapeo del servicio y nunca se pinta.

**Architecture:** Dos capas. (1) `sesion-bloques.service.ts` ya pide el embed `ejercicios(id,titulo)` en su `SELECT`, pero `SesionBloqueRow` no lo declara y `mapSesionBloque` lo tira: se añade `ejercicioTitulo: string | null` al tipo de dominio `SesionBloque` y se mapea tolerando las tres formas que devuelve PostgREST/RPC (objeto, array, ausente). (2) `SesionEjecutarView` renderiza el nuevo campo en el panel de previsualización, junto a la duración, siguiendo el patrón del recurso (`SesionBloqueRecurso`). Sin migración: la columna `sesion_bloques.ejercicio_id` ya existe y es `not null`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase (PostgREST embeds + RPC `replace_sesion_bloques`) · Vitest + Testing Library · ESLint.

## Perfil de verificación

- Nivel: **standard**
- Motivo: cambio de ruta de **lectura** y de render en UI. No toca esquema, RLS, permisos, pagos ni escritura; el contrato de escritura (`replaceSesionBloques`) queda intacto. Sí afecta a un tipo de dominio compartido (`SesionBloque`) y a un servicio Supabase, por lo que typecheck + suite completa + build son obligatorios.
- Comandos:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts src/__tests__/components/SesionEjecutarView.test.tsx`
  - `npm test -- --run`
  - `npm run build`
- Evidencias esperadas: lint y typecheck sin errores; los dos tests dirigidos en verde incluyendo los casos nuevos de `ejercicioTitulo`; suite completa en verde (sin regresiones en `SesionForm.test.tsx` ni `SesionBloquesEditor.test.tsx`); build de producción compila.

## Incidencias de verificación

<!-- Se rellena durante la ejecución solo para fallos major/critical. -->

---

## Diagnóstico (skill `diagnose`)

**Reproducción aportada por el usuario:** en el formulario de sesión, `Bloque 1` con título `calentamiento`, duración 10 y **Ejercicio del bloque 1 = `Rondo 4x1 básico`**. Tras guardar, `/sesiones/[id]/ejecutar` muestra `1. calentamiento`, `Duración: 10 min`, `Bloque activo: calentamiento`, el cronómetro y `Este bloque no tiene recurso asociado.` — el ejercicio **no aparece en ningún punto de la vista**.

**Bucle de feedback (Fase 1):** determinista y en milisegundos vía Vitest, con dos costuras que cubren cada capa del fallo — `src/__tests__/services/sesion-bloques.service.test.ts` (mapeo) y `src/__tests__/components/SesionEjecutarView.test.tsx` (render). No hace falta navegador.

**Causa raíz confirmada — son dos defectos encadenados, no uno:**

1. **El dato se pide y se tira.** `src/services/sesion-bloques.service.ts:13` ya declara `...,ejercicios(id,titulo),documentos(id,titulo)`, pero `interface SesionBloqueRow` (`:15-24`) **no declara la relación `ejercicios`** y `mapSesionBloque` (`:40-51`) solo copia `row.ejercicio_id → ejercicioId`. El título llega de Supabase y se descarta en el mapeo. `SesionBloque` (`src/types/sesion-bloques.ts:1-10`) no tiene ningún campo para el nombre del ejercicio.
2. **La vista no tiene dónde pintarlo.** `src/components/sesiones/SesionEjecutarView.tsx:121-139` renderiza título del bloque, duración, bloque activo, cronómetro y `SesionBloqueRecurso` (documento). No hay ninguna referencia al ejercicio. `SesionBloqueRecurso.tsx:31-33` es quien emite `Este bloque no tiene recurso asociado.`, y habla **solo del documento** — no del ejercicio.

**Descartado:** el guardado funciona. `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql` inserta `ejercicio_id` (`:197-217`) y valida que el ejercicio pertenezca al workspace (`:155-162`); la columna es `uuid not null references public.ejercicios(id)` (`:8`). `SesionForm.tsx:183` envía `ejercicioId` y `sesion-bloques.service.ts:103` lo traduce a `ejercicio_id`. El formulario de edición sí muestra el ejercicio porque resuelve el título contra su propio lookup (`SesionBloquesEditor.tsx:205-212`), no contra el bloque persistido.

**Invariante que NO se puede romper:** `replace_sesion_bloques` devuelve `select sb.*` (migración `:225-228`), es decir **filas planas sin el embed `ejercicios`**. `replaceSesionBloques` reutiliza `mapSesionBloque`, así que el mapeo **debe tolerar la ausencia de la relación** y devolver `null` en ese caso, nunca lanzar. Es la trampa principal de este plan.

**Decisiones prohibidas:**
- No añadir un `useEjercicios()` a `SesionEjecutarView` para resolver el título por lookup: duplica una consulta que el `SELECT` ya trae y puede fallar según el alcance sede/workspace del lookup.
- No tocar `replace_sesion_bloques` ni crear migraciones. No cambiar `SesionBloqueReplaceInput` ni `SesionBloqueDraft`.
- No cambiar el texto `Este bloque no tiene recurso asociado.` ni la firma de `SesionBloqueRecurso`: se refiere al documento y sigue siendo correcto.
- No tocar la rama `legacy-draft`: `SesionEjecutarView.tsx:203` corta antes con `!bloques.data?.isExecutable`, así que los borradores legados nunca llegan al runner.

---

## Task 1: Propagar el título del ejercicio desde el servicio hasta el tipo de dominio

**Files:**
- Modify: `src/types/sesion-bloques.ts:1-10`
- Modify: `src/services/sesion-bloques.service.ts:15-24,40-51`
- Test: `src/__tests__/services/sesion-bloques.service.test.ts`

**Skills:** `.agents/skills/tdd/SKILL.md` + `.agents/skills/javascript-testing-patterns/SKILL.md` (el proyecto usa Vitest según `docs/design-guides/frontend_styleguide.md`). Lee antes `docs/design-guides/data_styleguide.md` (convención de servicios Supabase, `getSupabaseClient()`, mapeo snake_case → camelCase).

**Contrato objetivo**

```ts
// src/types/sesion-bloques.ts — SesionBloque gana UN campo
ejercicioTitulo: string | null;
```

`null` significa «el título no viaja en esta respuesta» (retorno de la RPC, o embed vacío por visibilidad). Nunca significa «el bloque no tiene ejercicio»: `ejercicio_id` es `not null` en BD.

**Formas que debe aceptar el mapeo** (PostgREST tipa los embeds a-uno de forma inconsistente y la RPC no los envía):

| Forma de `row.ejercicios` | `ejercicioTitulo` |
|---|---|
| `{ id: "e1", titulo: "Rondo 4x1 básico" }` | `"Rondo 4x1 básico"` |
| `[{ id: "e1", titulo: "Rondo 4x1 básico" }]` | `"Rondo 4x1 básico"` |
| `[]`, `null` o campo ausente (retorno RPC) | `null` |

**Step 1: Escribe los tests que fallan**

En `src/__tests__/services/sesion-bloques.service.test.ts`, reutilizando `createSupabaseMock` que ya existe en el archivo:

```ts
it("expone el título del ejercicio embebido, venga como objeto o como array", async () => {
  const { from } = createSupabaseMock({
    sesion_bloques: {
      data: [
        {
          id: "bloque-1", sesion_id: "sesion-1", titulo: "Inicio", duracion_minutos: 10,
          ejercicio_id: "ejercicio-1", documento_id: null, orden: 1,
          created_at: "2026-08-08T09:00:00Z",
          ejercicios: { id: "ejercicio-1", titulo: "Rondo 4x1 básico" },
        },
        {
          id: "bloque-2", sesion_id: "sesion-1", titulo: "Final", duracion_minutos: 20,
          ejercicio_id: "ejercicio-2", documento_id: null, orden: 2,
          created_at: "2026-08-08T10:00:00Z",
          ejercicios: [{ id: "ejercicio-2", titulo: "Rueda de pases" }],
        },
      ],
      error: null,
    },
  });
  vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

  const result = await fetchSesionBloques("sesion-1");
  const bloques = (result.data as { bloques: { ejercicioTitulo: string | null }[] }).bloques;

  expect(bloques[0]?.ejercicioTitulo).toBe("Rondo 4x1 básico");
  expect(bloques[1]?.ejercicioTitulo).toBe("Rueda de pases");
});

it("devuelve ejercicioTitulo null cuando la relación no viaja en la fila", async () => {
  const { from, rpc } = createSupabaseMock(
    {},
    {
      data: [
        {
          id: "bloque-1", sesion_id: "sesion-1", titulo: "Inicio", duracion_minutos: 10,
          ejercicio_id: "ejercicio-1", documento_id: null, orden: 1,
          created_at: "2026-08-08T09:00:00Z",
        },
      ],
      error: null,
    },
  );
  vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

  const result = await replaceSesionBloques("sesion-1", [
    { titulo: "Inicio", duracionMinutos: 10, ejercicioId: "ejercicio-1", documentoId: null, orden: 1 },
  ]);

  expect(result.data?.[0]).toMatchObject({ ejercicioId: "ejercicio-1", ejercicioTitulo: null });
});
```

**Además, en el mismo archivo**, actualiza las aserciones existentes que comparan el objeto completo con `toEqual` y que ahora romperán por el campo nuevo: el bloque `expect(result).toEqual({...})` del test `"lee bloques nuevos ordenados, con joins mínimos y campos camelCase"` (aprox. `:118-146`) debe incluir `ejercicioTitulo: null` en los dos bloques esperados, porque sus filas mock no traen `ejercicios`. **No cambies** las aserciones `toMatchObject` ni el `expect(calls[0]?.select).toContain("ejercicios(id,titulo)")` — ese `SELECT` ya era correcto y debe seguir igual.

**Step 2: Ejecuta para verificar que falla** — Run: `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` · Expected: FAIL (`ejercicioTitulo` es `undefined`; typecheck del test rojo).

**Step 3: Implementación mínima**

1. En `src/types/sesion-bloques.ts`, añade `ejercicioTitulo: string | null;` a `SesionBloque` justo después de `ejercicioId` (`:6`). **No toques** `SesionBloqueReplaceInput`, `SesionBloqueDraft`, `SesionDetalleLegacy` ni `SesionBloqueSignatureInput`.
2. En `src/services/sesion-bloques.service.ts`:
   - Declara la relación en `SesionBloqueRow` como opcional, ya que la RPC no la envía:
     ```ts
     ejercicios?: { id: string; titulo: string } | { id: string; titulo: string }[] | null;
     ```
   - Añade un helper local por encima de `mapSesionBloque` que normalice objeto/array/ausente a `string | null`, y úsalo en `mapSesionBloque` para poblar `ejercicioTitulo`. Mantén el resto del mapeo intacto y el estilo del archivo (funciones nombradas, sin clases, camelCase).
   - **No cambies** `SELECT_COLUMNS`: ya pide `ejercicios(id,titulo)`.

**Step 4: Ejecuta para verificar que pasa** — Run: `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` · Expected: PASS (todos los casos, nuevos y preexistentes).

**Step 5: Autocomprobación** — Run: `npx tsc --noEmit` y `npm run lint` · Expected: sin errores. Si `tsc` señala otros consumidores de `SesionBloque` que ahora exigen `ejercicioTitulo`, **anótalos y repórtalos**: los tests de componentes se arreglan en la Task 2; cualquier otro archivo de producción que aparezca es un desvío que debes comunicar antes de tocarlo.

---

## Task 2: Renderizar el ejercicio en la vista de ejecución

**Files:**
- Modify: `src/components/sesiones/SesionEjecutarView.tsx:121-139`
- Test: `src/__tests__/components/SesionEjecutarView.test.tsx`

**Skills:** `.agents/skills/tdd/SKILL.md` + `.agents/skills/javascript-testing-patterns/SKILL.md`. Lee antes `docs/design-guides/frontend_styleguide.md` (componentes por dominio, clases Tailwind, textos de UI **en español**).

**Comportamiento esperado**

En el panel de previsualización (`<section aria-labelledby="previsualizacion-title">`), bajo la línea `Duración: N min`, aparece una línea con el ejercicio del bloque **previsualizado**:

- con título → `Ejercicio: Rondo 4x1 básico`
- sin título (`ejercicioTitulo === null`) → `Ejercicio: no disponible`

Se renderiza siempre que haya `viewedBlock`, igual que la línea de duración, y **cambia al navegar** con `Anterior bloque` / `Siguiente bloque` o al pulsar un bloque de la lista. La lista izquierda de bloques y `SesionBloqueRecurso` **no se tocan**.

**Step 1: Escribe el test que falla**

En `src/__tests__/components/SesionEjecutarView.test.tsx`, primero **actualiza el fixture** `setReadyData()` (aprox. `:74-82`) para que ambos bloques incluyan el campo nuevo — `bloque-1` con `ejercicioTitulo: "Rondo 4x1 básico"` y `bloque-2` con `ejercicioTitulo: "Rueda de pases"` — y luego añade:

```ts
it("muestra el ejercicio del bloque previsualizado y lo actualiza al navegar", async () => {
  const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
  render(<SesionEjecutarView sesionId={sesion.id} />);

  expect(screen.getByText("Ejercicio: Rondo 4x1 básico")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Siguiente bloque" }));

  expect(screen.getByText("Ejercicio: Rueda de pases")).toBeInTheDocument();
  expect(screen.queryByText("Ejercicio: Rondo 4x1 básico")).not.toBeInTheDocument();
});

it("indica que el ejercicio no está disponible cuando falta su título", async () => {
  bloqueMocks.useSesionBloques.mockReturnValue({
    data: {
      source: "blocks",
      isExecutable: true,
      bloques: [
        { id: "bloque-1", sesionId: sesion.id, titulo: "Activación", duracionMinutos: 10, ejercicioId: "ejercicio-1", ejercicioTitulo: null, documentoId: null, orden: 1, createdAt: "" },
      ],
    },
    loading: false,
    errorMessage: null,
  });
  const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
  render(<SesionEjecutarView sesionId={sesion.id} />);

  expect(screen.getByText("Ejercicio: no disponible")).toBeInTheDocument();
});
```

Respeta el patrón del archivo: `await import(...)` dentro del test, `vi.useFakeTimers()` ya activo desde `beforeEach`, y envuelve en `act(...)` solo si el runner lo exige (mira cómo lo hacen los tests vecinos que pulsan botones).

**Step 2: Ejecuta para verificar que falla** — Run: `npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: FAIL (no existe ningún texto `Ejercicio: …`).

**Step 3: Implementación mínima**

En `SesionEjecutarView.tsx`, dentro del primer `<div className="space-y-1">` del panel de previsualización, inmediatamente **después** de la línea de duración (`:125`), añade un párrafo condicionado a `viewedBlock` con las mismas clases que sus vecinos (`text-sm text-muted-foreground`) que imprima `Ejercicio: {viewedBlock.ejercicioTitulo ?? "no disponible"}`. Nada más: no añadas hooks, no toques `SesionEjecutarRunnerProps`, no modifiques la lista de bloques ni `SesionBloqueRecurso`.

**Step 4: Ejecuta para verificar que pasa** — Run: `npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: PASS.

**Step 5: Autocomprobación** — Run: `npx tsc --noEmit` y `npm run lint` · Expected: sin errores. Si `tsc` sigue marcando otros tests que construyen `SesionBloque` a mano (por ejemplo mocks en `SesionForm.test.tsx` o utilidades de test compartidas), **añádeles `ejercicioTitulo`** con el valor coherente y repórtalo en tu resumen — es consecuencia directa del contrato de la Task 1.

---

## Task 3 (final): Actualizar documentación

**Files:**
- Modify: `docs/backlog.md` — sección `## BLOQUE 14 — Auditoría 2026-07-12`, tras la entrada `B14-17` (aprox. `:273-277`)
- Modify (si aplica): `docs/crud-audit.md` — solo si documenta los campos expuestos por el módulo de sesiones/bloques
- Modify (si aplica): `docs/design-guides/data_styleguide.md` — solo si no recoge todavía cómo se normalizan los embeds a-uno de PostgREST

**Pasos:**

1. Añade en `docs/backlog.md` una entrada nueva **`B14-18`** marcada `[x]`, con el estilo de sus vecinas (prosa en español, causa + corrección + prueba de regresión + fecha `20/08/2026`). Debe dejar constancia de que el ejercicio del bloque se guardaba y se consultaba pero se descartaba en `mapSesionBloque`, de que la vista de ejecución no lo pintaba, y de que `SesionBloque` expone ahora `ejercicioTitulo` con regresiones en `sesion-bloques.service.test.ts` y `SesionEjecutarView.test.tsx`.
2. Revisa `docs/crud-audit.md`: si enumera los campos de lectura de `sesion_bloques`, añade `ejercicioTitulo`. Si no los enumera, **no lo toques**.
3. Revisa `docs/design-guides/data_styleguide.md`: si no dice ya cómo tratar un embed a-uno que PostgREST puede devolver como objeto o array (y que la RPC no devuelve), añade una nota breve en la sección de servicios Supabase. Si ya está cubierto, **no lo toques**.
4. **No** ejecutes git: `GIT=off`.

**Sin código de producción en esta tarea.**
