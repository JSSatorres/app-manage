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
- **Estado global de cliente → Zustand** (`src/store/`). El workspace/sedes activos van por
  `useWorkspaceContext`.
- **Autenticación → `useAuth`** (Supabase Auth, OAuth Google/PKCE).

## Formularios

- **React Hook Form + `@hookform/resolvers` con Zod** (`zodResolver`). El schema es la fuente de
  verdad de validación y vive en `src/schemas/` (ver data guide).
- Componentes de `src/components/ui/` (`Input`, `Label`, `Button`, `Dialog`, `Select`…).
- Mensajes de error y estados de carga en español.

## Listados

- Usa **`DataTable`** de `src/components/shared/DataTable.tsx` con **columnas tipadas**. No montes
  tablas a mano.

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
