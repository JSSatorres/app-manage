# Bloques de sesión colapsables — Implementation Plan

**Goal:** Que cada bloque del formulario de sesión se pueda contraer/expandir libremente y que, al
pulsar «Añadir bloque», se contraigan todos los existentes quedando expandido solo el nuevo.

**Architecture:** Cambio quirúrgico y **local a `src/components/sesiones/SesionBloquesEditor.tsx`**.
Se añade estado local de UI (`useState<ReadonlySet<string>>` con los ids expandidos; lo desconocido
= contraído) y se reestructura el `fieldset` de cada bloque en dos partes: una **cabecera siempre
visible** (botón toggle con chevron + título + duración, más los botones subir/bajar/eliminar) y un
**cuerpo renderizado condicionalmente** (`{abierto && ...}`) con el resto de campos. Se sigue el
patrón colapsable ya existente en `src/components/sedes/SedeAccordionRow.tsx` (ChevronRight rotado
90°, `aria-expanded`/`aria-controls`, render condicional — sin librerías nuevas). **No se toca**
`SesionForm.tsx`, ni servicios, ni schemas, ni BD.

**Tech Stack:** React 19 (`useState`), Next.js 16, shadcn/ui (`Button`, `Input`, `Label`),
lucide-react (`ChevronRight`, ya disponible), Vitest + Testing Library.

## Perfil de verificación

- **Nivel:** `standard`
- **Motivo:** cambio solo de UI en un componente cliente. Sin migraciones, sin capa de datos, sin
  API, sin cambios de contrato. El riesgo real es de regresión en los tests unitarios del editor
  (los inputs de un bloque contraído dejan de estar en el DOM) y de accesibilidad del toggle.
- **Comandos:**
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npx vitest run src/__tests__/components/SesionBloquesEditor.test.tsx`
  - `npx vitest run`
  - `npm run build`
- **Evidencias esperadas:** lint y typecheck limpios; suite unitaria completa en verde (incluidos
  los tests nuevos de colapso y los tests multi-bloque adaptados); `next build` sin errores.
  **E2E no aplica**: `e2e/sesiones-ejecucion.spec.ts` solo cubre `/sesiones/{id}/ejecutar`, no el
  formulario de bloques.

## Incidencias de verificación

Ninguna `major`/`critical`. El `verifier` (perfil `standard`) devolvió **PASA** en la primera
ronda: `npm run lint` limpio, `npx tsc --noEmit` limpio, `SesionBloquesEditor.test.tsx` en verde,
suite unitaria completa 713/713 y `npm run build` OK.

**Desvío del enunciado (menor, resuelto durante la ejecución):** la Task 1 solo preveía adaptar 2
tests preexistentes. En realidad eran 5: `abre el selector de ejercicio…`, `muestra la selección de
un documento…`, `indica el origen de cada documento…` y `permite escribir notas libres…` también
montan bloques por props (no vía «Añadir bloque»), así que ahora nacen contraídos y necesitaban un
`fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }))` previo. Se añadió sin
tocar ninguna aserción.

---

## Comportamiento actual (descubierto)

`src/components/sesiones/SesionBloquesEditor.tsx` (253 líneas) es un componente **controlado**:
recibe `bloques: SesionBloqueDraft[]` y `onChange`, sin estado propio. Cada bloque se pinta como:

- `<fieldset key={bloque.id} className="space-y-3 border bg-background p-3">` (línea 115)
- `<legend className="px-1 text-sm font-semibold">Bloque {blockNumber}</legend>` (línea 116)
- una fila `<div className="flex flex-wrap items-center justify-end gap-1">` con tres botones icono:
  `Subir bloque N` (ChevronUp), `Bajar bloque N` (ChevronDown), `Eliminar bloque N` (Trash2)
- y a continuación, **siempre visibles**: grid con `Título del bloque N` + `Duración (min) del
  bloque N`, luego `Ejercicio del bloque N (opcional)` (Select), `Recurso (opcional)`
  (`SesionBloqueResourcePicker`) y `Notas del bloque N (opcional)` (Textarea).

`addBlock()` (líneas 60-75) hace `onChange(normalizarOrdenBloques([...bloques, nuevoBloque]))` con
`id: createDraftId()` generado inline. Los ids son estables (UUID) y se usan como `key`.

`getBlockErrors(bloque)` (líneas 36-44) devuelve `{ titulo, duracion }` con mensajes o `null`.

`SesionForm.tsx:817-827` monta el editor con `bloques`/`onChange` y `showErrors={showBloquesErrors}`.
**No requiere cambios.**

## Comportamiento esperado

1. Un bloque **contraído** muestra únicamente: chevron, `legend` «Bloque N», el **título** del
   bloque (o «Bloque N» si está vacío) y la **duración** («10 min» / «Sin duración»), más los
   botones subir/bajar/eliminar.
2. Un bloque **expandido** muestra además todos los campos actuales, sin cambios de layout interno.
3. Al pulsar **«Añadir bloque»**: el nuevo bloque queda **expandido** y **todos los demás
   contraídos**, independientemente de su estado previo.
4. Fuera de ese momento el usuario controla libremente: puede tener 0, algunos o todos expandidos.
5. **Estado inicial al montar**: todos los bloques que llegan por props arrancan **contraídos** (es
   el objetivo declarado: que no ocupen tanto espacio al abrir una sesión existente).

## Contratos e invariantes

- **INV-1 — El estado de colapso es UI pura**: vive en `useState` dentro del editor. No se añade al
  tipo `SesionBloqueDraft`, ni a `onChange`, ni al schema Zod, ni a la BD. `onChange` sigue
  emitiendo exactamente la misma forma de datos que hoy.
- **INV-2 — Identidad por `id`**: el estado se indexa por `bloque.id`, nunca por índice, para que
  subir/bajar/eliminar no reasignen el estado de expansión al bloque equivocado.
- **INV-3 — La cabecera siempre se renderiza**: `Subir/Bajar/Eliminar bloque N` deben seguir en el
  DOM aunque el bloque esté contraído (los tests existentes dependen de ello y es lo usable).
- **INV-4 — Sin desmontar datos**: contraer solo desmonta inputs; el valor vive en `bloques`
  (props), así que expandir de nuevo restaura el contenido intacto. Ya está garantizado por el
  diseño controlado del componente; no añadas caché ni `useEffect` de sincronización.
- **INV-5 — El toggle nunca se deshabilita** con la prop `disabled`. `disabled` bloquea la *edición*
  (inputs y acciones), pero el usuario debe poder abrir un bloque para *leerlo* mientras el
  formulario está enviándose. Los botones subir/bajar/eliminar conservan su `disabled` actual.

## Casos límite

- **Bloque contraído con errores de validación**: si `showErrors` es `true` y el bloque tiene error
  de título o duración, la cabecera muestra un aviso `Revisa este bloque` en color destructivo
  (`text-destructive`) **solo cuando está contraído** (expandido ya se ven los mensajes inline). No
  se auto-expande: el requisito es que el colapso sea libre.
- **Título vacío**: la cabecera usa `getBloqueEtiqueta({ titulo, orden })` de `@/lib/sesionBloques`,
  que ya devuelve `Bloque {orden}` cuando el título está en blanco. **Reutilízalo, no dupliques la
  lógica.**
- **Duración nula**: muestra `Sin duración`. Con valor: `${duracionMinutos} min`.
- **Eliminar un bloque**: su id puede quedar huérfano en el `Set`; es inocuo (ids UUID
  irrepetibles). No añadas limpieza ni efectos por esto.
- **Reordenar**: al mover un bloque, su estado de expansión viaja con él (por INV-2).

## Decisiones prohibidas

- NO instales `@radix-ui/react-collapsible` ni `@radix-ui/react-accordion`, ni crees
  `src/components/ui/collapsible.tsx`. El repo resuelve esto con `useState` + render condicional
  (`SedeAccordionRow.tsx`); sigue esa convención.
- NO uses `useEffect` para sincronizar el estado de expansión con las props (`showErrors`,
  `bloques`). El styleguide prohíbe `setState` dentro de `useEffect`.
- NO uses `hidden` / `display:none` para "contraer" manteniendo los inputs montados: el objetivo es
  que no ocupen espacio y los tests comprueban ausencia en el DOM.
- NO añadas botones «Expandir todos» / «Contraer todos»: fuera de alcance.
- NO toques `SesionForm.tsx`, `src/lib/sesionBloques.ts`, `src/types/sesion-bloques.ts`,
  `src/schemas/`, ni ningún servicio.
- NO cambies el texto ni el `aria-label` de los controles existentes (`Subir bloque N`,
  `Bajar bloque N`, `Eliminar bloque N`, `Título del bloque N`, `Duración (min) del bloque N`,
  `Ejercicio del bloque N (opcional)`, `Notas del bloque N (opcional)`): hay tests que dependen de
  esas etiquetas.

---

### Task 1: Tests del colapso (fase RED)

**Files:**
- Modify: `src/__tests__/components/SesionBloquesEditor.test.tsx`

Ten en cuenta que el helper `renderEditor(initialBloques)` (líneas 51-66) monta el editor con
`showErrors` **siempre a `true`** y con estado controlado vía `useState`.

**Step 1: Adaptar los tests multi-bloque existentes que asumen todo visible**

Con el nuevo comportamiento, los bloques que llegan por props arrancan **contraídos**, así que estos
tests deben expandir antes de tocar inputs. **No cambies sus aserciones finales**, solo añade el
paso de expandir:

- `it("permite repetir ejercicio, editar, borrar y renumerar bloques")` (≈línea 104): antes del
  `fireEvent.change` sobre `/título del bloque 2/i`, añade
  `fireEvent.click(screen.getByRole("button", { name: /expandir bloque 2/i }));`
- `it("bloquea eliminar el último bloque y conserva identidad y contenido al reordenar")`
  (≈línea 119): las aserciones sobre `subir`/`bajar` y sobre `getAllByText(/Bloque [12]/)`
  funcionan contraídas (INV-3), pero la que lee
  `getAllByRole("textbox", { name: /título del bloque/i })[0]` necesita que el bloque 1 esté
  expandido **después** del reordenamiento: añade
  `fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));` justo antes.
  Revisa también el tramo final del test (el bloque «solo») y aplica el mismo criterio si lee
  inputs.

Los tests de un solo bloque que empiezan pulsando «Añadir bloque» (`"añade un bloque y muestra
mensajes semánticos…"`, `"abre el selector de ejercicio…"`, `"muestra la selección de recurso…"`,
`"permite escribir notas…"`) **no deben tocarse**: el bloque recién creado queda expandido.

**Step 2: Añadir los tests nuevos** dentro del mismo `describe("SesionBloquesEditor")`:

```tsx
it("muestra los bloques recibidos contraídos con su título y duración", () => {
  renderEditor([
    { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
  ]);

  expect(screen.getByText("Activación")).toBeInTheDocument();
  expect(screen.getByText("10 min")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /expandir bloque 1/i })).toHaveAttribute("aria-expanded", "false");
});

it("permite expandir y contraer un bloque libremente", () => {
  renderEditor([
    { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
  ]);

  fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
  expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toHaveValue("Activación");

  fireEvent.click(screen.getByRole("button", { name: /contraer bloque 1/i }));
  expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
});

it("al añadir un bloque contrae los anteriores y deja expandido solo el nuevo", () => {
  renderEditor([
    { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
  ]);

  fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
  expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /añadir bloque/i }));

  expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /título del bloque 2/i })).toBeInTheDocument();
});

it("permite tener varios bloques expandidos a la vez", () => {
  renderEditor([
    { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    { id: "dos", titulo: "Principal", duracionMinutos: 20, ejercicioId: null, documentoId: null, notas: null, orden: 2 },
  ]);

  fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
  fireEvent.click(screen.getByRole("button", { name: /expandir bloque 2/i }));

  expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /título del bloque 2/i })).toBeInTheDocument();
});

it("avisa en la cabecera cuando un bloque contraído tiene errores", () => {
  renderEditor([
    { id: "uno", titulo: "", duracionMinutos: null, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
  ]);

  expect(screen.getByText(/revisa este bloque/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
  expect(screen.queryByText(/revisa este bloque/i)).not.toBeInTheDocument();
  expect(screen.getByText("El título es obligatorio.")).toBeInTheDocument();
});
```

**Step 3: Ejecutar y confirmar que fallan por la razón correcta**

Run: `npx vitest run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: **FAIL** —
los tests nuevos y los adaptados fallan porque no existe el botón `Expandir bloque N`. Ningún fallo
debe venir de un error de import o de compilación.

**Step 4: NO implementes nada en esta tarea.** Reporta el resumen de fallos y termina.

---

### Task 2: Implementar el colapso en el editor (fase GREEN)

**Files:**
- Modify: `src/components/sesiones/SesionBloquesEditor.tsx`

**Step 1: Imports y estado**

- Importa `useState` de `react`.
- Añade `ChevronRight` al import existente de `lucide-react`
  (`{ ChevronDown, ChevronRight, ChevronUp, Plus, Trash2 }`, orden alfabético).
- Añade `getBloqueEtiqueta` al import existente de `@/lib/sesionBloques`.
- Dentro del componente:
  `const [bloquesExpandidos, setBloquesExpandidos] = useState<ReadonlySet<string>>(new Set());`
- Añade `function toggleBloque(id: string)` que construya un `Set` **nuevo** con el id añadido o
  quitado (nunca mutes el `Set` anterior).
- En `addBlock()`: extrae el id a una constante antes del `onChange` (hoy se genera inline en el
  objeto literal) y, tras el `onChange`, llama a `setBloquesExpandidos(new Set([nuevoId]))`. Eso
  implementa la regla 3: el nuevo expandido, todos los demás contraídos.

**Step 2: Reestructurar el render de cada bloque** (líneas 115-149 y el cuerpo hasta el cierre del
`fieldset`)

- Mantén `<fieldset key={bloque.id} …>` y `<legend>Bloque {blockNumber}</legend>` tal cual.
- Calcula por bloque, junto a `errors` y `blockNumber`:

```tsx
const abierto = bloquesExpandidos.has(bloque.id);
const contenidoId = `bloque-${bloque.id}-contenido`;
const tieneErrores = !!errors.titulo || !!errors.duracion;
const resumenTitulo = getBloqueEtiqueta({ titulo: bloque.titulo, orden: blockNumber });
const resumenDuracion =
  bloque.duracionMinutos != null ? `${bloque.duracionMinutos} min` : "Sin duración";
```

- Sustituye la fila de acciones `justify-end` por una **cabecera de una sola fila** con el toggle a
  la izquierda y los tres botones icono a la derecha **sin cambiar sus props actuales**
  (`aria-label`, `onClick`, `disabled`):

```tsx
<div className="flex flex-wrap items-center gap-1">
  <button
    type="button"
    onClick={() => toggleBloque(bloque.id)}
    aria-expanded={abierto}
    aria-controls={abierto ? contenidoId : undefined}
    aria-label={`${abierto ? "Contraer" : "Expandir"} bloque ${blockNumber}`}
    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1 py-1 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <ChevronRight
      className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${abierto ? "rotate-90" : ""}`}
    />
    <span className="truncate text-sm font-medium">{resumenTitulo}</span>
    <span className="ml-auto shrink-0 text-sm text-muted-foreground">{resumenDuracion}</span>
  </button>
  {/* botones Subir / Bajar / Eliminar existentes, sin cambios */}
</div>
{!abierto && showErrors && tieneErrores && (
  <p className="px-1 text-sm text-destructive">Revisa este bloque</p>
)}
```

*Justificación del snippet:* el `aria-label` dinámico `Expandir|Contraer bloque N` y el par
`id`/`aria-controls` son el contrato exacto que consultan los tests de la Task 1, y el patrón de
rotación del chevron se copia literalmente de `SedeAccordionRow.tsx` para no divergir de la
convención del repo.

- Envuelve **todo el contenido restante** del bloque (grid título+duración, Select de ejercicio,
  `Recurso`, `Notas`) en:

```tsx
{abierto && (
  <div id={contenidoId} className="space-y-3">
    {/* … campos existentes, sin modificar … */}
  </div>
)}
```

**Step 3: Ejecutar los tests del editor**

Run: `npx vitest run src/__tests__/components/SesionBloquesEditor.test.tsx` · Expected: **PASS**
(todos, nuevos y preexistentes).

**Step 4: Estático y suite completa**

- Run: `npm run lint` · Expected: sin errores
- Run: `npx tsc --noEmit` · Expected: sin errores
- Run: `npx vitest run` · Expected: sin regresiones (`SesionForm.test.tsx` mockea el editor, no
  debería verse afectado).

---

## Notas para el cierre (FASE 4)

- `docs/backlog.md`: marcar la entrada correspondiente si existe; si no, añadir la mejora de UX.
- `docs/design-guides/frontend_styleguide.md`: **solo** si se decide elevar a convención el patrón
  «colapsable con `useState` + render condicional» (ya existe en `SedeAccordionRow`); si no, no
  tocar.
- `docs/crud-audit.md`: **no aplica** (no cambia ninguna entidad ni CRUD).
