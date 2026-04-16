# Arquitectura y Guía de Tecnologías

## Resumen del Proyecto

**Manage Sport App** es una aplicación de gestión deportiva multi-tenant para entrenar equipos, planificar sesiones y administrar ejercicios.

---

## Stack Tecnológico

### Core
| Tecnología | Versión | Uso |
|-------------|---------|-----|
| Next.js | 16.2.1 | Framework React con App Router |
| React | 19.2.4 | UI Library |
| TypeScript | 5.x | Tipado estático |

### Styling
| Tecnología | Uso |
|------------|-----|
| Tailwind CSS v4 | Utility-first CSS |
| shadcn/ui + Base UI | Componentes base |
| Framer Motion | Animaciones |
| tw-animate-css | Micro-animaciones |

### Backend & Data
| Tecnología | Uso |
|------------|-----|
| Supabase | Auth + PostgreSQL + RLS |
| @supabase/supabase-js | Cliente DB |

### PWA
| Tecnología | Uso |
|------------|-----|
| Serwist | Service Workers para offline |

### State Management (NUEVO)
| Tecnología | Uso |
|------------|-----|
| Zustand | Estado global simple |
| @tanstack/react-query | Estado de servidor (caching, sync) |
| React Hook Form | Formularios |
| Zod | Validación de esquemas |
| Framer Motion | Animaciones |

### Testing (NUEVO)
| Tecnología | Uso |
|------------|-----|
| Vitest | Test runner |
| Testing Library | Tests de componentes |

---

## Arquitectura de Carpetas

```
src/
├── app/                    # Rutas (Next.js App Router)
│   ├── (dashboard)/         # Rutas protegidas
│   ├── auth/               # Login, register
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing
├── components/
│   ├── ui/                 # Componentes base shadcn/ui
│   ├── shared/             # Componentes compartidos
│   ├── equipos/            # Dominio: Equipos
│   ├── sesiones/           # Dominio: Sesiones
│   ├── ejercicios/         # Dominio: Ejercicios
│   └── [dominios]/          # Otros módulos
├── services/               # Capa de datos Supabase
├── hooks/                  # Custom hooks
├── lib/                    # Utilidades
├── store/                  # Zustand stores (NUEVO)
│   ├── uiStore.ts           # Estado UI global
│   ├── userStore.ts        # Estado usuario
│   └── index.ts            # Exports centralizados
├── types/                  # Tipos TypeScript
├── schemas/                # Esquemas Zod (NUEVO)
│   ├── user.schema.ts
│   ├── equipo.schema.ts
│   ├── sesion.schema.ts
│   └── ejercicio.schema.ts
├── providers/              # React Providers (NUEVO)
│   └── query-provider.tsx
└── __tests__/              # Tests (NUEVO)
```

---

# GUÍA DE USO DE TECNOLOGÍAS

## 1. Zustand - Estado Global

### Cuándo usar Zustand
- Tema de la app (dark/light mode)
- Estado de UI global (sidebar, modales)
- Preferencias del usuario
- Cache simple que no necesita servidor

### Instalación
```bash
npm install zustand
```

### Crear un Store

```typescript
// src/store/uiStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  modalOpen: string | null
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  openModal: (modalId: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      modalOpen: null,
      
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      
      setTheme: (theme) => set({ theme }),
      
      openModal: (modalId) => set({ modalOpen: modalId }),
      closeModal: () => set({ modalOpen: null }),
    }),
    { name: 'ui-storage' }
  )
)
```

```typescript
// src/store/userStore.ts
import { create } from 'zustand'
import type { User } from '@/types/database.types'

interface UserState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

```typescript
// src/store/index.ts
export { useUIStore } from './uiStore'
export { useUserStore } from './userStore'
```

### Usar el Store en Componentes

```typescript
// components/layout/Sidebar.tsx
'use client'

import { useUIStore } from '@/store'

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  
  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  )
}
```

### Patrón de Slices (para stores más grandes)

```typescript
// src/store/slices/uiSlice.ts
import { StateCreator } from 'zustand'

export interface UISlice {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
})
```

---

## 2. TanStack Query - Estado de Servidor

### Cuándo usar TanStack Query
- Fetching de datos del servidor
- Mutations (create, update, delete)
- Cache y invalidación
- Optimistic updates
- Infinite scrolling / paginación

### Instalación
```bash
npm install @tanstack/react-query
```

### Crear el Provider

```typescript
// src/providers/query-provider.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 30 * 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Agregar al Root Layout

```typescript
// src/app/layout.tsx
import { QueryProvider } from '@/providers/query-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

### Crear Query Keys (Best Practice)

```typescript
// src/lib/query-keys.ts
export const queryKeys = {
  // Usuarios
  usuarios: {
    all: ['usuarios'] as const,
    lists: () => [...queryKeys.usuarios.all, 'list'] as const,
    list: (filters?: UsuarioFilters) => [...queryKeys.usuarios.lists(), filters] as const,
    details: () => [...queryKeys.usuarios.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.usuarios.details(), id] as const,
  },
  
  // Equipos
  equipos: {
    all: ['equipos'] as const,
    lists: () => [...queryKeys.equipos.all, 'list'] as const,
    list: (sedeId?: string) => [...queryKeys.equipos.lists(), sedeId] as const,
    details: () => [...queryKeys.equipos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.equipos.details(), id] as const,
  },
  
  // Sesiones
  sesiones: {
    all: ['sesiones'] as const,
    lists: () => [...queryKeys.sesiones.all, 'list'] as const,
    list: (equipoId?: string, fecha?: Date) => 
      [...queryKeys.sesiones.lists(), { equipoId, fecha }] as const,
    details: () => [...queryKeys.sesiones.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sesiones.details(), id] as const,
  },
  
  // Ejercicios
  ejercicios: {
    all: ['ejercicios'] as const,
    lists: () => [...queryKeys.ejercicios.all, 'list'] as const,
    list: (sedeId?: string) => [...queryKeys.ejercicios.lists(), sedeId] as const,
    details: () => [...queryKeys.ejercicios.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ejercicios.details(), id] as const,
  },
} as const
```

### Crear Hooks de Queries

```typescript
// src/hooks/useEquipos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { equiposService } from '@/services/equipos.service'
import { toast } from 'sonner'

export function useEquipos(sedeId?: string) {
  return useQuery({
    queryKey: queryKeys.equipos.list(sedeId),
    queryFn: () => equiposService.getAll(sedeId),
  })
}

export function useEquipo(id: string) {
  return useQuery({
    queryKey: queryKeys.equipos.detail(id),
    queryFn: () => equiposService.getById(id),
    enabled: !!id,
  })
}

export function useCreateEquipo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: equiposService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipos.all })
      toast.success('Equipo creado correctamente')
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    },
  })
}

export function useUpdateEquipo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Equipo> }) =>
      equiposService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.equipos.detail(id) })
      
      const previous = queryClient.getQueryData(queryKeys.equipos.detail(id))
      
      queryClient.setQueryData(queryKeys.equipos.detail(id), (old: any) => ({
        ...old,
        ...data,
      }))
      
      return { previous }
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(
        queryKeys.equipos.detail(vars.id),
        context?.previous
      )
      toast.error('Error al actualizar')
    },
    onSettled: (data, error, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipos.detail(vars.id) })
    },
  })
}

export function useDeleteEquipo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: equiposService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.equipos.all })
      toast.success('Equipo eliminado')
    },
  })
}
```

### Usar en Componentes

```typescript
// components/equipos/EquiposList.tsx
'use client'

import { useEquipos } from '@/hooks/useEquipos'

export function EquiposList({ sedeId }: { sedeId: string }) {
  const { data: equipos, isLoading, error } = useEquipos(sedeId)
  
  if (isLoading) return <EquiposSkeleton />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {equipos?.map((equipo) => (
        <EquipoCard key={equipo.id} equipo={equipo} />
      ))}
    </div>
  )
}
```

---

## 3. Zod - Validación de Esquemas

### Cuándo usar Zod
- Validación de formularios
- Validación de API responses
- Type inference desde schemas
- Validación de environment variables

### Instalación
```bash
npm install zod
```

### Crear Esquemas

```typescript
// src/schemas/user.schema.ts
import { z } from 'zod'

export const rolEnum = z.enum(['SuperAdmin', 'AdminSede', 'Entrenador'])

export const usuarioSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'Nombre muy corto').max(100),
  rol: rolEnum,
  sede_id: z.string().uuid().nullable(),
  telefono: z.string().optional(),
  foto_perfil: z.string().url().optional().nullable(),
})

export const createUsuarioSchema = z.object({
  email: z.string().email('Email requerido'),
  nombre: z.string().min(2, 'Nombre requerido'),
  rol: rolEnum,
  sede_id: z.string().uuid().optional().nullable(),
  telefono: z.string().optional(),
})

export const updateUsuarioSchema = createUsuarioSchema.partial()

export type Usuario = z.infer<typeof usuarioSchema>
export type CreateUsuario = z.infer<typeof createUsuarioSchema>
export type UpdateUsuario = z.infer<typeof updateUsuarioSchema>
```

```typescript
// src/schemas/equipo.schema.ts
import { z } from 'zod'

export const equipoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, 'Nombre requerido'),
  categoria: z.string().optional(),
  sede_id: z.string().uuid(),
  entrenador_principal_id: z.string().uuid().nullable(),
  entrenador_adjunto_id: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createEquipoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  categoria: z.string().optional(),
  sede_id: z.string().uuid('Sede requerida'),
  entrenador_principal_id: z.string().uuid().optional().nullable(),
  entrenador_adjunto_id: z.string().uuid().optional().nullable(),
})

export const updateEquipoSchema = createEquipoSchema.partial()

export type Equipo = z.infer<typeof equipoSchema>
export type CreateEquipo = z.infer<typeof createEquipoSchema>
export type UpdateEquipo = z.infer<typeof updateEquipoSchema>
```

```typescript
// src/schemas/sesion.schema.ts
import { z } from 'zod'

export const estadoSesionEnum = z.enum(['Borrador', 'Planificada', 'Realizada'])
export const periodoTemporadaEnum = z.enum(['Pretemporada', 'Competición'])

export const sesionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato fecha inválido'),
  hora_inicio: z.string().optional(),
  duracion_estimada: z.number().int().positive().optional(),
  equipo_id: z.string().uuid(),
  entrenador_id: z.string().uuid(),
  microciclo: z.number().int().min(1).max(52).optional(),
  periodo_temporada: periodoTemporadaEnum.optional(),
  objetivo_sesion: z.string().optional(),
  observaciones_previas: z.string().optional(),
  feedback_post_entreno: z.string().optional(),
  estado: estadoSesionEnum,
})

export const sesionDetalleSchema = z.object({
  id: z.string().uuid(),
  sesion_id: z.string().uuid(),
  ejercicio_id: z.string().uuid(),
  orden: z.number().int().positive(),
  tiempo_ejecucion: z.number().int().positive().optional(),
  tiempo_descanso: z.number().int().positive().optional(),
  variante_aplicada: z.string().optional(),
})

export const createSesionSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida'),
  hora_inicio: z.string().optional(),
  duracion_estimada: z.number().int().positive().optional(),
  equipo_id: z.string().uuid('Equipo requerido'),
  entrenador_id: z.string().uuid('Entrenador requerido'),
  microciclo: z.number().int().min(1).max(52).optional(),
  periodo_temporada: periodoTemporadaEnum.optional(),
  objetivo_sesion: z.string().optional(),
  observaciones_previas: z.string().optional(),
  estado: estadoSesionEnum.default('Borrador'),
})

export type Sesion = z.infer<typeof sesionSchema>
export type SesionDetalle = z.infer<typeof sesionDetalleSchema>
export type CreateSesion = z.infer<typeof createSesionSchema>
```

```typescript
// src/schemas/index.ts
export * from './user.schema'
export * from './equipo.schema'
export * from './sesion.schema'
```

### Usar con TanStack Query para validar respuestas

```typescript
// src/hooks/useEquipos.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { equiposService } from '@/services/equipos.service'
import { equipoSchema } from '@/schemas'

export function useEquipos(sedeId?: string) {
  return useQuery({
    queryKey: queryKeys.equipos.list(sedeId),
    queryFn: async () => {
      const data = await equiposService.getAll(sedeId)
      // Validar respuesta contra schema
      return z.array(equipoSchema).parse(data)
    },
  })
}
```

---

## 4. React Hook Form + Zod

### Cuándo usar
- Formularios complejos
- Validación en tiempo real
- Manejo de errores
- Integración con UI components

### Instalación
```bash
npm install react-hook-form @hookform/resolvers
```

### Crear Formulario

```typescript
// components/equipos/EquipoForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEquipoSchema, type CreateEquipo } from '@/schemas'
import { useCreateEquipo } from '@/hooks/useEquipos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form'

export function EquipoForm({ 
  sedeId, 
  onSuccess 
}: { 
  sedeId: string
  onSuccess?: () => void 
}) {
  const createEquipo = useCreateEquipo()
  
  const form = useForm<CreateEquipo>({
    resolver: zodResolver(createEquipoSchema),
    defaultValues: {
      nombre: '',
      categoria: '',
      sede_id: sedeId,
      entrenador_principal_id: null,
    },
  })

  async function onSubmit(values: CreateEquipo) {
    try {
      await createEquipo.mutateAsync(values)
      form.reset()
      onSuccess?.()
    } catch (error) {
      // Error manejado por useCreateEquipo
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del equipo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Infantil A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 2015" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          disabled={createEquipo.isPending}
        >
          {createEquipo.isPending ? 'Creando...' : 'Crear equipo'}
        </Button>
      </form>
    </Form>
  )
}
```

### Componentes UI base necesarios (shadcn)

```typescript
// components/ui/form.tsx - Crear con shadcn
// npx shadcn@latest add form
```

---

## 5. Framer Motion - Animaciones

### Cuándo usar
- Transiciones de páginas
- Animaciones de entrada/salida
- Gestos y drag
- Animaciones complejas

### Instalación
```bash
npm install framer-motion
```

### Ejemplos de Uso

```typescript
// components/shared/PageTransition.tsx
'use client'

import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
```

```typescript
// components/equipos/EquipoCard.tsx
'use client'

import { motion } from 'framer-motion'

export function EquipoCard({ equipo }: { equipo: Equipo }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="card"
    >
      <h3>{equipo.nombre}</h3>
      <p>{equipo.categoria}</p>
    </motion.div>
  )
}
```

```typescript
// components/shared/StaggerChildren.tsx
'use client'

import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function StaggerChildren({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
    >
      {Array.isArray(children) 
        ? children.map((child, i) => (
            <motion.div key={i} variants={item}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={item}>{children}</motion.div>
      }
    </motion.div>
  )
}
```

### Animación de Lista con AnimatePresence

```typescript
// components/equipos/EquiposList.tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEquipos } from '@/hooks/useEquipos'

export function EquiposList({ sedeId }: { sedeId: string }) {
  const { data: equipos } = useEquipos(sedeId)
  
  return (
    <motion.div layout className="grid grid-cols-3 gap-4">
      <AnimatePresence>
        {equipos?.map((equipo) => (
          <motion.div
            key={equipo.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <EquipoCard equipo={equipo} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
```

---

## 6. Vitest + Testing Library

### Cuándo escribir tests
- Funciones de utilidad
- Hooks personalizados
- Componentes críticos
- Lógica de negocio compleja

### Instalación
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Configurar Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom'
```

### Agregar scripts en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Tests de Ejemplo

```typescript
// src/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('combines class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  
  it('handles conditional classes', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
    expect(cn('base', !isActive && 'active')).toBe('base')
  })
  
  it('merges Tailwind classes', () => {
    expect(cn('px-2 px-4')).toBe('px-4')
  })
})
```

```typescript
// src/__tests__/components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
  
  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('destructive')
  })
  
  it('is disabled when loading', () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

```typescript
// src/__tests__/hooks/useEquipos.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEquipos } from '@/hooks/useEquipos'
import { equiposService } from '@/services/equipos.service'

vi.mock('@/services/equipos.service', () => ({
  equiposService: {
    getAll: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useEquipos', () => {
  it('fetches equipos', async () => {
    const mockEquipos = [
      { id: '1', nombre: 'Infantil A', categoria: '2015' },
      { id: '2', nombre: 'Juvenil B', categoria: '2010' },
    ]
    
    vi.mocked(equiposService.getAll).mockResolvedValue(mockEquipos)
    
    const { result } = renderHook(() => useEquipos(), {
      wrapper: createWrapper(),
    })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data).toEqual(mockEquipos)
  })
})
```

---

## 7. Integración Completa: Flujo de Ejemplo

### Crear un nuevo módulo (ej. Sedes)

```typescript
// 1. Crear esquema de validación
// src/schemas/sede.schema.ts
import { z } from 'zod'

export const sedeSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  direccion: z.string().optional(),
  configuracion_visual: z.record(z.any()).optional(),
  responsable_id: z.string().uuid().nullable(),
})

export const createSedeSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  direccion: z.string().optional(),
  responsable_id: z.string().uuid().optional().nullable(),
})

export type Sede = z.infer<typeof sedeSchema>
export type CreateSede = z.infer<typeof createSedeSchema>
```

```typescript
// 2. Crear query keys
// src/lib/query-keys.ts (agregar)
sedes: {
  all: ['sedes'] as const,
  lists: () => [...queryKeys.sedes.all, 'list'] as const,
  list: () => [...queryKeys.sedes.lists()] as const,
  details: () => [...queryKeys.sedes.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.sedes.details(), id] as const,
},
```

```typescript
// 3. Crear hooks con TanStack Query
// src/hooks/useSedes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { sedesService } from '@/services/sedes.service'
import { createSedeSchema } from '@/schemas'
import { toast } from 'sonner'
import type { CreateSede } from '@/schemas'

export function useSedes() {
  return useQuery({
    queryKey: queryKeys.sedes.list(),
    queryFn: async () => {
      const data = await sedesService.getAll()
      return z.array(createSedeSchema).parse(data)
    },
  })
}

export function useSede(id: string) {
  return useQuery({
    queryKey: queryKeys.sedes.detail(id),
    queryFn: () => sedesService.getById(id),
    enabled: !!id,
  })
}

export function useCreateSede() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateSede) => {
      const validated = createSedeSchema.parse(data)
      return sedesService.create(validated)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sedes.all })
      toast.success('Sede creada correctamente')
    },
    onError: () => {
      toast.error('Error al crear la sede')
    },
  })
}
```

```typescript
// 4. Crear formulario con React Hook Form + Zod
// components/sedes/SedeForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSedeSchema, type CreateSede } from '@/schemas'
import { useCreateSede } from '@/hooks/useSedes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export function SedeForm({ onSuccess }: { onSuccess?: () => void }) {
  const createSede = useCreateSede()
  
  const form = useForm<CreateSede>({
    resolver: zodResolver(createSedeSchema),
    defaultValues: {
      nombre: '',
      direccion: '',
    },
  })

  async function onSubmit(values: CreateSede) {
    await createSede.mutateAsync(values)
    form.reset()
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la sede" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Dirección completa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={createSede.isPending}>
          {createSede.isPending ? 'Creando...' : 'Crear sede'}
        </Button>
      </form>
    </Form>
  )
}
```

```typescript
// 5. Crear componente de lista con animaciones
// components/sedes/SedesList.tsx
'use client'

import { motion } from 'framer-motion'
import { useSedes } from '@/hooks/useSedes'

export function SedesList() {
  const { data: sedes, isLoading } = useSedes()
  
  if (isLoading) return <SedesSkeleton />
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {sedes?.map((sede, index) => (
        <motion.div
          key={sede.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <SedeCard sede={sede} />
        </motion.div>
      ))}
    </div>
  )
}
```

```typescript
// 6. Escribir tests
// src/__tests__/schemas/sede.schema.test.ts
import { describe, it, expect } from 'vitest'
import { createSedeSchema } from '@/schemas/sede.schema'

describe('createSedeSchema', () => {
  it('validates valid data', () => {
    const valid = {
      nombre: 'Centro Deportivo Norte',
      direccion: 'Calle Principal 123',
    }
    expect(() => createSedeSchema.parse(valid)).not.toThrow()
  })
  
  it('rejects empty nombre', () => {
    const invalid = { nombre: '' }
    expect(() => createSedeSchema.parse(invalid)).toThrow()
  })
})
```

---

## Mejores Prácticas

### Do's
- Usa **Zustand** solo para estado que necesita persistencia o acceso global
- Usa **TanStack Query** para todo lo que venga de la base de datos
- Valida con **Zod** en el boundary de tu aplicación (forms, API responses)
- Mantén los **schemas** cerca de los tipos
- Usa **Framer Motion** con moderación (solo donde añade valor)
- Escribe tests para lógica de negocio compleja

### Don'ts
- No guardes datos del servidor en Zustand (usa TanStack Query)
- No crees stores globales para todo
- No animas todo (prioriza rendimiento)
- No escribas tests para componentes triviales

---

## Recursos

- [Zustand Docs](https://zustand.docs.pmnd.rs)
- [TanStack Query](https://tanstack.com/query)
- [Zod](https://zod.dev)
- [React Hook Form](https://react-hook-form.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Vitest](https://vitest.dev)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/docs/intro)
- [Sentry](https://docs.sentry.io)

---

## Migración desde Hooks Custom Existentes

El proyecto ya tiene hooks custom en `src/hooks/` que usan el patrón simple de `useQuery` y `useMutation`. 

### hooks/custom vs TanStack Query

| Característica | Hooks Custom | TanStack Query |
|----------------|--------------|----------------|
| Cache | No | Sí (automatico) |
| Invalidación | Manual | Automática |
| Deduplicación | No | Sí |
| Optimistic updates | Manual | Integrado |
| Infinite queries | Manual | Integrado |
| Persistencia en disco | No | Sí (con extensión) |

### Recomendación de Migración Gradual

1. **Mantén los hooks existentes** para funcionalidad que ya funciona
2. **Añade TanStack Query** para features nuevas
3. **Migra gradualmente** cuando necesites caching o invalidación automática

### Ejemplo: Usar TanStack Query con Servicios Existentes

```typescript
// src/hooks/useEquiposTanStack.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { 
  fetchEquiposForWorkspace, 
  createEquipo, 
  updateEquipo, 
  deleteEquipo 
} from '@/services/equipos.service'
import type { Equipo, EquipoCreateInput, EquipoUpdateInput } from '@/types/equipos'

export function useEquiposTanStack(workspaceId: string | null) {
  return useQuery({
    queryKey: ['equipos', workspaceId],
    queryFn: async () => {
      const { data } = await fetchEquiposForWorkspace(workspaceId)
      return data
    },
    enabled: !!workspaceId,
  })
}

export function useCreateEquipoTanStack() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (input: EquipoCreateInput) => createEquipo(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
    },
  })
}
```

### Usar Zod con Servicios Existentes

```typescript
// Validar antes de enviar al servicio
import { createEquipoSchema } from '@/schemas'
import { createEquipo } from '@/services/equipos.service'

async function handleCreateEquipo(input: unknown) {
  // Validar con Zod
  const validated = createEquipoSchema.parse(input)
  
  // Enviar al servicio
  return createEquipo(validated)
}
```

### Siguientes Pasos

1. ~~Instalar dependencias~~ ✅
2. ~~Crear store base (Zustand)~~ ✅
3. ~~Crear provider (TanStack Query)~~ ✅
4. ~~Crear schemas (Zod)~~ ✅
5. ~~Configurar Vitest~~ ✅
6. ~~Integrar QueryProvider en layout~~ ✅
7. ~~Configurar Playwright~~ ✅
8. Crear hooks con TanStack Query
9. Migrar formularios a React Hook Form + Zod
10. Escribir tests (Vitest + Playwright E2E)
