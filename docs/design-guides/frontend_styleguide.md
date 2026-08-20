# Frontend styleguide — manage-sport-app

Cómo se escribe la UI en este proyecto. Léela antes de tocar `src/app/`, `src/components/` o
`src/hooks/`. Complementa (no repite) `AGENTS.md`.

## Stack y versiones

- **Next.js 16** (App Router, Turbopack) — hay breaking changes; consulta
  `node_modules/next/dist/docs/` antes de asumir APIs de v13-15.
- **React 19** · **TypeScript estricto** (nada de `any` ni `as any`).
- **shadcn/ui** (base en `src/components/ui/`) + **Tailwind CSS v4** + **Framer Motion**.
- **React Hook Form + Zod** (formularios) · **Zustand** (estado global) · **React Query /
  TanStack Query** (server state) vía los wrappers `useQuery`/`useMutation`.
- **Idioma de la UI: español** (textos, labels, mensajes de error visibles).

## Tokens de color

- La paleta vive **solo** en `src/app/globals.css`: los valores en `:root` y `.dark`, y su mapeo a
  utilidades de Tailwind v4 en el bloque `@theme inline` (`--color-<token>: var(--<token>);`).
- **Nunca** uses colores crudos de Tailwind (`bg-green-500`, `text-emerald-600`) ni hex inline en
  un componente: si falta un color semántico, se añade como token y se usa vía `bg-*`/`text-*`/
  `border-*`. Tokens disponibles: `background`, `foreground`, `card`, `popover`, `primary`,
  `secondary`, `muted`, `accent`, `destructive`, **`success`**, `border`, `input`, `ring`,
  `chart-1..5` y la familia `sidebar-*`.
- `success` (verde: `#1f7a4d` en claro, `#3fbf7f` en oscuro, con su `success-foreground`) marca
  estado **en curso / activo**; `destructive` marca error o acción peligrosa. Cualquier token nuevo
  debe cumplir contraste **AA (≥ 4.5:1)** con su `-foreground` en ambos temas.
- El color nunca es el único portador de información: acompáñalo de texto visible, `aria-label` o
  `aria-current`.
- Para variar un color de una variante de `ui/`, pasa las clases por `cn()` en el consumidor
  (tailwind-merge resuelve el conflicto); no añadas variantes nuevas a `src/components/ui/`.

## Estructura de carpetas

```
src/app/(dashboard)/[dominio]/page.tsx   Página del módulo (ruta autenticada)
src/components/[dominio]/                 Componentes específicos (ListView, Form, Dialog…)
src/components/shared/                    Reutilizables (DataTable, PageHeader…)
src/components/ui/                        Base shadcn/ui — no editar salvo actualización de shadcn
src/hooks/use[Dominio].ts                 Hook de dominio (envuelve useQuery/useMutation)
```

**Crear un módulo nuevo** (sigue el patrón de `sedes`): tipo en `src/types/`, schema en
`src/schemas/`, servicio en `src/services/` (ver [`data_styleguide.md`](data_styleguide.md)),
componentes en `src/components/[dominio]/`, hook `use[Dominio]`, página en
`src/app/(dashboard)/[dominio]/page.tsx`.

## Convenciones de naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes y sus ficheros | **PascalCase** | `SesionDetalleDialog.tsx` |
| Hooks | `use` + **PascalCase dominio** | `useSedes.ts`, `useEntrenadoresLookup.ts` |
| Variables, funciones, props | **camelCase** | `createOne`, `workspaceId` |
| Tipos / interfaces del dominio | **PascalCase**, campos **camelCase** | `Sede`, `SedeCreateInput` |
| Rutas / carpetas de dominio | **kebab/lowercase singular o plural** según ya existe | `sesiones/`, `sedes/` |
| Textos de UI | **español** | `"Guardar cambios"` |

## Estado y data-fetching

- **Server state → React Query** a través de `useQuery`/`useMutation` (`src/hooks/`). No llames a
  React Query directo desde componentes: usa el hook de dominio `use[Dominio]` que envuelve el
  servicio y expone `{ data, loading, createOne, updateOne, deleteOne, … }` (ver `useSedes.ts`).
- **Query keys** centralizadas en `src/hooks/queryKeys.ts`. Al mutar, **invalida** las keys de los
  dominios relacionados (ej. mutar una sede invalida `equipos`, `jugadores`, `entrenadores`).
- **El `workspaceId` viaja siempre al servicio y a la key.** Varios servicios multi-tenant cortan en
  silencio si les falta (`fetchDocumentosDisponibles` devuelve `{ data: [] }` sin `workspaceId`): el
  selector queda vacío sin error visible. Pasa el workspace activo como argumento **y** úsalo en la
  key para aislar la caché por tenant (patrón: `EjercicioForm.tsx` y `SesionForm.tsx` con
  `queryKeys.documentos.available(workspaceId, sedeIds)`).
- **Estado global de cliente → Zustand** (`src/store/`). El workspace/sedes activos van por
  `useWorkspaceContext`.
- **Autenticación → `useAuth`** (Supabase Auth, OAuth Google/PKCE).

### Bloqueo global de mutaciones

- `RequestLockProvider` observa automáticamente las mutaciones de React Query. Las operaciones asíncronas persistentes o acciones externas ejecutadas fuera de ese wrapper deben usar `useRequestLock().run`.
- Conserva las guardas locales síncronas contra el doble envío y los flags visuales de cada formulario o acción.
- Los portales externos quedan inertes mientras el bloqueo está activo y se restauran al liberarlo.
- El bloqueo de navegación solo cubre la navegación intra-DOM; no promete cancelar atrás/adelante, recarga, cierre, destinos externos ni redirecciones inevitables, ni usa `beforeunload` como garantía.
- Las exportaciones y lecturas no son mutaciones y quedan fuera del bloqueo.

### Runner de sesiones por bloques (alcance local implementado)

- Un bloque expone **siempre** los tres contenidos a la vez —ejercicio, recurso/Documento y notas de
  texto libre—, todos opcionales e independientes entre sí; no hay selector de "tipo de contenido"
  ni pestañas. Solo título y duración son obligatorios, y sigue haciendo falta al menos un bloque
  para guardar la sesión. `SesionEjecutarView` solo pinta la línea de ejercicio y la de notas cuando
  existen, y las notas usan `whitespace-pre-line` para conservar los saltos de línea del `Textarea`.
- El **bloque activo** (`isActive`, es decir `bloque.id === activeBlock?.id`, con independencia de
  si el temporizador corre) se pinta con el token `success`: fila verde en la lista «Bloques de la
  sesión» y borde verde en la tarjeta de previsualización **solo** cuando el bloque previsualizado
  es el activo. La línea «Bloque activo: X» va siempre en `text-success`. El bloque previsualizado
  que no es el activo conserva su realce `secondary`. Además del color, el botón activo lo indica en
  su `aria-label` (« (bloque activo)»).
- `useSesionRunner` persiste únicamente progreso temporal en una clave `localStorage` versionada y aislada por usuario, workspace y sesión; nunca Documento, URL ni progreso en Supabase.
- El restante se deriva de `startedAtEpochMs`, no de descuentos por intervalo. Si el reloj retrocede, se reconcilia sin añadir tiempo y se informa al usuario.
- Al hidratar, versión, identidad o `blocksSignature` distinta (`id`/`orden`/`duracion`) invalida el estado completo para no mezclar una definición editada.
- Las pestañas se sincronizan con `storage`: prevalece una revisión mayor; en empate se comparan `updatedAtEpochMs` y `writerTabId`. Este contrato se limita al runner de sesiones por bloques.

### Listados multifuente y cuota

- `/documentos` muestra una lista unificada; el proveedor es metadato de cada fila, no una pestaña ni un filtro que oculte otros orígenes. El alta usa un selector independiente de YouTube, Google Drive o Almacenamiento.
- Con sede activa, `/documentos` resuelve una vez los `contentAssetId` editoriales visibles y los pasa a un único catálogo sin filtro de proveedor; sin sede pasa `undefined` para conservar el catálogo completo del workspace. Pagina ese catálogo unificado en servidor con `limit/offset` y recuento exacto; no repitas pivotes ni lecturas de activos por origen.
- Distingue carga, error recuperable con reintento, lista vacía y datos; si ya hay filas, un error no debe ocultarlas. Conserva visible la tarjeta de cuota/ampliación de Storage aunque la lista combine proveedores.
- Las mutaciones de activos invalidan documentos/contentAssets; cuota y ampliación invalidan también storage-usage/storage-upgrades.
- Una URL firmada se pide al abrir y no se guarda en el estado. La UI aclara proveedor externo y activación manual de ampliación.
- Las altas de Documento preseleccionan la sede activa; al editar prevalecen siempre las asociaciones persistidas, incluido el documento global sin sede.
- En enlaces con `contentAssetId`, la URL es la identidad del activo y se muestra de solo lectura al editar; el modal modifica metadatos y asociaciones, y un cambio de recurso se realiza mediante una nueva alta.
## Formularios

- **React Hook Form + `@hookform/resolvers` con Zod** (`zodResolver`). El schema es la fuente de
  verdad de validación y vive en `src/schemas/` (ver data guide).
- Componentes de `src/components/ui/` (`Input`, `Label`, `Button`, `Dialog`, `Select`…).
- Mensajes de error y estados de carga en español.
- **Alcance «global» de una entidad con sedes** → `Switch` **Global** (`aria-label="Global"`) que
  oculta el selector de sedes y vacía los campos dependientes al activarse; patrón compartido por
  `EjercicioForm` y `DocumentoForm`.

## Listados

- Usa **`DataTable`** de `src/components/shared/DataTable.tsx` con **columnas tipadas**. No montes
  tablas a mano.

## Secciones colapsables

No usamos `Collapsible`/`Accordion` de Radix: el patrón del proyecto es **`useState` + render
condicional**, sin dependencias nuevas.

- Estado de apertura en `useState` **local** del componente contenedor. Si hay varios elementos,
  un `ReadonlySet<string>` indexado por **id estable**, nunca por índice (reordenar o eliminar no
  debe reasignar la apertura al elemento equivocado). Construye siempre un `Set` nuevo al alternar.
- El disparador es un `<button type="button">` con `aria-expanded`, `aria-controls` (el `id` del
  contenedor de contenido, solo cuando está abierto) y `aria-label` que describa la acción
  (`Expandir bloque 3` / `Contraer bloque 3`).
- Indicador visual: `ChevronRight` de `lucide-react` con
  `transition-transform duration-200` y `rotate-90` cuando está abierto.
- El contenido se **desmonta** (`{abierto && …}`), no se oculta con `hidden`/`display:none`. Si es
  un formulario, el valor debe vivir en el estado del padre para que reabrir lo restaure intacto.
- El disparador **no** se deshabilita con la prop `disabled` del formulario: bloquear la edición no
  debe impedir leer el contenido.
- La cabecera se renderiza siempre (incluidas sus acciones) y, si hay validación con errores en un
  elemento cerrado, debe avisarlo en la cabecera para que el error no quede invisible.

Referencias: `src/components/sedes/SedeAccordionRow.tsx`,
`src/components/sesiones/SesionBloquesEditor.tsx`.

## Reglas «no hacer NUNCA»

- **`any` / `as any`** — usa tipos concretos.
- **`setState` directo dentro de un `useEffect`** — usa `queueMicrotask()` o callbacks async.
- **Actualizar `ref.current` durante el render** — hazlo en un `useEffect`.
- **`<img>`** — usa `<Image>` de `next/image`.
- **Interfaces vacías que extienden otra** — usa `type X = Y`.
- **Refactorizar código no relacionado** con la tarea. Ediciones quirúrgicas (protocolo §3.4).
- **Añadir dependencias** sin justificación.

## Formato

- **ESLint** (`eslint-config-next`, config en `eslint.config.mjs`) es la autoridad de estilo.
  `npm run lint` debe salir limpio.
- **LF** siempre (fin de línea). TypeScript estricto (`tsconfig.json`).

## Assets públicos de producto

- Las capturas de producto publicadas en la landing deben usar un nombre versionado por rediseño, por ejemplo `01-dashboard-redesign-2026.png`.
- Si cambia el contenido visual de una captura, cambia también su nombre y todas sus referencias. Sustituir solo el binario puede hacer que `next/image`, CDN, service worker o navegador continúen sirviendo una variante anterior.
- Mantén dimensiones y relación de aspecto coherentes con el contenedor y actualiza la metadata OpenGraph/Twitter cuando use el mismo asset.

## URL pública y SEO de la landing

- `src/lib/siteUrl.ts` es la única fuente del origen público para canonical, Open Graph, robots y sitemap. Resuelve `APP_URL`, después las URLs de Vercel y usa `http://localhost:3000` solo como fallback local.
- Estado actual (14/08/2026): todavía no hay dominio propio. En producción se usa `VERCEL_PROJECT_PRODUCTION_URL` y `APP_URL` permanece sin configurar.
- Configura `APP_URL` con el dominio canónico cuando el despliegue use un dominio propio; no dupliques dominios en páginas o componentes.
- El sitemap incluye únicamente `/landing`. Las rutas autenticadas, de acceso y API permanecen fuera del índice mediante `src/app/robots.ts`.

---

## Cómo verificar (contrato del `verifier`)

Orden: **estático → tests → build → intención → E2E**.

**Comandos por capa:**

```bash
npm run lint          # ESLint — sin errores
npx tsc --noEmit      # Typecheck — sin errores
npm test -- --run     # Unit (Vitest + jsdom) — verde
npm run build         # Build de producción (Next.js 16) — compila
```

En módulos con persistencia, cron o fixtures E2E, informa cada gate: lint, typecheck, unit y build no sustituyen migración autorizada ni E2E contra development.
**Intención (visual):** arranca `npm run dev`, navega a la página modificada con el **MCP de
Playwright**, prueba la interacción (clicks, formularios, navegación), comprueba **vista móvil
(375×667)** si es responsive y que no rompes páginas cercanas.

**E2E:** por defecto **`agent-browser`** (skill `agent-browser`); TestSprite solo si el prompt lo
pide. Auth de test → ver [`data_styleguide.md`](data_styleguide.md#cómo-verificar-contrato-del-verifier)
(variables `E2E_*`, reutilizar sesión de Google, fallback usuario/contraseña).

```bash
npm run test:e2e         # Playwright (Chromium + Mobile Chrome)
npm run test:e2e:ui      # modo UI
```
