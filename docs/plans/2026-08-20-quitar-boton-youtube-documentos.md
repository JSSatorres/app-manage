# Quitar botón «Añadir vídeo de YouTube» de Documentos — Implementation Plan

**Goal:** Eliminar el botón secundario «Añadir vídeo de YouTube» de la cabecera de Documentos,
porque el flujo de alta de YouTube ya está cubierto por el botón «Subir» → diálogo
«¿Cómo quieres subir el documento?» → opción «YouTube».

**Architecture:** Cambio de UI puro y sustractivo en `DocumentosListView`. Se borra el bloque JSX
condicionado por `hasYouTubeAsset` y el propio derivado `hasYouTubeAsset`, que queda sin uso. El
mapa `providerTitles` NO se toca: sigue dando el título del diálogo del formulario
(`providerTitles[formProvider]`), incluido «Añadir vídeo de YouTube» como nombre accesible del
diálogo. Se ajustan el test unitario y el paso E2E que dependían del botón eliminado.

**Tech Stack:** React 19 / Next.js 16, Vitest + Testing Library, Playwright.

## Perfil de verificación

- Nivel: `standard`
- Motivo: cambio de UI aislado en un componente, sin datos, sin migraciones, sin API. Riesgo
  bajo; el único riesgo real es dejar referencias muertas (variable sin uso, test que busca un
  botón inexistente) que rompan lint/typecheck o la suite.
- Comandos: `npm run lint` · `npx tsc --noEmit` ·
  `npx vitest run src/__tests__/components/DocumentosListView.test.tsx` · `npm run test`
- Evidencias esperadas: lint y typecheck limpios (sin `hasYouTubeAsset` no usado), suite unitaria
  en verde, y en `DocumentosListView.tsx` sólo queda el botón «Subir» en la barra de acciones.

## Incidencias de verificación

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

---

### Task 1: Eliminar el botón y sus referencias

**Files:**
- Modify: `src/components/documentos/DocumentosListView.tsx:81` (borrar `hasYouTubeAsset`)
- Modify: `src/components/documentos/DocumentosListView.tsx:246-250` (borrar el bloque JSX)
- Test: `src/__tests__/components/DocumentosListView.test.tsx:272-281` (borrar el test obsoleto)
- Test: `e2e/documentos-multifuente.spec.ts:126-128` (borrar los 3 pasos obsoletos)

**Contexto actual (no reescribir el archivo, sólo estos diffs):**

En `DocumentosListView.tsx` la barra de acciones es hoy:

```tsx
{puedeMutar ? (
  <div className="flex flex-wrap gap-2">
    <Button type="button" onClick={handleUploadRequest}>
      Subir
    </Button>
    {hasYouTubeAsset ? (
      <Button type="button" variant="outline" onClick={() => handleCreate("youtube")}>
        Añadir vídeo de YouTube
      </Button>
    ) : null}
  </div>
) : null}
```

**Step 1: Ajustar el test unitario a la nueva expectativa (rojo→verde por borrado)**

En `src/__tests__/components/DocumentosListView.test.tsx`, **borrar por completo** este test, que
verifica precisamente el botón que se elimina:

```tsx
it("permite añadir otro vídeo de YouTube desde un catálogo poblado", () => {
  render(<DocumentosListView />)

  expect(screen.getByRole("row", { name: "Fila de youtube" })).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "Añadir vídeo de YouTube" }))

  expect(
    screen.getByRole("dialog", { name: "Formulario youtube" }),
  ).toBeInTheDocument()
})
```

En el test que ya comprueba la barra de acciones (el que contiene
`expect(screen.getByRole("button", { name: "Subir" })).toBeEnabled()`), **añadir justo debajo** la
aserción negativa que fija el comportamiento nuevo:

```tsx
expect(
  screen.queryByRole("button", { name: "Añadir vídeo de YouTube" }),
).not.toBeInTheDocument()
```

**Step 2: Ejecutar el test para verlo fallar** —
Run: `npx vitest run src/__tests__/components/DocumentosListView.test.tsx` · Expected: FAIL
(la aserción negativa falla porque el botón todavía se renderiza).

**Step 3: Implementación mínima**

1. En `DocumentosListView.tsx`, dejar la barra de acciones así:

```tsx
{puedeMutar ? (
  <div className="flex flex-wrap gap-2">
    <Button type="button" onClick={handleUploadRequest}>
      Subir
    </Button>
  </div>
) : null}
```

2. Borrar la línea 81, que queda sin uso:

```tsx
const hasYouTubeAsset = assets.some((asset) => asset.provider === "youtube")
```

**Forbidden decisions:**
- NO tocar `const providerTitles` ni la línea `title={... providerTitles[formProvider] ...}`:
  «Añadir vídeo de YouTube» sigue siendo el título del diálogo del formulario.
- NO tocar `DocumentoUploadMethodDialog` ni `handleCreate`.
- NO tocar `src/components/documentos/DocumentoProviderEmptyState.tsx`.
- NO quitar el `<div className="flex flex-wrap gap-2">` aunque quede un solo hijo.

**Step 4: Ejecutar el test para verlo pasar** —
Run: `npx vitest run src/__tests__/components/DocumentosListView.test.tsx` · Expected: PASS

**Step 5: Ajustar el E2E**

En `e2e/documentos-multifuente.spec.ts`, dentro del test
«el alta de YouTube y Drive persiste activos del workspace…», **borrar estas tres líneas**
(sobran porque ya no existe el botón):

```ts
await page.getByRole("button", { name: "Añadir vídeo de YouTube", exact: true }).click();
await expect(youtubeDialog).toBeVisible();
await youtubeDialog.getByRole("button", { name: "Cancelar" }).click();
```

NO tocar el resto de referencias a `"Añadir vídeo de YouTube"` de ese archivo (líneas ~85, ~86 y
~106): apuntan al **diálogo**, no al botón, y siguen siendo válidas.

**Step 6: Estático + suite** —
Run: `npm run lint` · `npx tsc --noEmit` · `npm run test` · Expected: PASS en los tres.

---

## Cierre

- **Estado:** COMPLETADO (20/08/2026). Task 1 ejecutada; sin migraciones, sin git (`GIT=off`).
- **Archivos tocados:** `src/components/documentos/DocumentosListView.tsx`,
  `src/__tests__/components/DocumentosListView.test.tsx`, `e2e/documentos-multifuente.spec.ts`.
- **Verificación `standard` — PASA (1ª ronda, sin remediación):** `npm run lint` limpio ·
  `npx tsc --noEmit` 0 errores · `npx vitest run src/__tests__/components/DocumentosListView.test.tsx`
  22/22 · `npm run test` 691/691 en 113 archivos · revisión estática de
  `e2e/documentos-multifuente.spec.ts` (las 3 referencias restantes a «Añadir vídeo de YouTube»
  apuntan al diálogo, no a un botón de página; `youtubeDialog` sigue en uso).
- **Documentación:** `docs/backlog.md` → **B11-5** `[x]`; `docs/crud-audit.md` → nota en
  «Activos multifuente y cuota (V1)» sobre el alta unificada desde «Subir».
