# Bloques de sesión con contenido opcional (ejercicio · recurso · notas) — Implementation Plan

**Goal:** Que un bloque de sesión exija **solo título y duración**, y que su contenido —ejercicio,
recurso/documento y un texto libre nuevo— sea **opcional e independiente**: ninguno, uno, dos o los
tres a la vez.

**Architecture:** Hoy el ejercicio es obligatorio en cuatro capas —`getBlockErrors` en
`SesionBloquesEditor`, el gate `getBloquesReplaceInput` en `SesionForm`, `idSchema` no anulable en
`sesion-bloques.schema.ts`, y `ejercicio_id uuid not null` + validación estricta de payload en la RPC
`replace_sesion_bloques`— y no existe ningún campo de texto libre. Se relajan las cuatro capas en
orden de dependencia (tipos/schema → lib → servicio → UI → migración) y se añade una columna `notas`
siguiendo la convención ya usada en `entrenadores`/`jugadores`. El borrador de UI guarda `notas`
como `string | null` (igual que `documentoId`) y se normaliza a `null` en el borde del formulario,
para que el `CHECK` de longitud solo aplique cuando el valor **sí** existe.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Zod · React Hook Form · shadcn/ui (`Textarea`) ·
Supabase (PostgreSQL, RPC `security definer`) · Vitest + jsdom.

## Perfil de verificación

- Nivel: **full**
- Motivo: incluye migración de esquema (`drop not null` + columna nueva) y reescritura de
  `public.replace_sesion_bloques`, una función `security definer` que es el **único** camino de
  escritura de `public.sesion_bloques` y que valida la pertenencia al workspace del ejercicio
  (multi-tenant). Toca persistencia.
- Comandos: `npm run lint` · `npx tsc --noEmit` · `npm test -- --run` · `npm run build` · consultas
  de **solo lectura** contra el remoto para confirmar nullabilidad, la columna `notas` y la firma de
  la RPC.
- Evidencias esperadas: estático limpio; suite unitaria verde incluyendo los casos nuevos (bloque sin
  ejercicio, bloque solo con notas, bloque con los tres contenidos);
  `information_schema.columns` con `is_nullable = YES` en `ejercicio_id` y con la columna `notas`
  presente; guardado real de una sesión con un bloque sin ejercicio.

## Incidencias de verificación

**Ronda 1 — 20/08/2026 · `major` · no era un defecto (cerrada sin remediación)**

- Reportado: el `verifier` devolvió `FALLA` con una única incidencia — la Task 9 (documentación) sin
  ejecutar. Los cinco criterios de aceptación funcionales pasaron con evidencia.
- Causa: desajuste de fases, no un fallo del código. La Task 9 es la **FASE 4** del protocolo de
  `/auto`, que corre **después** de la verificación; el `verifier` la evaluó como si formara parte
  de la FASE 3.
- Corrección: se ejecutó la Task 9 en su fase, sin ronda de remediación ni cambios en código de
  producción.
- Prueba: `docs/backlog.md` (B2-8), `docs/crud-audit.md`, ambas `docs/design-guides/` y la nota de
  superación en `docs/plans/2026-08-17-sesion-bloques-campos-opcionales.md` actualizados;
  `npx tsc --noEmit` limpio tras la documentación.

Sin incidencias `major`/`critical` reales. Evidencia de la ronda: `npm run lint` limpio ·
`npx tsc --noEmit` limpio · `npm test -- --run` 705/705 en 113 archivos · `npm run build` OK ·
`e2e/sesiones-ejecucion.spec.ts` 8/8 · verificación en BD de nulabilidad, `pg_get_functiondef`,
policy RLS y `schema_migrations`.

**No ejecutado (declarado, no inventado):** no existe spec Playwright que accione el editor de
`SesionForm` guardando un bloque de contenido opcional de punta a punta. Ese flujo queda cubierto por
tests unitarios más la verificación del contrato de la RPC contra la BD real.
`e2e/documentos-multifuente.spec.ts` sigue bloqueado por falta de `SUPABASE_SERVICE_ROLE_KEY`
(bloqueo preexistente, ajeno a este plan).

## Autorización de migración

- **Estado: AUTORIZADA**
- Fecha: 20/08/2026 (Europe/Madrid)
- Autoriza: propietario del proyecto, en respuesta al gate de `/auto`.
- Destino: Supabase project ref `rgmrqkoudyotkpqgezzv`, rama `main` (única BD, uso de prueba según
  `AGENTS.md`).
- Artefacto: `supabase/migrations/20260820140000_sesion_bloques_contenido_opcional.sql`.
- Alcance presentado y aceptado: `drop not null` en `sesion_bloques.ejercicio_id`; `add column notas
  text` nullable; `check` de longitud 1-2000 en `notas`; índice `idx_sesion_bloques_ejercicio`
  recreado como parcial; `create or replace` de `replace_sesion_bloques(uuid, jsonb)`.
- Vía de aplicación aceptada: Management API (`POST /v1/projects/<ref>/database/query`) +
  `supabase migration repair`. **`supabase db push` excluido** por drift del historial.
- Riesgos aceptados: sin pérdida de datos (solo se relaja una restricción y se añade una columna);
  bloqueos de catálogo de milisegundos; RLS y Realtime sin cambios; un frontend desplegado
  **anterior** a este cambio no podrá guardar bloques hasta desplegarlo, porque la RPC pasa a exigir
  6 claves.
- Rollback registrado: `drop constraint` + `drop column notas` + `set not null` (exige que no haya
  filas con `ejercicio_id` nulo) + reejecutar la función de
  `20260808090000_sesion_bloques_ejecucion.sql`.

---

## Comportamiento actual (descubierto)

1. `src/components/sesiones/SesionBloquesEditor.tsx:42` — `getBlockErrors` devuelve
   `ejercicio: "Selecciona un ejercicio."` cuando `!bloque.ejercicioId`. Ese mensaje se pinta en
   `SesionBloquesEditor.tsx:220-222`.
2. `src/components/sesiones/SesionForm.tsx:164-186` — `getBloquesReplaceInput` devuelve `null` si
   algún bloque no tiene título, duración entera positiva **o** `ejercicioId`; el `null` dispara
   `setBloquesError("Completa al menos un bloque antes de guardar.")` en `SesionForm.tsx:401-405`.
3. `src/schemas/sesion-bloques.schema.ts:8` — `ejercicioId: idSchema` (no anulable).
   `documentoId` (línea 9) **ya** es `.nullable()`.
4. `src/types/sesion-bloques.ts:6` y `:16` — `ejercicioId: string` obligatorio en `SesionBloque` y
   `SesionBloqueReplaceInput`. El borrador (`SesionBloqueDraft:25`) ya admite `null`.
5. `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql:8` —
   `ejercicio_id uuid not null references public.ejercicios(id) on delete restrict`.
   La RPC (líneas 111-129) exige **exactamente 5 claves** y `jsonb_typeof(ejercicio_id) = 'string'`;
   las líneas 155-162 validan incondicionalmente que el ejercicio pertenezca al workspace.
6. **No existe ninguna columna de texto libre** en `public.sesion_bloques`. La convención del
   proyecto para texto libre es `notas text` (ver `src/types/entrenadores.ts:10`,
   `src/types/jugadores.ts:14`).
7. `src/components/sesiones/SesionEjecutarView.tsx:127-129` ya tolera un ejercicio ausente, pero
   imprime literalmente `Ejercicio: no disponible`, que ahora sería un falso error.
8. `src/components/ui/textarea.tsx` **ya existe**; no hay que instalar nada.

### Decisiones cerradas (no las revises)

- **D1 — Título y duración siguen siendo obligatorios.** No toques sus validaciones ni sus mensajes.
- **D2 — Sigue haciendo falta al menos un bloque** para guardar (`blocks must be a non-empty array`
  en la RPC se mantiene). El alcance de hoy es el *contenido* del bloque, no su existencia.
- **D3 — Nombre del campo: `notas` (BD) / `notas` (TS).** No uses `texto`, `descripcion` ni
  `observaciones`.
- **D4 — El borrador usa `notas: string | null`**, no `string`. Motivo: `SesionForm.tsx:333` asigna
  directamente un `SesionBloque[]` persistido a un `SesionBloqueDraft[]`; si el borrador exigiera
  `string` y el persistido devolviera `string | null`, ese `setBloques` dejaría de compilar.
- **D5 — Normalización en el borde:** el formulario envía `notas` ya recortado, y `""` → `null`.
  La RPC repite la normalización (`nullif(btrim(...), '')`) porque es la frontera de confianza.
- **D6 — Límite de `notas`: 2000 caracteres**, validado en Zod, en el `CHECK` de la tabla y en la RPC.
- **D7 — Este plan sustituye a `docs/plans/2026-08-17-sesion-bloques-campos-opcionales.md`**, que
  nunca se ejecutó (no existe la migración `20260817100000`) y cuyo alcance contradice **D1** y
  **D2**. No lo ejecutes ni lo mezcles.
- **D8 — Encoding:** varios archivos de este árbol ya tienen bytes UTF-8 mixtos heredados. Usa
  ediciones quirúrgicas con coincidencia exacta y **no reescribas archivos enteros**; no "arregles"
  acentos en líneas que tu tarea no nombra. LF siempre.

---

## Task 1: `notas` y ejercicio opcional en tipos y schema Zod

**Files:**
- Modify: `src/types/sesion-bloques.ts`
- Modify: `src/schemas/sesion-bloques.schema.ts`
- Test: `src/__tests__/schemas/sesion-bloques.schema.test.ts`

**Step 1: Escribe los tests que fallan.** En
`src/__tests__/schemas/sesion-bloques.schema.test.ts`:

- Añade `notas: null` al objeto `bloqueValido` (líneas 5-11).
- **Sustituye** el test `"exige un ejercicio"` (líneas 27-31) por:

```ts
  it("admite un bloque sin ejercicio, sin recurso y sin notas", () => {
    expect(
      sesionBloqueSchema.safeParse({
        ...bloqueValido,
        ejercicioId: null,
        documentoId: null,
        notas: null,
      }).success,
    ).toBe(true);
  });

  it("admite los tres contenidos a la vez y recorta las notas", () => {
    expect(
      sesionBloqueSchema.parse({
        ...bloqueValido,
        documentoId: "9a1f0c2e-7b3d-4a5e-8f6c-1d2e3f4a5b6c",
        notas: "  Insistir en el primer toque  ",
      }),
    ).toMatchObject({ notas: "Insistir en el primer toque" });
  });

  it("rechaza notas por encima de 2000 caracteres", () => {
    expect(
      sesionBloqueSchema.safeParse({ ...bloqueValido, notas: "x".repeat(2001) }).success,
    ).toBe(false);
  });
```

**Step 2: Ejecuta y confirma que fallan** — Run:
`npm test -- --run src/__tests__/schemas/sesion-bloques.schema.test.ts` · Expected: **FAIL**

**Step 3: Implementación mínima.**

En `src/types/sesion-bloques.ts`:

- `SesionBloque` (línea 6): `ejercicioId: string` → `ejercicioId: string | null`.
- `SesionBloque`: añade `notas: string | null;` **después** de `documentoId` (línea 8).
- `SesionBloqueReplaceInput` (línea 16): `ejercicioId: string` → `ejercicioId: string | null`.
- `SesionBloqueReplaceInput`: añade `notas: string | null;` después de `documentoId` (línea 17).
- `SesionBloqueDraft`: añade `notas: string | null;` después de `documentoId` (línea 26). Ver **D4**.

En `src/schemas/sesion-bloques.schema.ts:8-9`, dentro de `sesionBloqueSchema`:

```ts
  ejercicioId: idSchema.nullable(),
  documentoId: idSchema.nullable(),
  notas: z.string().trim().max(2000, "Las notas no pueden superar 2000 caracteres.").nullable(),
```

No toques `titulo`, `duracionMinutos`, `orden` ni el `superRefine` de `sesionBloquesSchema` (**D1**,
**D2**).

**Step 4: Ejecuta y confirma que pasan** — Run:
`npm test -- --run src/__tests__/schemas/sesion-bloques.schema.test.ts` · Expected: **PASS**

**Step 5:** `npx tsc --noEmit`. Fallará en archivos de las tareas 2-6 (aún sin `notas`). Anota los
errores y **no los arregles aquí**.

---

## Task 2: `notas` en los helpers de `lib`

**Files:**
- Modify: `src/lib/sesionBloques.ts:22-33`
- Test: `src/__tests__/lib/sesionBloques.test.ts`

**Step 1: Test que falla.** Añade a `src/__tests__/lib/sesionBloques.test.ts` un caso que compruebe
que `mapSesionDetalleToBloquesDraft` inicializa `notas` a `null`:

```ts
  it("inicializa las notas a null al migrar un detalle legado", () => {
    const [draft] = mapSesionDetalleToBloquesDraft([
      { id: "l1", ejercicioId: null, orden: 1, tiempoEjecucion: 10, titulo: "Inicio" },
    ]);
    expect(draft).toMatchObject({ documentoId: null, notas: null });
  });
```

Reutiliza el `import` de `mapSesionDetalleToBloquesDraft` si ya existe; si no, añádelo desde
`@/lib/sesionBloques`.

**Step 2: Run** `npm test -- --run src/__tests__/lib/sesionBloques.test.ts` · Expected: **FAIL**

**Step 3: Implementación.** En `src/lib/sesionBloques.ts:30`, dentro del objeto que devuelve
`mapSesionDetalleToBloquesDraft`, añade `notas: null,` justo después de `documentoId: null,`.

No toques `normalizarOrdenBloques`, `sumarDuracionBloques`, `getBloqueEtiqueta` ni
`getSesionBloquesSignature`.

**Step 4: Run** `npm test -- --run src/__tests__/lib/sesionBloques.test.ts` · Expected: **PASS**

---

## Task 3: `notas` y `ejercicio_id` anulable en el servicio

**Files:**
- Modify: `src/services/sesion-bloques.service.ts`
- Test: `src/__tests__/services/sesion-bloques.service.test.ts`

**Step 1: Tests que fallan.** En `src/__tests__/services/sesion-bloques.service.test.ts`, siguiendo
el estilo de mock ya presente en el archivo:

1. Un test de `fetchSesionBloques` cuya fila mock tenga `ejercicio_id: null`, `ejercicios: null` y
   `notas: "Trabajo individual"`, y que espere el bloque mapeado con
   `{ ejercicioId: null, ejercicioTitulo: null, notas: "Trabajo individual" }`.
2. Un test de `replaceSesionBloques` que pase un input con
   `{ ejercicioId: null, documentoId: null, notas: "Solo texto" }` y verifique que el `rpc` recibe
   `p_bloques` con `{ ejercicio_id: null, documento_id: null, notas: "Solo texto" }`.

**Step 2: Run** `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` ·
Expected: **FAIL**

**Step 3: Implementación** en `src/services/sesion-bloques.service.ts`:

- `SELECT_COLUMNS` (líneas 12-13): añade `notas` a la lista de columnas escalares, entre
  `documento_id` y `orden`. Resultado:
  `"id,sesion_id,titulo,duracion_minutos,ejercicio_id,documento_id,notas,orden,created_at,ejercicios(id,titulo),documentos(id,titulo)"`.
- `interface SesionBloqueRow` (líneas 15-25): `ejercicio_id: string` → `ejercicio_id: string | null`;
  añade `notas: string | null;` tras `documento_id`.
- `mapSesionBloque` (líneas 49-60): añade `notas: row.notas,` tras `documentoId: row.documento_id,`.
  `ejercicioId: row.ejercicio_id` ya no necesita cambio (el tipo ahora admite `null`).
- `replaceSesionBloques` (líneas 105-113): añade `notas: bloque.notas,` al objeto del `map`, entre
  `documento_id` y `orden`.

**Cuidado:** el orden de las claves del payload es irrelevante para la RPC, pero la RPC exige el
**conjunto exacto de 6 claves**; no añadas ni omitas ninguna.

**Step 4: Run** `npm test -- --run src/__tests__/services/sesion-bloques.service.test.ts` ·
Expected: **PASS**

---

## Task 4: Editor — ejercicio opcional y campo de notas

**Files:**
- Modify: `src/components/sesiones/SesionBloquesEditor.tsx`
- Test: `src/__tests__/components/SesionBloquesEditor.test.tsx`

**Step 1: Tests que fallan.** En `src/__tests__/components/SesionBloquesEditor.test.tsx`:

- **Elimina** la línea 77 (`expect(screen.getByText("Selecciona un ejercicio."))…`) y sustitúyela por
  la aserción inversa:

```ts
    expect(screen.queryByText("Selecciona un ejercicio.")).not.toBeInTheDocument();
```

  (El test sigue comprobando que **sí** aparecen los mensajes de título y duración — **D1**.)

- Añade `notas: null` a **todos** los literales `SesionBloqueDraft` del archivo (p. ej. el de la
  línea 82). Sin esto no compila.

- Añade un test nuevo para el campo de notas:

```ts
  it("permite escribir notas libres sin exigir ejercicio ni recurso", () => {
    const onChange = vi.fn();
    const bloques: SesionBloqueDraft[] = [
      { id: "uno", titulo: "Charla", duracionMinutos: 5, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ];
    render(
      <SesionBloquesEditor
        bloques={bloques}
        ejercicios={ejercicios}
        documentos={documentos}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /notas del bloque 1/i }), {
      target: { value: "Repaso táctico" },
    });

    expect(onChange).toHaveBeenCalledWith([{ ...bloques[0], notas: "Repaso táctico" }]);
  });
```

**Step 2: Run** `npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` ·
Expected: **FAIL**

**Step 3: Implementación** en `src/components/sesiones/SesionBloquesEditor.tsx`:

1. **Import** (tras la línea 4): `import { Textarea } from "@/components/ui/textarea";`
   Respeta el orden alfabético de los imports de `@/components/ui/` ya existente.
2. **`getBlockErrors` (líneas 35-44):** borra por completo la propiedad `ejercicio:` (línea 42). La
   función queda con `titulo` y `duracion`.
3. **`addBlock` (líneas 60-74):** añade `notas: null,` tras `documentoId: null,`.
4. **Bloque del ejercicio (líneas 192-223):**
   - Línea 193: `<Label>Ejercicio del bloque {blockNumber}</Label>` →
     `<Label>Ejercicio del bloque {blockNumber} (opcional)</Label>`.
   - Borra `aria-invalid={showErrors && !!errors.ejercicio}` del `SelectTrigger` (línea 201).
   - **No cambies** `aria-label={`Ejercicio del bloque ${blockNumber}`}` (línea 200): los tests y el
     E2E dependen de ese nombre accesible exacto.
   - Sustituye los tres literales `"Selecciona un ejercicio"` (líneas 203, 206, 207, 212) por
     `"Sin ejercicio"`, para que la opción vacía se lea como elección válida y no como un hueco por
     rellenar.
   - Borra el bloque `{showErrors && errors.ejercicio && (…)}` (líneas 220-222).
5. **Recurso (líneas 225-234):** línea 226: `<Label>Recurso</Label>` →
   `<Label>Recurso (opcional)</Label>`.
6. **Campo de notas nuevo**, insertado **después** del `<div>` del recurso y antes de cerrar el
   `</fieldset>`:

```tsx
              <div className="space-y-1">
                <Label htmlFor={`bloque-${bloque.id}-notas`}>Notas del bloque {blockNumber} (opcional)</Label>
                <Textarea
                  id={`bloque-${bloque.id}-notas`}
                  value={bloque.notas ?? ""}
                  onChange={(event) =>
                    updateBlock(bloque.id, { notas: event.target.value === "" ? null : event.target.value })
                  }
                  disabled={disabled}
                  maxLength={2000}
                  rows={3}
                />
              </div>
```

**Prohibido:** no añadas un selector de "tipo de contenido" ni pestañas. Los tres contenidos se
muestran **siempre**, los tres a la vez, cada uno vacío por defecto.

**Step 4: Run** `npm test -- --run src/__tests__/components/SesionBloquesEditor.test.tsx` ·
Expected: **PASS**

---

## Task 5: Formulario — dejar de bloquear el guardado por falta de ejercicio

**Files:**
- Modify: `src/components/sesiones/SesionForm.tsx:164-186`, `:401-405`
- Test: `src/__tests__/components/SesionForm.test.tsx`

**Step 1: Tests que fallan.** En `src/__tests__/components/SesionForm.test.tsx`:

- Añade `notas: null` a los literales `SesionBloqueDraft` / filas mock de bloques que existan.
- Localiza el test que hoy termina en la línea ~431 con
  `expect(await screen.findByText(/completa al menos un bloque/i)).toBeInTheDocument();`.
  **Reescribe su intención:** un bloque con título y duración pero **sin ejercicio, sin recurso y sin
  notas** ahora **debe guardarse**. Es decir: rellena título y duración, deja el ejercicio en
  "Sin ejercicio", envía, y espera que `replaceSesionBloques` haya sido llamado con
  `[{ titulo: …, duracionMinutos: …, ejercicioId: null, documentoId: null, notas: null, orden: 1 }]`.
- Añade un test que conserve **D1**: un bloque **sin título** sigue mostrando el error de bloqueo y
  **no** llama a `replaceSesionBloques`. El mensaje esperado es el nuevo de la línea 404 (ver Step 3).

**Step 2: Run** `npm test -- --run src/__tests__/components/SesionForm.test.tsx` · Expected: **FAIL**

**Step 3: Implementación** en `src/components/sesiones/SesionForm.tsx`:

1. `getBloquesReplaceInput` (líneas 164-186):
   - Borra la condición `!bloque.ejercicioId,` (línea 174) del `bloques.some(...)`. Deja las de
     título y duración (**D1**) y el `bloques.length === 0` (**D2**).
   - En el `map` de retorno (líneas 180-186): `ejercicioId: bloque.ejercicioId!,` (línea 183) →
     `ejercicioId: bloque.ejercicioId,` (fuera el `!`), y añade
     `notas: bloque.notas?.trim() ? bloque.notas.trim() : null,` tras `documentoId: bloque.documentoId,`
     (**D5**).
   - `duracionMinutos: bloque.duracionMinutos!` se queda como está: la duración sigue garantizada.
2. Línea 404: `setBloquesError("Completa al menos un bloque antes de guardar.")` →
   `setBloquesError("Cada bloque necesita título y duración antes de guardar.")`. El mensaje viejo
   mentía sobre qué falta.
3. **No toques** el bloque `unavailableExerciseIndex` (líneas 406-421): ya está guardado con
   `bloque.ejercicioId &&`, así que un bloque sin ejercicio simplemente no entra en esa comprobación.
   Su comportamiento sigue siendo correcto.

**Step 4: Run** `npm test -- --run src/__tests__/components/SesionForm.test.tsx` · Expected: **PASS**

---

## Task 6: Vista de ejecución — mostrar solo el contenido presente

**Files:**
- Modify: `src/components/sesiones/SesionEjecutarView.tsx:124-131`
- Test: `src/__tests__/components/SesionEjecutarView.test.tsx`

**Step 1: Tests que fallan.** En `src/__tests__/components/SesionEjecutarView.test.tsx`:

- Añade `notas: null` a los bloques mock existentes.
- Adapta el test que hoy espera `"no disponible"` (≈ línea 246): con `ejercicioTitulo: null` la vista
  ya **no** debe imprimir la línea de ejercicio en absoluto:

```ts
    expect(screen.queryByText(/^Ejercicio:/)).not.toBeInTheDocument();
```

- Añade un test: un bloque con `notas: "Estiramientos guiados"` muestra ese texto; un bloque con
  `notas: null` no muestra ninguna sección de notas.

**Step 2: Run** `npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` ·
Expected: **FAIL**

**Step 3: Implementación** en `src/components/sesiones/SesionEjecutarView.tsx`. Sustituye el bloque
de las líneas 126-130:

```tsx
            {viewedBlock?.ejercicioTitulo && (
              <p className="text-sm text-muted-foreground">
                Ejercicio: {viewedBlock.ejercicioTitulo}
              </p>
            )}
            {viewedBlock?.notas && (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{viewedBlock.notas}</p>
            )}
```

`whitespace-pre-line` conserva los saltos de línea que el usuario escriba en el `Textarea`.
No toques el runner, el temporizador ni `SesionBloqueRecurso`.

**Step 4: Run** `npm test -- --run src/__tests__/components/SesionEjecutarView.test.tsx` ·
Expected: **PASS**

**Step 5: Cierre del frente TypeScript.** Ahora sí: `npx tsc --noEmit` y `npm run lint` deben quedar
**limpios**. Si algún literal `SesionBloqueDraft`/`SesionBloque` en otro test sigue sin `notas`,
añádeselo. Luego `npm test -- --run` completo en verde.

---

## Task 7: Preparar la migración (NO aplicarla)

**Files:**
- Create: `supabase/migrations/20260820140000_sesion_bloques_contenido_opcional.sql`

**Reglas duras:**
- **No ejecutes `supabase db push`.** El historial de migraciones de este proyecto está
  desincronizado con el remoto (ver `docs/design-guides/data_styleguide.md`, sección Supabase CLI
  local). El SQL se aplica quirúrgicamente vía Management API y se registra con `migration repair`.
- En esta tarea **solo se escribe el archivo**. No se conecta a ninguna base de datos.
- Todo el SQL debe ser **idempotente** (`if exists` / `if not exists` / `create or replace`).

**Contenido exacto del archivo:**

```sql
-- Bloques de sesión: el contenido (ejercicio, recurso y notas) pasa a ser opcional.
-- Título y duración siguen siendo obligatorios.

alter table public.sesion_bloques
  alter column ejercicio_id drop not null;

alter table public.sesion_bloques
  add column if not exists notas text;

alter table public.sesion_bloques
  drop constraint if exists sesion_bloques_notas_longitud;

alter table public.sesion_bloques
  add constraint sesion_bloques_notas_longitud
  check (notas is null or char_length(notas) between 1 and 2000);

drop index if exists public.idx_sesion_bloques_ejercicio;

create index idx_sesion_bloques_ejercicio
  on public.sesion_bloques (ejercicio_id)
  where ejercicio_id is not null;

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
  v_notas text;
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

  if jsonb_typeof(p_bloques) <> 'array' or jsonb_array_length(p_bloques) = 0 then
    raise exception 'blocks must be a non-empty array';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_bloques)
  loop
    v_index := v_index + 1;

    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    if (select count(*) from jsonb_object_keys(v_item)) <> 6
      or exists (
        select 1
        from jsonb_object_keys(v_item) as payload_key(key_name)
        where payload_key.key_name not in (
          'titulo',
          'duracion_minutos',
          'ejercicio_id',
          'documento_id',
          'notas',
          'orden'
        )
      )
      or jsonb_typeof(v_item -> 'titulo') <> 'string'
      or jsonb_typeof(v_item -> 'duracion_minutos') <> 'number'
      or jsonb_typeof(v_item -> 'orden') <> 'number'
      or jsonb_typeof(v_item -> 'ejercicio_id') not in ('string', 'null')
      or jsonb_typeof(v_item -> 'documento_id') not in ('string', 'null')
      or jsonb_typeof(v_item -> 'notas') not in ('string', 'null') then
      raise exception 'invalid block payload at position %', v_index;
    end if;

    v_titulo := btrim(v_item ->> 'titulo');
    if char_length(v_titulo) not between 1 and 120 then
      raise exception 'invalid block title at position %', v_index;
    end if;

    begin
      v_duracion := (v_item ->> 'duracion_minutos')::integer;
      v_orden := (v_item ->> 'orden')::integer;

      if jsonb_typeof(v_item -> 'ejercicio_id') = 'null' then
        v_ejercicio_id := null;
      else
        v_ejercicio_id := (v_item ->> 'ejercicio_id')::uuid;
      end if;

      if jsonb_typeof(v_item -> 'documento_id') = 'null' then
        v_documento_id := null;
      else
        v_documento_id := (v_item ->> 'documento_id')::uuid;
      end if;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'invalid block value at position %', v_index;
    end;

    if jsonb_typeof(v_item -> 'notas') = 'null' then
      v_notas := null;
    else
      v_notas := nullif(btrim(v_item ->> 'notas'), '');
    end if;

    if v_notas is not null and char_length(v_notas) > 2000 then
      raise exception 'invalid block notes at position %', v_index;
    end if;

    if v_duracion <= 0 or v_orden < 1 then
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
    v_duracion_total := v_duracion_total + v_duracion;
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
    notas,
    orden
  )
  select
    p_sesion_id,
    btrim(block.titulo),
    block.duracion_minutos,
    block.ejercicio_id,
    block.documento_id,
    nullif(btrim(block.notas), ''),
    block.orden
  from jsonb_to_recordset(p_bloques) as block(
    titulo text,
    duracion_minutos integer,
    ejercicio_id uuid,
    documento_id uuid,
    notas text,
    orden integer
  );

  update public.sesiones
  set duracion_estimada = v_duracion_total::integer
  where id = p_sesion_id;

  return query
  select sb.*
  from public.sesion_bloques sb
  where sb.sesion_id = p_sesion_id
  order by sb.orden;
end;
$$;

revoke all on function public.replace_sesion_bloques(uuid, jsonb) from public, anon;
grant execute on function public.replace_sesion_bloques(uuid, jsonb) to authenticated;
```

**Step: comprobación estática del SQL.** No hay linter de SQL en el repo. Revisa a mano:
- El `count(*) <> 6` concuerda con las 6 claves que envía `replaceSesionBloques` (Task 3).
- `notas` aparece en la lista de columnas del `insert`, en el `select` y en el `jsonb_to_recordset`,
  **en la misma posición** en los tres.
- El archivo termina con salto de línea y usa **LF**.

---

## GATE OBLIGATORIO — autorización de migración

**PARA AQUÍ.** No ejecutes la Task 8 sin `Estado: AUTORIZADA` registrado en la sección
`## Autorización de migración` de este plan.

---

## Task 8 (solo con `Estado: AUTORIZADA`): Aplicar la migración

**Steps:**
1. Confirma el project ref exacto antes de escribir nada
   (`rgmrqkoudyotkpqgezzv`, según `AGENTS.md`).
2. Ejecuta el SQL **íntegro** del archivo de la Task 7 vía Management API
   (`POST https://api.supabase.com/v1/projects/<ref>/database/query`) o el SQL Editor. **No**
   `supabase db push`.
3. Verificación de **solo lectura**:

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'sesion_bloques'
  and column_name in ('titulo', 'duracion_minutos', 'ejercicio_id', 'notas');
-- esperado: ejercicio_id -> YES · notas -> YES (text) · titulo y duracion_minutos -> NO
```

```sql
select p.proname, p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'replace_sesion_bloques';
-- esperado: prosecdef = true
```

4. `npx.cmd supabase migration repair 20260820140000 --status applied --linked`.
5. **Regenera los tipos — NO es best-effort (corrección del 20/08/2026).**
   `npx.cmd supabase gen types typescript --linked > src/types/database.types.ts` (UTF-8 + LF).

   **Por qué cambia respecto a la redacción original:** el plan asumía que nada en `src/` depende de
   los tipos generados de `sesion_bloques`. Es **falso**: `src/services/supabase.ts:6-20` crea el
   cliente como `SupabaseClient<Database>` con `Database` importado de `@/types/database.types`, de
   modo que el `.select()` de `sesion-bloques.service.ts` se valida contra ese archivo. Con la
   columna `notas` ausente, `tsc` falla con
   `TS2352 … SelectQueryError<"column 'notas' does not exist on 'sesion_bloques'.">` en
   `src/services/sesion-bloques.service.ts:77`. Sin esto, el perfil **full** no puede pasar.

   Si el CLI no puede autenticarse en este contexto, aplica una **edición quirúrgica** en
   `src/types/database.types.ts`, dentro del bloque `sesion_bloques:` (≈ línea 1384), y **solo ahí**:
   añade `notas: string | null` a `Row`, y `notas?: string | null` a `Insert` y `Update`; cambia
   `ejercicio_id` a `string | null` en `Row` y a `string | null` opcional en `Insert`/`Update`.
   No regeneres ni reescribas el resto del archivo.

---

## Task 9 (final): Documentación

**Files:**
- Modify: `docs/backlog.md` — marca la tarea en el bloque de sesiones: el contenido del bloque
  (ejercicio, recurso, notas) es opcional e independiente; solo título y duración son obligatorios.
- Modify: `docs/crud-audit.md` — si documenta la validación de bloques de sesión, actualiza el estado.
- Modify: `docs/design-guides/frontend_styleguide.md` — en «Runner de sesiones por bloques»,
  documenta que un bloque expone **siempre** los tres contenidos opcionales a la vez (sin selector de
  tipo), que la previsualización solo pinta los presentes, y que las notas conservan saltos de línea.
- Modify: `docs/design-guides/data_styleguide.md` — refleja el contrato nuevo de
  `replace_sesion_bloques`: **6 claves exactas** por bloque, `ejercicio_id`/`documento_id`/`notas`
  admiten `null`, y `notas` se normaliza con `nullif(btrim(...), '')` con tope de 2000 caracteres.
- Modify: `docs/plans/2026-08-17-sesion-bloques-campos-opcionales.md` — añade una nota al principio:
  **superado por este plan**, nunca ejecutado (ver **D7**).

**Pasos:** marca la tarea como hecha y deja constancia de las convenciones nuevas. No incluyas código
de producción. **Cerrar = actualizar la doc.**
