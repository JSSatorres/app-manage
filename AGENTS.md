# Instrucciones para agentes de IA

## Regla #1: Next.js 16

Este proyecto usa **Next.js 16** con breaking changes. Antes de escribir código, lee la guía relevante en `node_modules/next/dist/docs/`. No asumas que lo que sabes de Next.js 13-15 aplica aquí.

---

## Arquitectura del proyecto

```
src/
├── app/                    # App Router (rutas y páginas)
│   ├── (dashboard)/        # Grupo de rutas autenticadas
│   │   ├── dashboard/
│   │   ├── sesiones/
│   │   ├── equipos/
│   │   ├── ejercicios/
│   │   ├── sedes/
│   │   ├── usuarios/
│   │   ├── parametros/
│   │   ├── documentos/
│   │   └── configuracion/
│   ├── login/
│   ├── join/
│   └── auth/callback/
├── components/             # Componentes React organizados por dominio
│   ├── shared/             # Componentes reutilizables (DataTable, PageHeader, etc.)
│   ├── ui/                 # Componentes base (shadcn/ui)
│   └── [dominio]/          # Componentes específicos (sesiones/, sedes/, etc.)
├── hooks/                  # Custom hooks (useQuery, useMutation, useAuth)
├── services/               # Lógica de acceso a datos (Supabase queries)
├── types/                  # TypeScript types e interfaces
├── schemas/                # Validación con Zod
├── lib/                    # Utilidades y contextos (workspaceContext, env, constants)
├── store/                  # Estado global con Zustand
├── providers/              # React providers (QueryProvider, etc.)
└── __tests__/              # Tests unitarios con Vitest
e2e/                        # Tests E2E con Playwright
```

## Stack tecnológico

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, shadcn/ui, Tailwind CSS, Framer Motion
- **Auth**: Supabase Auth (OAuth con Google, PKCE flow)
- **Base de datos**: Supabase (PostgreSQL)
- **Formularios**: React Hook Form + Zod
- **Estado**: Zustand + React Query (TanStack Query)
- **Tests unitarios**: Vitest + jsdom
- **Tests E2E**: Playwright (Chromium + Mobile Chrome)
- **Monitoreo**: Sentry
- **Deploy**: Vercel
- **Idioma de la UI**: Español

---

## Flujo de trabajo obligatorio

Sigue estos pasos **en orden** cada vez que implementes una funcionalidad o corrijas un bug:

### Paso 1: Planificar

- Lee el issue/tarea completo antes de tocar código
- Identifica qué archivos necesitas modificar o crear
- Si la tarea afecta a un dominio existente (sesiones, equipos, etc.), revisa primero cómo está implementado ese dominio para seguir el mismo patrón
- Si no estás seguro de algo, pregunta antes de asumir

### Paso 2: Escribir código

- Sigue los patrones existentes del proyecto (ver sección "Patrones" abajo)
- Escribe en **TypeScript estricto** — nada de `any`
- Los textos de la UI van en **español**
- No añadas dependencias sin justificación
- No refactorices código que no esté relacionado con tu tarea

### Paso 3: Verificar calidad

Antes de hacer push, ejecuta:

```bash
npm run lint          # Sin errores
npx tsc --noEmit      # Sin errores de tipos
npm test -- --run     # Tests unitarios pasan
```

Si alguno falla, corrígelo antes de continuar.

### Paso 4: Verificar visualmente con Playwright MCP

Tienes acceso al MCP de Playwright. Úsalo para:

1. Arranca el servidor: `npm run dev`
2. Navega a la página que has modificado
3. Verifica que se renderiza correctamente
4. Prueba la interacción (clicks, formularios, navegación)
5. Verifica en vista móvil (375x667) si es un componente responsive
6. Comprueba que no has roto otras páginas cercanas

### Paso 5: Abrir PR

```bash
git checkout -b feat/nombre-descriptivo    # o fix/nombre-descriptivo
git add [archivos específicos]             # NUNCA git add . ni git add -A
git commit -m "feat: descripción concisa"
git push -u origin feat/nombre-descriptivo
gh pr create --title "feat: descripción" --body "## Resumen\n- ...\n\n## Test plan\n- ..."
```

### Paso 6: Si CI falla

1. Lee los logs del GitHub Action que falló
2. Si es lint: corrige los errores de lint
3. Si es typecheck: corrige los tipos
4. Si es tests: lee el error y corrige
5. Si es e2e: descarga el Playwright report del artifact para ver capturas
6. Corrige, haz commit, push — CI se re-ejecuta automáticamente
7. **Repite hasta que todo esté verde**

---

## Patrones del proyecto

### Crear una nueva página/módulo

Sigue el patrón de cualquier módulo existente (ej: `sedes`):

1. **Tipo**: `src/types/[dominio].ts`
2. **Schema**: `src/schemas/[dominio].ts` (validación Zod)
3. **Servicio**: `src/services/[dominio].service.ts` (queries Supabase)
4. **Componentes**: `src/components/[dominio]/` (ListView, Form, etc.)
5. **Página**: `src/app/(dashboard)/[dominio]/page.tsx`

### Componentes de listado

Usa `DataTable` de `src/components/shared/DataTable.tsx` con columnas tipadas.

### Formularios

Usa `react-hook-form` + `zod` para validación. Usa los componentes de `src/components/ui/` (Input, Label, Button, Dialog, etc.).

### Acceso a datos

```typescript
// Siempre usa getSupabaseClient() que puede retornar null
const supabase = getSupabaseClient();
if (!supabase) return { data: null, error: "No client" };
```

### Hooks personalizados

- `useQuery` — para lectura de datos
- `useMutation` — para escritura de datos
- `useAuth` — para sesión y usuario
- `useWorkspaceContext` — para workspace activo y sedes

### No hacer NUNCA

- No uses `as any` — usa tipos concretos
- No hagas `setState` directamente dentro de un `useEffect` — usa `queueMicrotask()` o callbacks async
- No actualices `ref.current` durante el render — hazlo en un `useEffect`
- No uses `<img>` — usa `<Image>` de `next/image`
- No definas interfaces vacías que extienden otra — usa `type X = Y`
- No commitees archivos `.env`, credenciales o secrets
- No hagas push directo a `main` — siempre vía PR
- No hagas `git add .` — añade archivos específicos
