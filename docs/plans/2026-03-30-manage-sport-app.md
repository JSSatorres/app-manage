# Manage Sport App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir una PWA de gestión deportiva multi-sede con biblioteca de ejercicios, planificador de sesiones y panel de administración, usando Supabase como backend completo.

**Architecture:** Todo el frontend es client-side ("use client") para garantizar compatibilidad futura con React Native. Next.js se usa EXCLUSIVAMENTE como sistema de rutas (App Router). Toda la lógica de datos, auth y negocio pasa por el SDK de Supabase en el cliente. Los componentes de UI se construyen con shadcn/ui + Tailwind CSS. La lógica de negocio vive en hooks y servicios reutilizables, completamente desacoplados de Next.js.

**Tech Stack:**
- Next.js 16 (solo App Router para rutas)
- React 19 (todo "use client")
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Google Drive API (multimedia pesada)
- Serwist (PWA / Service Worker)

---

## Restricciones Arquitectónicas (React Native Ready)

| Permitido | Prohibido |
|---|---|
| `"use client"` en todos los componentes | Server Components |
| App Router (estructura de carpetas/rutas) | API Routes (`/api/*`) |
| `next/font` (se abstrae fácil) | Server Actions (`"use server"`) |
| Hooks compartidos en `src/hooks/` | `getServerSideProps` / `getStaticProps` |
| Servicios en `src/services/` | `next/headers`, `next/cookies` |
| Supabase client SDK directo | Middleware de Next.js para auth |
| `<img>` nativo o wrapper propio | `next/image` (no existe en RN) |
| `useRouter` de next/navigation | `next/link` directo (crear wrapper) |

---

## Estructura de Carpetas Objetivo

```
src/
├── app/                          # Solo rutas (Next.js App Router)
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Landing / redirect
│   ├── (auth)/                   # Grupo: rutas de auth
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Grupo: rutas protegidas
│   │   ├── layout.tsx            # Layout con sidebar
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── sedes/
│   │   │   ├── page.tsx          # Listado sedes
│   │   │   └── [id]/page.tsx     # Detalle sede
│   │   ├── equipos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── usuarios/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── ejercicios/
│   │   │   ├── page.tsx          # Biblioteca con filtros
│   │   │   └── [id]/page.tsx     # Ficha completa
│   │   ├── sesiones/
│   │   │   ├── page.tsx          # Calendario/listado
│   │   │   ├── nueva/page.tsx    # Constructor D&D
│   │   │   └── [id]/page.tsx     # Detalle/edición
│   │   ├── documentos/
│   │   │   └── page.tsx
│   │   ├── parametros/
│   │   │   └── page.tsx          # Tablas maestras
│   │   └── configuracion/
│   │       └── page.tsx
│   ├── manifest.ts
│   ├── sw.ts
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn/ui (auto-generados)
│   ├── shared/                   # Componentes reutilizables propios
│   │   ├── AppLink.tsx           # Wrapper de navegación (RN-ready)
│   │   ├── AppImage.tsx          # Wrapper de imagen (RN-ready)
│   │   ├── DataTable.tsx         # Tabla genérica con sort/filter
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── PageHeader.tsx
│   ├── sedes/                    # Componentes específicos de sedes
│   ├── equipos/
│   ├── usuarios/
│   ├── ejercicios/
│   ├── sesiones/
│   ├── documentos/
│   └── parametros/
├── hooks/                        # Hooks reutilizables
│   ├── useSupabase.ts            # Cliente Supabase singleton
│   ├── useQuery.ts               # Hook genérico fetch + cache
│   ├── useMutation.ts            # Hook genérico para writes
│   ├── useAuth.ts                # Estado de autenticación
│   ├── useRol.ts                 # Permisos por rol
│   └── [dominio]/                # Hooks por dominio
│       ├── useSedes.ts
│       ├── useEquipos.ts
│       ├── useUsuarios.ts
│       ├── useEjercicios.ts
│       ├── useSesiones.ts
│       └── useDocumentos.ts
├── services/                     # Lógica de negocio (sin UI)
│   ├── supabase.ts               # Configuración cliente Supabase
│   ├── google-drive.ts           # Adaptador Google Drive API
│   ├── sedes.service.ts
│   ├── equipos.service.ts
│   ├── usuarios.service.ts
│   ├── ejercicios.service.ts
│   ├── sesiones.service.ts
│   ├── documentos.service.ts
│   └── parametros.service.ts
├── types/                        # TypeScript types (generados + manuales)
│   ├── database.types.ts         # Auto-generado por Supabase CLI
│   ├── sedes.ts
│   ├── equipos.ts
│   ├── usuarios.ts
│   ├── ejercicios.ts
│   ├── sesiones.ts
│   └── documentos.ts
└── lib/
    ├── utils.ts                  # Utilidades generales (ya existe)
    └── constants.ts              # Constantes de la app
```

---

## Task 1: Supabase — Proyecto, Cliente y Tipos Base

**Objetivo:** Configurar el proyecto de Supabase, crear el cliente JS para usar en toda la app, y establecer el sistema de tipos TypeScript.

**Files:**
- Create: `src/services/supabase.ts`
- Create: `src/types/database.types.ts`
- Create: `src/hooks/useSupabase.ts`
- Create: `src/lib/constants.ts`
- Create: `.env.local`
- Modify: `package.json` (nuevas dependencias)

**Step 1: Instalar dependencias de Supabase**

```bash
npm install @supabase/supabase-js
```

**Step 2: Crear `.env.local` con las variables de Supabase**

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

> Obtener estos valores del dashboard de Supabase → Settings → API.

**Step 3: Crear el cliente Supabase singleton**

Crear `src/services/supabase.ts` — un solo cliente reutilizable en toda la app. NO usar `createBrowserClient` de `@supabase/ssr` (eso es específico de Next.js). Usar el SDK estándar para máxima portabilidad a React Native.

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Step 4: Crear `src/types/database.types.ts`**

Archivo de tipos placeholder. Se auto-generará con `supabase gen types typescript` cuando el schema exista. Por ahora, crear un esqueleto básico que represente las tablas del PDF:

```typescript
export type Database = {
  public: {
    Tables: {
      sedes: { Row: Sede; Insert: SedeInsert; Update: SedeUpdate };
      usuarios: { Row: Usuario; Insert: UsuarioInsert; Update: UsuarioUpdate };
      equipos: { Row: Equipo; Insert: EquipoInsert; Update: EquipoUpdate };
      ejercicios: { Row: Ejercicio; Insert: EjercicioInsert; Update: EjercicioUpdate };
      sesiones: { Row: Sesion; Insert: SesionInsert; Update: SesionUpdate };
      sesion_detalle: { Row: SesionDetalle; Insert: SesionDetalleInsert; Update: SesionDetalleUpdate };
      documentos: { Row: Documento; Insert: DocumentoInsert; Update: DocumentoUpdate };
      parametros_sistema: { Row: ParametroSistema; Insert: ParametroSistemaInsert; Update: ParametroSistemaUpdate };
    };
  };
};
```

> Este archivo se reemplazará completamente con el output de `supabase gen types typescript` en el Task 2.

**Step 5: Crear `src/hooks/useSupabase.ts`**

```typescript
import { supabase } from "@/services/supabase";

export function useSupabase() {
  return supabase;
}
```

**Step 6: Crear `src/lib/constants.ts`**

```typescript
export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN_SEDE: "AdminSede",
  ENTRENADOR: "Entrenador",
} as const;

export const ESTADO_SESION = {
  BORRADOR: "Borrador",
  PLANIFICADA: "Planificada",
  REALIZADA: "Realizada",
} as const;

export const PERIODO_TEMPORADA = {
  PRETEMPORADA: "Pretemporada",
  COMPETICION: "Competición",
} as const;
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: supabase client setup, types skeleton and constants"
```

---

## Task 2: Supabase — Schema SQL Completo

**Objetivo:** Crear todas las tablas, relaciones, índices y RLS policies en Supabase. Este es el corazón de la arquitectura de datos.

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Escribir la migración SQL completa**

Crear el archivo SQL con TODAS las tablas del schema del PDF. Ejecutar en el SQL Editor de Supabase o via CLI.

Tablas a crear (en orden por dependencias FK):

1. **`sedes`** — Tabla raíz. Sin FK externas.
   - `id` (uuid, PK, default gen_random_uuid())
   - `nombre` (text, NOT NULL)
   - `direccion` (text)
   - `configuracion_visual` (jsonb, default '{}')
   - `responsable_id` (uuid, nullable, FK → usuarios — se añade después con ALTER)
   - `created_at`, `updated_at`

2. **`usuarios`** — Depende de sedes.
   - `id` (uuid, PK, referencia a auth.users)
   - `email` (text, NOT NULL, UNIQUE)
   - `nombre` (text)
   - `rol` (text, NOT NULL, CHECK IN SuperAdmin/AdminSede/Entrenador)
   - `sede_id` (uuid, FK → sedes, nullable)
   - `telefono` (text)
   - `foto_perfil` (text)
   - `created_at`, `updated_at`

3. **`parametros_sistema`** — Sin FK complejas.
   - `id` (uuid, PK)
   - `categoria` (text, NOT NULL — ej: "tipo_objetivo", "tipo_contenido", "material", "categoria_edad")
   - `nombre` (text, NOT NULL)
   - `activo` (boolean, default true)
   - `sede_id` (uuid, FK → sedes, nullable — null = global)
   - UNIQUE(categoria, nombre, sede_id)

4. **`equipos`** — Depende de sedes y usuarios.
   - `id` (uuid, PK)
   - `nombre` (text, NOT NULL — ej: "B1", "C2")
   - `categoria` (text)
   - `sede_id` (uuid, FK → sedes, NOT NULL)
   - `entrenador_principal_id` (uuid, FK → usuarios, nullable)
   - `entrenador_adjunto_id` (uuid, FK → usuarios, nullable)
   - `created_at`, `updated_at`

5. **`ejercicios`** — Biblioteca Central. Depende de sedes.
   - `id` (uuid, PK)
   - `titulo` (text, NOT NULL)
   - `descripcion_detallada` (text)
   - `representacion_grafica` (text — Drive ID)
   - Datos Técnicos:
     - `objetivo_principal` (text)
     - `objetivos_secundarios` (text[] — Array PostgreSQL)
     - `contenido_tactico` (text)
     - `contenido_tecnico` (text)
     - `contenido_fisico` (text)
   - Logística:
     - `dimensiones_campo` (text)
     - `numero_jugadores_min` (integer)
     - `material_necesario` (text[])
   - Multimedia:
     - `drive_video_id` (text)
     - `drive_image_id` (text)
   - Gestión Sede:
     - `sede_propietaria_id` (uuid, FK → sedes, nullable — null = global)
     - `sedes_ocultas` (uuid[] — Array de IDs de sedes donde NO se muestra)
     - `es_global` (boolean, default false)
   - `created_at`, `updated_at`

6. **`sesiones`** — Depende de equipos y usuarios.
   - `id` (uuid, PK)
   - `fecha` (date, NOT NULL)
   - `hora_inicio` (time)
   - `duracion_estimada` (integer — minutos)
   - `equipo_id` (uuid, FK → equipos, NOT NULL)
   - `entrenador_id` (uuid, FK → usuarios, NOT NULL)
   - `microciclo` (integer, CHECK 1-52)
   - `periodo_temporada` (text, CHECK IN Pretemporada/Competición)
   - `objetivo_sesion` (text)
   - `observaciones_previas` (text)
   - `feedback_post_entreno` (text)
   - `estado` (text, NOT NULL, default 'Borrador', CHECK IN Borrador/Planificada/Realizada)
   - `created_at`, `updated_at`

7. **`sesion_detalle`** — Tabla pivote sesión ↔ ejercicio.
   - `id` (uuid, PK)
   - `sesion_id` (uuid, FK → sesiones, NOT NULL, ON DELETE CASCADE)
   - `ejercicio_id` (uuid, FK → ejercicios, NOT NULL)
   - `orden` (integer, NOT NULL)
   - `tiempo_ejecucion` (integer — minutos)
   - `tiempo_descanso` (integer — minutos)
   - `variante_aplicada` (text)
   - UNIQUE(sesion_id, orden)

8. **`documentos`** — Depende de sedes.
   - `id` (uuid, PK)
   - `titulo` (text, NOT NULL)
   - `categoria_doc` (text)
   - `drive_file_id` (text)
   - `permisos_roles` (jsonb — ej: ["SuperAdmin", "Entrenador"])
   - `sede_id` (uuid, FK → sedes, nullable)
   - `created_at`, `updated_at`

**Step 2: Añadir FK circular (sedes.responsable_id → usuarios)**

Después de crear ambas tablas, ejecutar ALTER TABLE para añadir la FK.

**Step 3: Crear índices de rendimiento**

Índices en: `usuarios.sede_id`, `equipos.sede_id`, `ejercicios.sede_propietaria_id`, `sesiones.equipo_id`, `sesiones.fecha`, `sesion_detalle.sesion_id`.

**Step 4: Crear RLS policies básicas**

Habilitar RLS en todas las tablas. Crear policies permisivas temporales (allow all para authenticated). Se endurecerán en el Task de Auth.

**Step 5: Ejecutar la migración en Supabase**

Ejecutar el SQL en el SQL Editor de Supabase Dashboard, o con:
```bash
npx supabase db push
```

**Step 6: Regenerar tipos TypeScript**

```bash
npx supabase gen types typescript --project-id "tu-project-id" > src/types/database.types.ts
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete database schema with all tables, indexes and base RLS"
```

---

## Task 3: Componentes Shared — Wrappers y Primitivos

**Objetivo:** Crear los componentes wrapper que abstraen dependencias de Next.js (para portabilidad a React Native) y componentes reutilizables base.

**Files:**
- Create: `src/components/shared/AppLink.tsx`
- Create: `src/components/shared/AppImage.tsx`
- Create: `src/components/shared/PageHeader.tsx`
- Create: `src/components/shared/LoadingSpinner.tsx`
- Create: `src/components/shared/EmptyState.tsx`
- Create: `src/components/shared/ConfirmDialog.tsx`
- Create: `src/components/shared/DataTable.tsx`

**Step 1: Instalar componentes shadcn/ui necesarios**

```bash
npx shadcn@latest add dialog table input label select textarea badge card separator sheet sidebar skeleton tabs tooltip alert-dialog dropdown-menu command popover calendar scroll-area avatar switch checkbox radio-group form sonner
```

> Esto genera todos los primitivos en `src/components/ui/` que se usarán en toda la app.

**Step 2: Crear `AppLink.tsx`**

Wrapper sobre la navegación. En Next.js usa `useRouter().push()`. En React Native se cambiará a `navigation.navigate()`. Todo componente que necesite navegar usa este wrapper.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface AppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AppLink({ href, children, className }: AppLinkProps) {
  const router = useRouter();
  const handlePress = useCallback(() => router.push(href), [router, href]);
  return (
    <button type="button" onClick={handlePress} className={className}>
      {children}
    </button>
  );
}

export function useAppNavigation() {
  const router = useRouter();
  return {
    push: router.push,
    replace: router.replace,
    back: router.back,
  };
}
```

**Step 3: Crear `AppImage.tsx`**

Wrapper sobre `<img>`. En RN se cambiará a `<Image>` de RN.

**Step 4: Crear `PageHeader.tsx`**

Componente reutilizable para el encabezado de cada página (título, descripción, botón de acción).

**Step 5: Crear `LoadingSpinner.tsx`, `EmptyState.tsx`**

Componentes de estado vacío y carga.

**Step 6: Crear `ConfirmDialog.tsx`**

Dialog reutilizable para confirmar acciones destructivas (eliminar sede, usuario, etc.).

**Step 7: Crear `DataTable.tsx`**

Tabla genérica con sorting, filtering y paginación. Se usará en TODAS las vistas de listado (sedes, usuarios, equipos, ejercicios, sesiones). Basada en shadcn/ui Table + lógica de estado local.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: shared components - wrappers, data table, dialogs and primitives"
```

---

## Task 4: Layout Dashboard — Sidebar, Navegación y Shell

**Objetivo:** Crear el layout de la app con sidebar responsive, navegación por secciones y estructura de rutas agrupadas.

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/components/shared/AppSidebar.tsx`
- Create: `src/components/shared/SidebarNavItem.tsx`
- Create: `src/components/shared/MobileHeader.tsx`
- Modify: `src/app/page.tsx` (redirect al dashboard)

**Step 1: Crear el layout del dashboard**

El layout `(dashboard)/layout.tsx` es `"use client"`. Contiene la sidebar (desktop) y un header hamburguesa (mobile). Usa el componente `Sidebar` de shadcn/ui.

**Step 2: Crear `AppSidebar.tsx`**

Sidebar con secciones:
- Dashboard (home)
- Sedes
- Equipos
- Usuarios
- Ejercicios (Biblioteca)
- Sesiones (Planificador)
- Documentos
- Parámetros (Maestros)
- Configuración

Cada item usa `AppLink` para navegar. Highlight del item activo basado en la ruta actual.

**Step 3: Crear `MobileHeader.tsx`**

Header que se muestra solo en mobile con hamburger menu que abre la sidebar como Sheet (slide-over).

**Step 4: Crear página dashboard principal**

`(dashboard)/page.tsx` — Página de bienvenida vacía por ahora. Se llenará con widgets/resumen cuando haya datos.

**Step 5: Modificar `src/app/page.tsx`**

La página raíz redirige al dashboard:
```tsx
"use client";
import { useEffect } from "react";
import { useAppNavigation } from "@/components/shared/AppLink";

export default function HomePage() {
  const { replace } = useAppNavigation();
  useEffect(() => { replace("/dashboard"); }, [replace]);
  return null;
}
```

> Nota: Cuando exista auth, esto redirigirá a `/login` si no hay sesión.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: dashboard layout with responsive sidebar and navigation"
```

---

## Task 5: Hooks Genéricos — useQuery y useMutation

**Objetivo:** Crear hooks genéricos para fetching y mutación de datos con Supabase. Toda la app los usará. Patrón inspirado en React Query pero sin la librería (para mantener el bundle pequeño y RN-ready).

**Files:**
- Create: `src/hooks/useQuery.ts`
- Create: `src/hooks/useMutation.ts`

**Step 1: Crear `useQuery.ts`**

Hook que recibe una función async de Supabase, maneja loading/error/data, y expone `refetch`. Soporta dependencias para re-ejecutar cuando cambian.

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = []
): QueryResult<T> {
  // ... implementación con useState, useEffect, useCallback
}
```

**Step 2: Crear `useMutation.ts`**

Hook para operaciones de escritura (create, update, delete). Devuelve `mutate`, `loading`, `error`, `success`.

```typescript
interface MutationResult<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  loading: boolean;
  error: string | null;
}

export function useMutation<T, V>(
  mutationFn: (variables: V) => Promise<{ data: T | null; error: any }>
): MutationResult<T, V> {
  // ... implementación
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: generic useQuery and useMutation hooks for Supabase"
```

---

## Task 6: CRUD Parámetros del Sistema (Tablas Maestras)

**Objetivo:** Primer CRUD completo de la app. Los parámetros del sistema son las tablas maestras editables por Admin: tipos_objetivo, tipos_contenido, materiales, categorias_edad. Estos desplegables se usan en toda la app.

**Files:**
- Create: `src/services/parametros.service.ts`
- Create: `src/hooks/useParametros.ts`
- Create: `src/types/parametros.ts`
- Create: `src/app/(dashboard)/parametros/page.tsx`
- Create: `src/components/parametros/ParametrosView.tsx`
- Create: `src/components/parametros/ParametrosList.tsx`
- Create: `src/components/parametros/ParametroForm.tsx`

**Step 1: Crear types**

```typescript
export interface ParametroSistema {
  id: string;
  categoria: string;
  nombre: string;
  activo: boolean;
  sede_id: string | null;
}
```

**Step 2: Crear service**

`parametros.service.ts` con funciones:
- `fetchParametrosByCategoria(categoria: string)` — SELECT con filtro
- `createParametro(data)` — INSERT
- `updateParametro(id, data)` — UPDATE
- `deleteParametro(id)` — DELETE
- `fetchCategorias()` — SELECT DISTINCT categoria

**Step 3: Crear hook `useParametros.ts`**

Usa `useQuery` y `useMutation` internamente. Expone datos y acciones listas para el componente.

**Step 4: Crear componentes UI**

- `ParametrosView.tsx` — Vista principal con Tabs por categoría (tipos_objetivo | tipos_contenido | materiales | categorias_edad)
- `ParametrosList.tsx` — Lista de valores de una categoría con edit/delete inline
- `ParametroForm.tsx` — Dialog para crear/editar un valor

**Step 5: Crear la página ruta**

`parametros/page.tsx` — Solo renderiza `<ParametrosView />` con `"use client"`.

**Step 6: Probar manualmente**

Verificar CRUD completo en el navegador: crear un "tipo_objetivo", editarlo, eliminarlo.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: parametros sistema CRUD - master tables management"
```

---

## Task 7: CRUD Sedes

**Objetivo:** Gestión completa de sedes. Crear nueva sede (clonando datos base), editar configuración, asignar Admin de Sede.

**Files:**
- Create: `src/services/sedes.service.ts`
- Create: `src/hooks/useSedes.ts`
- Create: `src/types/sedes.ts`
- Create: `src/app/(dashboard)/sedes/page.tsx`
- Create: `src/app/(dashboard)/sedes/[id]/page.tsx`
- Create: `src/components/sedes/SedesListView.tsx`
- Create: `src/components/sedes/SedeForm.tsx`
- Create: `src/components/sedes/SedeDetailView.tsx`
- Create: `src/components/sedes/SedeConfigPanel.tsx`

**Step 1: Crear types**

```typescript
export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracion_visual: Record<string, any>;
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Crear service**

`sedes.service.ts` con:
- `fetchSedes()` — SELECT * con join a usuario responsable
- `fetchSedeById(id)` — SELECT por ID
- `createSede(data)` — INSERT
- `updateSede(id, data)` — UPDATE
- `deleteSede(id)` — DELETE (con confirmación de cascada)

**Step 3: Crear hook `useSedes.ts`**

**Step 4: Crear UI**

- `SedesListView.tsx` — DataTable con columnas: nombre, dirección, responsable, acciones
- `SedeForm.tsx` — Dialog con campos del formulario
- `SedeDetailView.tsx` — Vista detalle con tabs (info general, equipos de la sede, usuarios)
- `SedeConfigPanel.tsx` — Panel de configuración visual (colores, logo)

**Step 5: Crear páginas ruta**

- `sedes/page.tsx` → renderiza `<SedesListView />`
- `sedes/[id]/page.tsx` → renderiza `<SedeDetailView />`

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: sedes CRUD with detail view and config panel"
```

---

## Task 8: CRUD Equipos

**Objetivo:** Gestión de equipos. Cada equipo pertenece a una sede y tiene entrenador principal y adjunto.

**Files:**
- Create: `src/services/equipos.service.ts`
- Create: `src/hooks/useEquipos.ts`
- Create: `src/types/equipos.ts`
- Create: `src/app/(dashboard)/equipos/page.tsx`
- Create: `src/app/(dashboard)/equipos/[id]/page.tsx`
- Create: `src/components/equipos/EquiposListView.tsx`
- Create: `src/components/equipos/EquipoForm.tsx`
- Create: `src/components/equipos/EquipoDetailView.tsx`

**Step 1: Crear types**

```typescript
export interface Equipo {
  id: string;
  nombre: string;
  categoria: string | null;
  sede_id: string;
  entrenador_principal_id: string | null;
  entrenador_adjunto_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Crear service**

`equipos.service.ts` con CRUD + joins a sede y usuarios (entrenadores).

**Step 3: Crear hook `useEquipos.ts`**

Con filtro por `sede_id` para que cada sede vea solo sus equipos.

**Step 4: Crear UI**

- `EquiposListView.tsx` — DataTable con filtro por sede. Columnas: nombre, categoría, sede, entrenador principal, acciones
- `EquipoForm.tsx` — Dialog con select de sede, selects de entrenadores (filtrados por sede seleccionada)
- `EquipoDetailView.tsx` — Detalle con sesiones del equipo

**Step 5: Crear páginas ruta**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: equipos CRUD with sede filtering and trainer assignment"
```

---

## Task 9: CRUD Usuarios (sin Auth)

**Objetivo:** Gestión de usuarios como datos puros (sin login aún). Crear perfiles, asignar roles, vincular a sedes. La autenticación real se conecta en el Task final.

**Files:**
- Create: `src/services/usuarios.service.ts`
- Create: `src/hooks/useUsuarios.ts`
- Create: `src/types/usuarios.ts`
- Create: `src/app/(dashboard)/usuarios/page.tsx`
- Create: `src/app/(dashboard)/usuarios/[id]/page.tsx`
- Create: `src/components/usuarios/UsuariosListView.tsx`
- Create: `src/components/usuarios/UsuarioForm.tsx`
- Create: `src/components/usuarios/UsuarioDetailView.tsx`
- Create: `src/components/usuarios/RolBadge.tsx`

**Step 1: Crear types**

```typescript
export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  rol: "SuperAdmin" | "AdminSede" | "Entrenador";
  sede_id: string | null;
  telefono: string | null;
  foto_perfil: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Crear service**

`usuarios.service.ts` con CRUD + filtro por sede y rol.

**Step 3: Crear hook `useUsuarios.ts`**

**Step 4: Crear UI**

- `UsuariosListView.tsx` — DataTable con filtros por sede y rol. Columnas: nombre, email, rol (Badge), sede, acciones
- `UsuarioForm.tsx` — Formulario con Select de rol, Select de sede
- `UsuarioDetailView.tsx` — Perfil completo con equipos asignados
- `RolBadge.tsx` — Badge de color por rol (SuperAdmin=rojo, AdminSede=azul, Entrenador=verde)

**Step 5: Crear páginas ruta**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: usuarios CRUD with role badges and sede filtering"
```

---

## Task 10: Google Drive — Adaptador de Integración

**Objetivo:** Crear el servicio de integración con Google Drive API para upload/download/visualización de videos e imágenes de ejercicios.

**Files:**
- Create: `src/services/google-drive.ts`
- Create: `src/hooks/useGoogleDrive.ts`
- Create: `src/components/shared/VideoPlayer.tsx`
- Create: `src/components/shared/DriveImageViewer.tsx`
- Create: `src/components/shared/FileUploader.tsx`
- Modify: `.env.local` (añadir Google credentials)

**Step 1: Configurar Google Drive API**

Añadir a `.env.local`:
```env
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=tu-api-key
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=tu-client-id
```

> Configurar en Google Cloud Console: habilitar Drive API, crear OAuth credentials, configurar redirect URIs.

**Step 2: Crear `google-drive.ts`**

Servicio con:
- `uploadFile(file, folderId)` — Subir archivo a Drive
- `getFileUrl(driveId)` — Obtener URL de visualización
- `getVideoStreamUrl(driveId)` — URL para streaming
- `getThumbnailUrl(driveId)` — URL de miniatura
- `deleteFile(driveId)` — Eliminar archivo
- `listFiles(folderId)` — Listar archivos de una carpeta

**Step 3: Crear `VideoPlayer.tsx`**

Reproductor de video optimizado con pre-carga. Recibe un `driveVideoId` y renderiza un `<video>` con la URL de streaming.

**Step 4: Crear `DriveImageViewer.tsx`**

Visualizador de imágenes desde Drive con fallback y skeleton.

**Step 5: Crear `FileUploader.tsx`**

Componente de upload con drag & drop, progress bar y preview. Genérico para videos, imágenes y documentos.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: google drive integration - upload, stream, preview components"
```

---

## Task 11: Biblioteca de Ejercicios — CRUD y Visualización

**Objetivo:** Módulo más rico de la app. CRUD de ejercicios con todos los campos técnicos, filtrado avanzado multi-criterio, fichas detalladas y visualización multimedia.

**Files:**
- Create: `src/services/ejercicios.service.ts`
- Create: `src/hooks/useEjercicios.ts`
- Create: `src/types/ejercicios.ts`
- Create: `src/app/(dashboard)/ejercicios/page.tsx`
- Create: `src/app/(dashboard)/ejercicios/[id]/page.tsx`
- Create: `src/components/ejercicios/EjerciciosBiblioteca.tsx`
- Create: `src/components/ejercicios/EjercicioCard.tsx`
- Create: `src/components/ejercicios/EjercicioFilters.tsx`
- Create: `src/components/ejercicios/EjercicioForm.tsx`
- Create: `src/components/ejercicios/EjercicioFicha.tsx`
- Create: `src/components/ejercicios/EjercicioTechnicalData.tsx`
- Create: `src/components/ejercicios/EjercicioLogistics.tsx`
- Create: `src/components/ejercicios/EjercicioMultimedia.tsx`

**Step 1: Crear types**

Tipo completo con todos los campos del schema.

**Step 2: Crear service**

`ejercicios.service.ts` con:
- `fetchEjercicios(filters)` — SELECT con filtros dinámicos (objetivo, contenido, material, sede, etc.)
- `fetchEjercicioById(id)` — SELECT con todos los datos
- `createEjercicio(data)` — INSERT
- `updateEjercicio(id, data)` — UPDATE
- `deleteEjercicio(id)` — DELETE
- `duplicateEjercicio(id)` — Clonar ejercicio

> Los filtros deben soportar: texto libre, objetivo_principal, contenido_tactico, contenido_tecnico, contenido_fisico, material_necesario (ANY in array), numero_jugadores_min, sede_propietaria_id, es_global.

**Step 3: Crear hook `useEjercicios.ts`**

Con estado de filtros y refetch automático al cambiar filtros.

**Step 4: Crear `EjerciciosBiblioteca.tsx`**

Vista principal con:
- Barra de filtros en la parte superior (`EjercicioFilters.tsx`)
- Grid/List toggle
- Listado de cards (`EjercicioCard.tsx`)
- Paginación

**Step 5: Crear `EjercicioFilters.tsx`**

Panel de filtros múltiples. Cada filtro es un Select que carga opciones desde `parametros_sistema`. Ejemplo: "Ver ejercicios de Pase que requieran Porterías".

**Step 6: Crear `EjercicioCard.tsx`**

Card con thumbnail (Drive), título, objetivo principal, badges de contenido.

**Step 7: Crear `EjercicioFicha.tsx`**

Vista detalle completa del ejercicio. Organizada en tabs o secciones:
- **Datos Técnicos** (`EjercicioTechnicalData.tsx`) — objetivo, contenidos
- **Logística** (`EjercicioLogistics.tsx`) — dimensiones, jugadores, materiales
- **Multimedia** (`EjercicioMultimedia.tsx`) — video player + galería de imágenes

**Step 8: Crear `EjercicioForm.tsx`**

Formulario completo multi-step o en tabs para crear/editar un ejercicio. Incluye:
- Campos de texto
- Selects dinámicos (desde parametros_sistema)
- Array editors (para objetivos_secundarios, material_necesario)
- Upload de multimedia (usa FileUploader)
- Toggle es_global

**Step 9: Crear páginas ruta**

- `ejercicios/page.tsx` → `<EjerciciosBiblioteca />`
- `ejercicios/[id]/page.tsx` → `<EjercicioFicha />`

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: ejercicios library - CRUD, multi-filter, cards, ficha detail, multimedia"
```

---

## Task 12: Planificador de Sesiones — Constructor Drag & Drop

**Objetivo:** Herramienta de productividad para planificar sesiones de entrenamiento. Constructor drag & drop, lógica de microciclos, duplicado inteligente y exportación PDF.

**Files:**
- Create: `src/services/sesiones.service.ts`
- Create: `src/hooks/useSesiones.ts`
- Create: `src/types/sesiones.ts`
- Create: `src/app/(dashboard)/sesiones/page.tsx`
- Create: `src/app/(dashboard)/sesiones/nueva/page.tsx`
- Create: `src/app/(dashboard)/sesiones/[id]/page.tsx`
- Create: `src/components/sesiones/SesionesListView.tsx`
- Create: `src/components/sesiones/SesionConstructor.tsx`
- Create: `src/components/sesiones/SesionTimeline.tsx`
- Create: `src/components/sesiones/EjercicioDropZone.tsx`
- Create: `src/components/sesiones/EjercicioDragItem.tsx`
- Create: `src/components/sesiones/SesionHeader.tsx`
- Create: `src/components/sesiones/SesionFilters.tsx`
- Create: `src/components/sesiones/MicrocicloSelector.tsx`
- Create: `src/components/sesiones/DuplicarSesionDialog.tsx`
- Create: `src/components/sesiones/SesionPdfExport.tsx`

**Step 1: Instalar dependencia de drag & drop**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

> `@dnd-kit` es compatible con React Native via `@dnd-kit/core` + custom sensors.

**Step 2: Crear types**

```typescript
export interface Sesion {
  id: string;
  fecha: string;
  hora_inicio: string | null;
  duracion_estimada: number | null;
  equipo_id: string;
  entrenador_id: string;
  microciclo: number | null;
  periodo_temporada: string | null;
  objetivo_sesion: string | null;
  observaciones_previas: string | null;
  feedback_post_entreno: string | null;
  estado: "Borrador" | "Planificada" | "Realizada";
  detalles?: SesionDetalle[];
}

export interface SesionDetalle {
  id: string;
  sesion_id: string;
  ejercicio_id: string;
  orden: number;
  tiempo_ejecucion: number | null;
  tiempo_descanso: number | null;
  variante_aplicada: string | null;
  ejercicio?: Ejercicio; // join
}
```

**Step 3: Crear service**

`sesiones.service.ts` con:
- `fetchSesiones(filters)` — Con filtro por equipo, fecha, microciclo, estado
- `fetchSesionById(id)` — Con JOIN a sesion_detalle + ejercicios
- `createSesion(data)` — INSERT sesión + detalles (transacción)
- `updateSesion(id, data)` — UPDATE
- `updateSesionDetalles(sesionId, detalles)` — Reemplazar detalles
- `deleteSesion(id)` — DELETE (cascade a detalles)
- `duplicateSesion(id, options)` — Clonar sesión cambiando fecha/equipo

**Step 4: Crear hook `useSesiones.ts`**

**Step 5: Crear `SesionesListView.tsx`**

Vista con filtros (equipo, periodo, microciclo, estado) y listado de sesiones. Cada fila muestra fecha, equipo, estado (badge), número de ejercicios.

**Step 6: Crear `SesionConstructor.tsx`**

El constructor principal. Layout en 2 columnas:
- **Izquierda:** Biblioteca de ejercicios (searchable, filtrable) — cada ejercicio es un `EjercicioDragItem`
- **Derecha:** Timeline de la sesión (`SesionTimeline`) — zona de drop donde se ordenan los ejercicios

**Step 7: Crear drag & drop**

- `EjercicioDragItem.tsx` — Ejercicio arrastrable desde la biblioteca
- `EjercicioDropZone.tsx` — Zona donde se sueltan en la timeline
- `SesionTimeline.tsx` — Lista sortable de ejercicios añadidos, con campos editables inline (tiempo_ejecucion, tiempo_descanso, variante_aplicada)

**Step 8: Crear `SesionHeader.tsx`**

Cabecera del constructor con: fecha, equipo (select), microciclo, periodo, objetivo, estado.

**Step 9: Crear `MicrocicloSelector.tsx`**

Selector visual de microciclo (semana 1-52) con indicador del periodo de temporada.

**Step 10: Crear `DuplicarSesionDialog.tsx`**

Dialog para duplicado inteligente: "Clonar sesión del Martes pasado al Jueves cambiando el equipo". Campos: nueva fecha, nuevo equipo (opcional).

**Step 11: Crear `SesionPdfExport.tsx`**

Generación de plantilla A4 con:
- Datos de la sesión (fecha, equipo, microciclo)
- Tabla de ejercicios (orden, título, tiempo, descanso, variante)
- QR con link a la sesión
- Escudo de la sede

```bash
npm install @react-pdf/renderer
```

> `@react-pdf/renderer` funciona en web y se puede adaptar para RN.

**Step 12: Crear páginas ruta**

- `sesiones/page.tsx` → `<SesionesListView />`
- `sesiones/nueva/page.tsx` → `<SesionConstructor />`
- `sesiones/[id]/page.tsx` → `<SesionConstructor />` (modo edición, carga datos existentes)

**Step 13: Commit**

```bash
git add -A
git commit -m "feat: session planner - drag&drop constructor, microciclo, duplicate, PDF export"
```

---

## Task 13: CRUD Documentos

**Objetivo:** Gestión de documentos asociados a sedes. Upload a Google Drive, permisos por rol.

**Files:**
- Create: `src/services/documentos.service.ts`
- Create: `src/hooks/useDocumentos.ts`
- Create: `src/types/documentos.ts`
- Create: `src/app/(dashboard)/documentos/page.tsx`
- Create: `src/components/documentos/DocumentosListView.tsx`
- Create: `src/components/documentos/DocumentoForm.tsx`
- Create: `src/components/documentos/DocumentoViewer.tsx`

**Step 1: Crear types**

```typescript
export interface Documento {
  id: string;
  titulo: string;
  categoria_doc: string | null;
  drive_file_id: string | null;
  permisos_roles: string[];
  sede_id: string | null;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Crear service**

CRUD + filtro por sede y categoría. El upload del archivo va vía `google-drive.ts`, y el `drive_file_id` resultante se guarda en la tabla.

**Step 3: Crear UI**

- `DocumentosListView.tsx` — DataTable con filtro por categoría y sede
- `DocumentoForm.tsx` — Formulario con FileUploader + select de permisos_roles (multi-select de roles)
- `DocumentoViewer.tsx` — Visualizador de PDF embebido (iframe) o link de descarga

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: documentos CRUD with Drive upload and role-based permissions"
```

---

## Task 14: Gestión Multi-Sede — Visibilidad y Herencia

**Objetivo:** Implementar la lógica de visibilidad entre sedes. Los ejercicios pueden ser globales, privados de una sede, u ocultos para ciertas sedes. Los parámetros pueden tener scope global o por sede.

**Files:**
- Create: `src/services/visibility.service.ts`
- Create: `src/hooks/useVisibility.ts`
- Modify: `src/services/ejercicios.service.ts` (añadir filtro de visibilidad)
- Modify: `src/services/parametros.service.ts` (añadir filtro de scope)
- Create: `src/components/shared/VisibilitySelector.tsx`

**Step 1: Crear `visibility.service.ts`**

Servicio con la lógica central de filtrado:
- `isVisibleForSede(ejercicio, sedeId)` — Determina si un ejercicio es visible para una sede
  - Si `es_global === true` → visible para todos EXCEPTO los que están en `sedes_ocultas`
  - Si `sede_propietaria_id === sedeId` → visible (es propio)
  - Si `sede_propietaria_id !== sedeId && !es_global` → NO visible (es privado de otra sede)

**Step 2: Crear `VisibilitySelector.tsx`**

Componente para configurar la visibilidad de un ejercicio:
- Toggle "Es global"
- Si es global: multi-select de sedes donde OCULTAR
- Si no es global: solo visible para la sede propietaria

**Step 3: Modificar `ejercicios.service.ts`**

Añadir el filtro de visibilidad a `fetchEjercicios()`:
```sql
WHERE (es_global = true AND NOT (sede_id = ANY(sedes_ocultas)))
   OR sede_propietaria_id = :current_sede_id
```

**Step 4: Modificar `parametros.service.ts`**

Los parámetros con `sede_id = null` son globales. Los que tienen `sede_id` son específicos. El fetch debe retornar ambos cuando se consulta por una sede.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: multi-sede visibility logic for exercises and parameters"
```

---

## Task 15: Autenticación Supabase (ÚLTIMO)

**Objetivo:** Conectar Supabase Auth. Login, registro, protección de rutas, RLS policies reales basadas en el usuario autenticado y su rol.

**Files:**
- Create: `src/hooks/useAuth.ts`
- Create: `src/hooks/useRol.ts`
- Create: `src/components/auth/AuthProvider.tsx`
- Create: `src/components/auth/ProtectedRoute.tsx`
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/components/auth/RegisterForm.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Modify: `src/app/layout.tsx` (wrap con AuthProvider)
- Modify: `src/app/(dashboard)/layout.tsx` (añadir ProtectedRoute)
- Modify: `supabase/migrations/002_rls_policies.sql`
- Modify: `src/app/page.tsx` (redirect condicional login/dashboard)

**Step 1: Crear `AuthProvider.tsx`**

Context provider que escucha `supabase.auth.onAuthStateChange()` y expone el usuario actual, sesión y perfil (de la tabla `usuarios`).

```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { Usuario } from "@/types/usuarios";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Step 2: Crear `useAuth.ts` y `useRol.ts`**

- `useAuth()` — Consume el AuthContext
- `useRol()` — Helper que expone: `isSuperAdmin`, `isAdminSede`, `isEntrenador`, `currentSedeId`

**Step 3: Crear `ProtectedRoute.tsx`**

Wrapper que redirige a `/login` si no hay sesión. Opcionalmente acepta `allowedRoles` para control de acceso:

```tsx
<ProtectedRoute allowedRoles={["SuperAdmin", "AdminSede"]}>
  <SedesListView />
</ProtectedRoute>
```

**Step 4: Crear `LoginForm.tsx` y `RegisterForm.tsx`**

Formularios con shadcn/ui:
- Login: email + password + botón
- Register: email + password + confirm password

Usan `supabase.auth.signInWithPassword()` y `supabase.auth.signUp()`.

**Step 5: Crear layout y páginas de auth**

- `(auth)/layout.tsx` — Layout centrado sin sidebar
- `(auth)/login/page.tsx` → `<LoginForm />`
- `(auth)/register/page.tsx` → `<RegisterForm />`

**Step 6: Envolver la app con AuthProvider**

Modificar `src/app/layout.tsx` para que envuelva `{children}` con `<AuthProvider>`.

**Step 7: Proteger el dashboard**

Modificar `(dashboard)/layout.tsx` para envolver con `<ProtectedRoute>`.

**Step 8: Actualizar redirect de página raíz**

`src/app/page.tsx` ahora redirige a `/login` si no hay sesión, o a `/dashboard` si la hay (usa `useAuth`).

**Step 9: Escribir RLS policies reales**

Crear `002_rls_policies.sql` con políticas específicas:

- **SuperAdmin:** acceso total a todas las tablas
- **AdminSede:** acceso a datos de su sede (`sede_id = auth.jwt() ->> 'sede_id'`)
- **Entrenador:** lectura de ejercicios/sesiones de su sede, escritura solo de sesiones que le pertenecen

Las policies consultan la tabla `usuarios` para determinar el rol y sede del usuario autenticado:

```sql
CREATE POLICY "usuarios_select_own_sede" ON usuarios
  FOR SELECT USING (
    sede_id = (SELECT sede_id FROM usuarios WHERE id = auth.uid())
    OR (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'SuperAdmin'
  );
```

**Step 10: Ejecutar migración de RLS**

**Step 11: Testear flujo completo**

1. Registrar usuario → verificar que se crea en `auth.users` Y en tabla `usuarios`
2. Login → redirect a dashboard
3. Verificar que un Entrenador NO puede acceder a Gestión de Sedes
4. Verificar que un AdminSede solo ve datos de su sede

**Step 12: Commit**

```bash
git add -A
git commit -m "feat: supabase auth - login, register, protected routes, RLS policies"
```

---

## Resumen de Dependencias entre Tasks

```
Task 1 (Supabase client) ─────────────────┐
Task 2 (Schema SQL) ──────────────────────┤
Task 3 (Componentes shared) ──────────────┤
Task 4 (Layout dashboard) ────────────────┤
Task 5 (Hooks genéricos) ─────────────────┤
                                           ▼
Task 6 (Parámetros) ← primer CRUD, más simple
Task 7 (Sedes) ← base para multi-sede
Task 8 (Equipos) ← depende de sedes
Task 9 (Usuarios) ← depende de sedes
                                           ▼
Task 10 (Google Drive) ← necesario antes de ejercicios
Task 11 (Ejercicios) ← depende de parámetros + drive + sedes
Task 12 (Sesiones) ← depende de ejercicios + equipos
Task 13 (Documentos) ← depende de drive + sedes
Task 14 (Multi-Sede) ← refina visibilidad en ejercicios/parámetros
                                           ▼
Task 15 (Auth) ← ÚLTIMO, conecta todo con permisos reales
```

---

## Módulos Excluidos del Plan (Fase 2+)

| Módulo | Motivo |
|---|---|
| Migración desde AppSheet | Es un proceso de datos one-shot, no desarrollo de features |
| Sistema de Chat | Opcional, alta complejidad (WebSockets, Supabase Realtime), se hace después |
| Push Notifications | Depende de auth + infraestructura Serwist ya configurada, se añade post-launch |

---

## Notas para el Desarrollador

1. **TODOS los archivos `.tsx` de componentes deben empezar con `"use client";`** — sin excepciones.
2. **Nunca importar de `next/server`** ni usar `cookies()`, `headers()`, `redirect()` del server.
3. **Para navegar:** usar `useAppNavigation()` de `src/components/shared/AppLink.tsx`, nunca `<Link>` directo.
4. **Para imágenes:** usar `<AppImage />`, nunca `<Image>` de `next/image`.
5. **Los tipos de Supabase** se regeneran con `npx supabase gen types typescript` cada vez que se modifica el schema.
6. **Cada service** sigue el patrón: función pura que llama a `supabase.from('tabla').select/insert/update/delete` y retorna `{ data, error }`.
7. **Cada hook** sigue el patrón: consume el service via `useQuery`/`useMutation` y expone una API limpia al componente.
