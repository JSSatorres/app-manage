# Columna «Contenido» de Documentos: mostrar el título real — Implementation Plan

**Goal:** Que la columna «Contenido» del listado de Documentos muestre el **título del documento**
(`documentos.titulo`) en lugar de identificadores crudos (el UUID del `storage_path` para archivos
subidos, el `videoId` de YouTube o el `fileId` de Drive en el subtítulo).

**Architecture:** Cambio de UI puro, **sin migración**. La tabla `content_assets` no tiene columna
de título y no hace falta: `DocumentosListView` ya construye `documentsByAsset`
(`Map<contentAssetId, Documento>`) para las asociaciones, editar y borrar. Se reutiliza ese mapa
para pasar un nuevo prop `titlesByAssetId: Record<string, string>` a `DocumentoProviderList`, igual
que ya se hace con `associationsByAssetId`. `getAssetTitle` pasa a resolver primero ese título y
solo cae a una etiqueta genérica del proveedor cuando no hay documento asociado; el fallback de
`supabase_storage` deja de exponer el UUID del path y usa «Archivo privado», que es exactamente la
etiqueta que ya usa `DocumentoPreviewDialog` (`src/components/documentos/DocumentoPreviewDialog.tsx:30`).
El subtítulo deja de mostrar el ID externo cuando ya hay un título de verdad.

**Tech Stack:** React 19 / Next.js 16, shadcn/ui `DataTable`, Vitest + Testing Library, Playwright.

## Perfil de verificación

- Nivel: `standard`
- Motivo: cambio de presentación aislado en dos componentes de `documentos/`. Sin datos nuevos, sin
  servicios, sin schemas, sin migraciones. El riesgo real es de **contrato de accesibilidad**: los
  `aria-label` de las acciones (`Ver ${title}`, `Editar ${title}`, `Eliminar ${title}`) derivan del
  mismo `getAssetTitle`, así que cambian con el título y varios selectores de tests y E2E los usan.
- Comandos: `npm run lint` · `npx tsc --noEmit` ·
  `npx vitest run src/__tests__/components/DocumentoProviderList.test.tsx src/__tests__/components/DocumentosListView.test.tsx` ·
  `npm run test`
- Evidencias esperadas: lint y typecheck limpios; suite unitaria en verde; tests nuevos que
  demuestran que (a) con documento asociado se pinta el título y **no** aparece el último segmento
  del `storagePath`, y (b) sin documento asociado se pinta «Archivo privado» y tampoco el UUID.
  `e2e/documentos-multifuente.spec.ts` realineado con los nuevos textos (no se ejecuta la suite E2E:
  requiere la BD de desarrollo y es cara; su corrección se valida por typecheck + revisión de los
  títulos que siembra la fixture en `e2e/fixtures/documentos.ts:338-367`).

## Incidencias de verificación

<!-- Se rellena durante /exec o /auto solo para fallos major/critical. -->

---

## Contexto imprescindible

Comportamiento actual de `src/components/documentos/DocumentoProviderList.tsx:57-81`:

```ts
function getAssetTitle(asset: ContentAsset) {
  switch (asset.provider) {
    case "youtube":           return "Vídeo de YouTube"
    case "google_drive":      return "Archivo de Google Drive"
    case "supabase_storage":  return asset.storagePath.split("/").at(-1) ?? "Archivo privado"
    case "external_legacy":   return "Enlace anterior"
  }
}

function getAssetMetadata(asset: ContentAsset) {
  switch (asset.provider) {
    case "youtube":           return `Vídeo ${asset.externalResourceId}`
    case "google_drive":      return asset.fileId ? `Archivo ${asset.fileId}` : "Archivo de Drive"
    case "supabase_storage":  return `${formatBytes(asset.sizeBytes)} · ${asset.mimeType}`
    case "external_legacy":   return "Enlace conservado de una fuente anterior"
  }
}
```

La raíz del bug: en producción el path que genera la BD es
`format('%s/%s/%s', workspace_id, asset_id, gen_random_uuid())`
(`supabase/migrations/20260808180000_documentos_multifuente_cuotas.sql:280`), es decir el último
segmento **es un UUID sin nombre ni extensión**. Por eso la fila muestra
`fbb7aaf7-8493-4286-8ca6-bee14110e17a`. La fixture E2E, en cambio, siembra un path acabado en
`fixture-privado.pdf` (`e2e/fixtures/documentos.ts:265`), y por eso la suite E2E nunca detectó esto.

Contrato del título resultante (**invariante**: `getAssetTitle` sigue siendo la única fuente del
texto principal y de los `aria-label` de acciones, para que ambos no se desincronicen):

| Caso | Texto principal | Subtítulo |
|---|---|---|
| Con documento asociado (cualquier proveedor) | `documento.titulo` | YouTube → «Vídeo de YouTube» · Drive → «Archivo de Google Drive» · Storage → `790.3 KB · application/pdf` · Legacy → «Enlace conservado de una fuente anterior» |
| Sin documento asociado | «Vídeo de YouTube» / «Archivo de Google Drive» / «Archivo privado» / «Enlace anterior» | comportamiento actual (`Vídeo ${externalResourceId}`, `Archivo ${fileId}`, tamaño·mime, texto legacy) |

**Prohibido:** añadir una columna `title` a `content_assets` (no hay migración en esta tarea);
volver a leer `storagePath` para construir texto visible; duplicar la lógica de título en
`DocumentosListView` (el componente de lista es el dueño del fallback).

---

### Task 1: Tests de la columna «Contenido» (rojo primero)

**Files:**
- Modify: `src/__tests__/components/DocumentoProviderList.test.tsx`

**Pasos:**

1. Añade junto a `youtubeAsset` (línea 6) una fixture de almacenamiento que reproduzca el path real
   de producción, con UUID final y **sin** nombre de archivo:

   ```ts
   const storageAsset: ContentAsset = {
     id: "asset-storage",
     workspaceId: "workspace-1",
     provider: "supabase_storage",
     status: "ready",
     storagePath: "workspace-1/asset-storage/fbb7aaf7-8493-4286-8ca6-bee14110e17a",
     sizeBytes: 809267,
     mimeType: "application/pdf",
     createdBy: "user-1",
     createdAt: "2026-08-09T10:00:00.000Z",
     updatedAt: "2026-08-09T10:00:00.000Z",
   }
   ```

   Comprueba los campos exactos contra `src/types/content-assets.ts:65-70` antes de escribirla; si
   el tipo pide algún campo más, añádelo, no uses `as ContentAsset`.

2. Añade un test `it("muestra el título del documento asociado en lugar del identificador del proveedor", …)`
   que renderice `<DocumentoProviderList assets={[storageAsset, youtubeAsset]} … titlesByAssetId={{ "asset-storage": "Protocolo de lesiones", "asset-youtube": "Calentamiento pretemporada" }} />`
   y asserte:
   - `expect(screen.getByText("Protocolo de lesiones")).toBeInTheDocument()`
   - `expect(screen.getByText("Calentamiento pretemporada")).toBeInTheDocument()`
   - `expect(screen.queryByText(/fbb7aaf7/)).not.toBeInTheDocument()` ← **la assertion que fija el bug**
   - `expect(screen.queryByText("Vídeo dQw4w9WgXcQ")).not.toBeInTheDocument()`
   - `expect(screen.getByText("790.3 KB · application/pdf")).toBeInTheDocument()` (el subtítulo de
     storage se conserva; verifica el número exacto con `formatBytes` antes de fijarlo)
   - `expect(screen.getByRole("button", { name: "Ver Protocolo de lesiones" })).toBeInTheDocument()`

3. Añade un segundo test `it("cae a una etiqueta genérica cuando el activo no tiene documento asociado", …)`
   que renderice solo `storageAsset` **sin** `titlesByAssetId` y asserte:
   - `expect(screen.getByText("Archivo privado")).toBeInTheDocument()`
   - `expect(screen.queryByText(/fbb7aaf7/)).not.toBeInTheDocument()`

4. **No toques** los tres tests existentes: siguen sin pasar `titlesByAssetId`, así que deben seguir
   viendo «Vídeo de YouTube» y los `aria-label` `Ver/Editar/Eliminar Vídeo de YouTube`. Son la red
   que protege el camino de fallback.

**Verificar:** `npx vitest run src/__tests__/components/DocumentoProviderList.test.tsx`
→ los dos tests nuevos deben **fallar** (typecheck del prop inexistente y/o texto no encontrado) y
los tres antiguos seguir en verde.

---

### Task 2: Resolver el título en `DocumentoProviderList`

**Files:**
- Modify: `src/components/documentos/DocumentoProviderList.tsx`

**Pasos:**

1. En `DocumentoProviderListProps` (línea 17) añade, junto a `associationsByAssetId`:
   `titlesByAssetId?: Record<string, string>`, y en la firma del componente (línea 103)
   desestructura `titlesByAssetId = {}`.

2. Renombra la lógica actual de `getAssetTitle` a `getProviderFallbackTitle(asset)` cambiando **solo**
   el caso `supabase_storage`, que pasa a `return "Archivo privado"` (fuera el `storagePath.split`).

3. Crea el resolutor, que toma el título del mapa y recorta espacios:

   ```ts
   function getAssetTitle(asset: ContentAsset, titlesByAssetId: Record<string, string>) {
     const titulo = titlesByAssetId[asset.id]?.trim()
     return titulo ? titulo : getProviderFallbackTitle(asset)
   }
   ```

4. `getAssetMetadata(asset, hasTitle: boolean)`: cuando `hasTitle` es `true`, YouTube devuelve
   `"Vídeo de YouTube"` y Drive `"Archivo de Google Drive"` (el ID externo ya no aporta nada y era
   parte de la queja). Con `hasTitle` `false` se mantiene el texto actual de cada caso.
   `supabase_storage` y `external_legacy` no cambian nunca.

5. En la columna `titulo` (líneas 120-130) usa el resolutor **también en `accessor`** (ordenación y
   búsqueda del `DataTable` deben ver el mismo texto que se pinta) y calcula el subtítulo con
   `getAssetMetadata(asset, hasTitle)`, donde
   `const hasTitle = Boolean(titlesByAssetId[asset.id]?.trim())`.

6. En la columna `acciones` (línea 169) sustituye `const title = getAssetTitle(asset)` por
   `const title = getAssetTitle(asset, titlesByAssetId)`. **No cambies nada más de esa columna.**

7. Añade `titlesByAssetId` al array de dependencias del `useMemo` de columnas (línea 222).

**Verificar:** `npx vitest run src/__tests__/components/DocumentoProviderList.test.tsx` → los 5 en
verde. Después `npx tsc --noEmit`.

---

### Task 3: Cablear los títulos desde `DocumentosListView`

**Files:**
- Modify: `src/components/documentos/DocumentosListView.tsx`
- Modify: `src/__tests__/components/DocumentosListView.test.tsx`

**Pasos:**

1. En el mock de `DocumentoProviderList` del test (líneas 206-233) añade `titlesByAssetId` a la
   desestructuración y a su tipo (`titlesByAssetId?: Record<string, string>`), y píntalo dentro de
   cada fila: `<p>{titlesByAssetId?.[asset.id] ?? "sin título"}</p>`.

2. Añade un test que, con la data de documentos ya mockeada en ese archivo, asserte que la fila del
   activo con documento asociado muestra el `titulo` de ese documento. Reutiliza las fixtures y el
   helper de render que ya usan los tests de asociaciones de ese mismo archivo — **no montes un
   arnés nuevo**. Ejecuta y confirma que **falla**.

3. En `DocumentosListView.tsx`, justo después del `useMemo` `documentsByAsset` (líneas 120-126),
   añade:

   ```tsx
   const titlesByAssetId = useMemo(() => {
     const result: Record<string, string> = {}
     for (const [assetId, document] of documentsByAsset) {
       const titulo = document.titulo?.trim() || document.fileName?.trim()
       if (titulo) result[assetId] = titulo
     }
     return result
   }, [documentsByAsset])
   ```

4. Pásalo al componente en el JSX (líneas 260-271), junto a `associationsByAssetId`.

**Verificar:** `npx vitest run src/__tests__/components/DocumentosListView.test.tsx` → verde.

---

### Task 4: Realinear las aserciones E2E con los nuevos textos

**Files:**
- Modify: `e2e/documentos-multifuente.spec.ts`

**Contexto:** la fixture (`e2e/fixtures/documentos.ts:338-367`) crea un `documentos` con `titulo`
para **todos** los activos, así que tras el cambio el texto principal de cada fila pasa a ser ese
título y los `aria-label` de las acciones también. Títulos sembrados (con
`p = fixture.cleanupPrefix`): `` `${p} vídeo ${asset.resourceId}` `` por cada YouTube,
`` `${p} vídeo alternativo` `` (fallback), `` `${p} enlace Drive` `` (drive),
`` `${p} archivo privado` `` (storage), `` `${p} enlace legacy` `` (legacy).

**Pasos (cada aserción, una a una — no reescribas el fichero):**

1. Línea 168: `Archivo ${driveId}` ya no se pinta (ese documento se acaba de crear por UI con título
   «E2E enlace Drive»). Cámbiala por
   `await expect(page.getByText("E2E enlace Drive", { exact: true })).toBeVisible();`
2. Línea 171: `fixture-privado.pdf` ya no es el texto principal. Cámbiala por el título sembrado:
   `` await expect(page.getByText(`${fixture.cleanupPrefix} archivo privado`, { exact: true })).toBeVisible(); ``
3. Líneas 181-182 y 189-190: el `.filter({ hasText: … })` debe pasar a filtrar por el **título** del
   documento (`` `${fixture.cleanupPrefix} vídeo ${youtubeAsset.resourceId}` `` y
   `` `${fixture.cleanupPrefix} vídeo alternativo` ``) y el botón por
   `` { name: `Ver ${eseMismoTitulo}` } ``. **Ojo:** el `hasText` con string es sensible a
   mayúsculas y el título siembra «vídeo» en minúscula.
   Las líneas 183 y 192 (`Previsualización de Vídeo de YouTube`) **no se tocan**: ese título lo
   genera `DocumentoPreviewDialog`, que no cambia en este plan.
4. Líneas 195-196: filtra por `` `${fixture.cleanupPrefix} enlace Drive` `` y el botón pasa a
   `` { name: `Ver ${fixture.cleanupPrefix} enlace Drive` } ``.
5. Líneas 214-218: el filtro por «Enlace conservado de una fuente anterior» sigue valiendo (es el
   subtítulo de legacy, que no cambia), pero los tres botones pasan a
   `Ver/Editar/Eliminar ${fixture.cleanupPrefix} enlace legacy`.
6. Líneas 237 y 241: `Ver fixture-privado.pdf` / `Eliminar fixture-privado.pdf` pasan a
   `` `Ver ${fixture.cleanupPrefix} archivo privado` `` y `` `Eliminar …` ``. La línea 238
   (`dialog` con nombre «Archivo privado») **no se toca**.
7. Repasa el resto del fichero con
   `grep -n "Vídeo de YouTube|Archivo de Google Drive|Enlace anterior|fixture-privado" e2e/documentos-multifuente.spec.ts`
   y decide caso por caso si el texto viene de la lista (cambia) o del diálogo de vista previa (no cambia).

**Verificar:** `npx tsc --noEmit` (compila los specs) y `npm run lint`. La suite E2E **no se ejecuta**
en este plan.

---

### Task 5: Verificación completa

`npm run lint` · `npx tsc --noEmit` · `npm run test`. Todo en verde antes de documentar.

---

## Resultado (20/08/2026)

- **Verificación `standard`: PASA.** `npm run lint` limpio · `npx tsc --noEmit` limpio ·
  dirigidos 30/30 · suite completa 113 archivos / 697 tests en verde.
- Sin migración, sin cambios en servicios ni schemas. `DocumentoPreviewDialog.tsx` con diff cero.
- E2E no ejecutado (bloqueo preexistente de `SUPABASE_SERVICE_ROLE_KEY`, mismo que B11-6);
  `e2e/documentos-multifuente.spec.ts` realineado a mano contra los títulos de la fixture.
- Backlog: `B11-7` marcado `[x]`.
