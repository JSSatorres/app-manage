# Bloque activo en verde (Ejecutar sesión) — Implementation Plan

**Goal:** Que el bloque activo (el que se está ejecutando) se identifique de un vistazo pintándose en verde tanto en la lista "Bloques de la sesión" como en la tarjeta de "Previsualización".

**Architecture:** Se añade un token de color semántico `--success` (verde) al sistema de diseño (`globals.css`, light + dark, expuesto vía `@theme inline` como `--color-success` / `--color-success-foreground`). En `SesionEjecutarView.tsx` se usa la variable ya existente `isActive` (`bloque.id === activeBlock?.id`) para aplicar clases `bg-success` / `border-success` / `text-success` mediante `cn()`, sin tocar la lógica del runner ni los literales de estado visibles. La previsualización marca su borde en verde solo cuando el bloque previsualizado coincide con el activo, y la línea "Bloque activo: X" siempre se pinta en verde.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4 (`@theme inline`), shadcn/ui (`Button`, `cn`), Vitest + jsdom + Testing Library.

## Perfil de verificación

- Nivel: `standard` + build
- Motivo: cambio de UI puro (presentación) sobre un componente cliente ya existente; no toca auth, permisos, multi-tenant, RLS, datos persistentes ni migraciones. Se añade el `build` porque se modifica el bloque `@theme` de Tailwind v4 y las utilidades `bg-success`/`text-success`/`border-success` solo se generan (y por tanto solo se validan) al compilar.
- Comandos: `npm run lint` · `npx tsc --noEmit` · `npx vitest run src/__tests__/components/SesionEjecutarView.test.tsx` · `npm test` · `npm run build`
- Evidencias esperadas: lint/typecheck sin errores; test dirigido en verde con las nuevas aserciones de clases verdes; suite unitaria completa sin regresiones (los tests existentes de esta vista siguen pasando sin cambiar literales); build OK con las utilidades `success` generadas.

## Incidencias de verificación

<!-- Se rellena durante /auto solo para fallos major/critical. -->

---

## Contexto descubierto (código real)

- `src/components/sesiones/SesionEjecutarView.tsx:95-119` — lista `Bloques de la sesión`. Cada fila es un `<Button>` con `variant={isViewed ? "secondary" : "outline"}` y `className="h-auto w-full justify-between whitespace-normal px-3 py-2 text-left"`.
- `src/components/sesiones/SesionEjecutarView.tsx:99-101` — ya existen `isActive`, `isViewed` y el cálculo de `status` (`"En curso"` | `"Preparado"` | `"Previsualizando"`).
- `src/components/sesiones/SesionEjecutarView.tsx:121` — `<section aria-labelledby="previsualizacion-title" className="space-y-4 rounded-lg border bg-card p-4">`. Su `<h2 id="previsualizacion-title">` contiene **el título del bloque previsualizado**, así que el nombre accesible de la región es ese título (útil para los tests).
- `src/components/sesiones/SesionEjecutarView.tsx:137` — `<p className="text-sm font-medium">Bloque activo: {activeBlock?.titulo}</p>`.
- `src/app/globals.css:10-52` — `@theme inline` mapea `--color-*` a `var(--*)`. `src/app/globals.css:54-91` (`:root`) y `93-121` (`.dark`) definen la paleta. **No existe ningún token verde/`--success`.**
- `src/components/ui/button.tsx:8-30` — variantes `default/outline/secondary/ghost/destructive/link`. No hay variante verde; el override se hace por `className` (el `cn()` del proyecto usa tailwind-merge, así que `bg-success` gana sobre `bg-secondary`/`bg-background`).
- `src/__tests__/components/SesionEjecutarView.test.tsx` — tests existentes que **no se deben romper**: aserciones sobre `toHaveTextContent("Preparado")`, `getByText("Previsualizando")` y `getByRole("button", { name: /previsualizar activación/i })` (regex no anclada).

## Decisiones prohibidas / invariantes

- **No cambiar los literales de estado visibles** (`"En curso"`, `"Preparado"`, `"Previsualizando"`): el usuario pidió color, no textos, y hay tests que dependen de ellos.
- **No inventar un verde arbitrario de Tailwind** (`bg-green-500`, `bg-emerald-*`) en el componente: el proyecto trabaja con tokens semánticos del `@theme`. El verde se define **una vez** en `globals.css`.
- **No añadir una variante nueva a `src/components/ui/button.tsx`** ni tocar componentes `ui/` compartidos: edición quirúrgica limitada a la vista.
- **No tocar** `src/hooks/useSesionRunner.ts` ni `src/lib/sesionRunnerState.ts`: la lógica de ejecución no cambia.
- El verde depende de `isActive` (bloque activo), **no** de `running`: en la captura del usuario el bloque activo estaba pausado y aun así debe distinguirse.
- Accesibilidad: el color no puede ser el único portador de información, así que el `aria-label` del botón activo debe indicarlo.
- LF siempre. UI en español.

---

### Task 1: Token de color `--success` en el sistema de diseño

**Files:**
- Modify: `src/app/globals.css` (bloque `@theme inline` ~línea 10-52; `:root` ~54-91; `.dark` ~93-121)

**Step 1: Añadir las variables de paleta**

En `:root` (modo claro), junto a `--destructive`, añadir:

```css
  --success: #1f7a4d;
  --success-foreground: #ffffff;
```

En `.dark`, junto a `--destructive`, añadir:

```css
  --success: #3fbf7f;
  --success-foreground: #171614;
```

`Justificación del snippet:` son valores de contraste calculados (blanco sobre `#1f7a4d` ≈ 5.3:1; `#171614` sobre `#3fbf7f` ≈ 7.6:1, ambos ≥ 4.5:1 AA) y encajan con la paleta cálida existente. No sustituir por otros verdes sin recalcular contraste.

**Step 2: Exponer el token a Tailwind v4**

Dentro de `@theme inline`, junto a `--color-destructive: var(--destructive);`, añadir:

```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
```

Esto habilita `bg-success`, `text-success`, `border-success`, `text-success-foreground` y sus modificadores de opacidad (`bg-success/90`).

**Step 3: Verificar** — Run: `npx tsc --noEmit` · Expected: PASS (no debe romper nada; la validación real del token es el `build` de la Task 4).

---

### Task 2: Fila verde para el bloque activo en la lista "Bloques de la sesión"

**Files:**
- Modify: `src/components/sesiones/SesionEjecutarView.tsx:95-119` (y el bloque de imports)
- Test: `src/__tests__/components/SesionEjecutarView.test.tsx`

**Step 1: Escribir el test que falla**

Añadir un `it(...)` nuevo dentro del `describe` existente de la vista de ejecución (reutiliza los mocks y `setReadyData()` ya presentes en el archivo; sigue el patrón de los tests vecinos: `await act(async () => { await vi.advanceTimersByTimeAsync(0); })` tras `render`).

```tsx
it("resalta en verde el bloque activo en la lista aunque se previsualice otro", async () => {
  const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
  render(<SesionEjecutarView sesionId={sesion.id} />);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(screen.getByRole("button", { name: /previsualizar activación/i })).toHaveClass("bg-success");
  expect(screen.getByRole("button", { name: /previsualizar parte principal/i })).not.toHaveClass("bg-success");

  fireEvent.click(screen.getByRole("button", { name: /previsualizar parte principal/i }));

  expect(screen.getByRole("button", { name: /previsualizar activación/i })).toHaveClass("bg-success");
  expect(screen.getByRole("button", { name: /previsualizar parte principal/i })).not.toHaveClass("bg-success");
});
```

**Step 2: Ejecutar el test para comprobar que falla** — Run: `npx vitest run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: FAIL (`bg-success` no está en el className).

**Step 3: Implementación mínima**

1. Importar `cn`: `import { cn } from "@/lib/utils";` (junto al resto de imports de `@/lib/*`).
2. En el `<Button>` de cada fila (líneas 104-113):
   - Mantener `variant={isViewed ? "secondary" : "outline"}` (sin cambios).
   - Sustituir el `className` fijo por `cn("h-auto w-full justify-between whitespace-normal px-3 py-2 text-left", isActive && "border-success bg-success text-success-foreground hover:bg-success/90")`.
   - `aria-label`: añadir sufijo cuando esté activo, con template literal: `Previsualizar ${bloque.titulo}` seguido de `${isActive ? " (bloque activo)" : ""}` (los tests existentes usan regex no anclada, así que siguen matcheando; esto cubre el requisito de no depender solo del color).
   - Mantener `aria-current={isViewed ? "true" : undefined}` sin cambios.
3. En el `<span>` del estado (línea 112): `cn("text-xs", isActive ? "text-success-foreground/80" : "text-muted-foreground")` para que el literal siga siendo legible sobre el fondo verde.

**No** tocar el cálculo de `status` ni los literales.

**Step 4: Ejecutar tests** — Run: `npx vitest run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: PASS (el nuevo test y **todos** los existentes del archivo).

---

### Task 3: Verde en la tarjeta de previsualización

**Files:**
- Modify: `src/components/sesiones/SesionEjecutarView.tsx` (líneas 121 y 137, más el cálculo derivado en 47-51)
- Test: `src/__tests__/components/SesionEjecutarView.test.tsx`

**Step 1: Escribir el test que falla**

```tsx
it("marca en verde la previsualización cuando muestra el bloque en ejecución", async () => {
  const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
  render(<SesionEjecutarView sesionId={sesion.id} />);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });

  expect(screen.getByText("Bloque activo: Activación")).toHaveClass("text-success");
  expect(screen.getByRole("region", { name: "Activación" })).toHaveClass("border-success");

  fireEvent.click(screen.getByRole("button", { name: /previsualizar parte principal/i }));

  expect(screen.getByText("Bloque activo: Activación")).toHaveClass("text-success");
  expect(screen.getByRole("region", { name: "Parte principal" })).not.toHaveClass("border-success");
});
```

Notas para el executor:
- `getByText` con string exacto (no regex sin anclar): el `<p>` tiene `textContent === "Bloque activo: Activación"`, mientras que su `<div>` padre incluye además el cronómetro, así que la coincidencia exacta selecciona solo el `<p>`.
- La `<section>` de previsualización expone `role="region"` con nombre accesible igual al título del bloque previsualizado (viene de `aria-labelledby="previsualizacion-title"`).

**Step 2: Ejecutar el test para comprobar que falla** — Run: `npx vitest run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: FAIL.

**Step 3: Implementación mínima**

1. Junto a los cálculos derivados ya existentes (`viewedBlock`, `activeBlock`, `isRunning`, `viewedIndex`, líneas 47-51), añadir:
   `const isViewingActiveBlock = Boolean(viewedBlock && activeBlock && viewedBlock.id === activeBlock.id);`
2. `<section aria-labelledby="previsualizacion-title" ...>` (línea 121) pasa a `className={cn("space-y-4 rounded-lg border bg-card p-4", isViewingActiveBlock && "border-success")}`.
3. Línea de bloque activo (137) pasa a `<p className="text-sm font-medium text-success">Bloque activo: {activeBlock?.titulo}</p>`.

No tocar el `role="timer"` ni los botones de control.

**Step 4: Ejecutar tests** — Run: `npx vitest run src/__tests__/components/SesionEjecutarView.test.tsx` · Expected: PASS (todos).

---

### Task 4: Verificación estática, suite y build

**Files:** ninguno (solo comprobación).

- **Step 1:** `npm run lint` · Expected: PASS
- **Step 2:** `npx tsc --noEmit` · Expected: PASS
- **Step 3:** `npm test` (suite unitaria completa) · Expected: PASS sin regresiones
- **Step 4:** `npm run build` · Expected: PASS — confirma que Tailwind v4 genera `bg-success`, `text-success`, `border-success` y `text-success-foreground` desde el nuevo `@theme`.

---

## Criterios de aceptación

1. Con la sesión abierta en `/sesiones/<id>/ejecutar`, la fila del bloque **activo** de la lista "Bloques de la sesión" se ve con fondo verde y texto legible, aunque se esté previsualizando otro bloque.
2. Ningún bloque no activo se ve verde; el bloque previsualizado (si no es el activo) conserva su realce `secondary` actual.
3. En la tarjeta "Previsualización", la línea `Bloque activo: X` se muestra en verde.
4. El borde de la tarjeta "Previsualización" es verde **solo** cuando el bloque previsualizado es el bloque en ejecución.
5. Los literales `"En curso"`, `"Preparado"` y `"Previsualizando"` no cambian, y los tests previos de la vista siguen en verde.
6. El botón del bloque activo comunica su estado también por `aria-label` (no solo por color).
