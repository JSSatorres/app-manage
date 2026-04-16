export const queryKeys = {
  usuarios: {
    all: ['usuarios'] as const,
    lists: () => [...queryKeys.usuarios.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.usuarios.lists(), filters] as const,
    details: () => [...queryKeys.usuarios.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.usuarios.details(), id] as const,
  },
  
  equipos: {
    all: ['equipos'] as const,
    lists: () => [...queryKeys.equipos.all, 'list'] as const,
    list: (sedeId?: string) => [...queryKeys.equipos.lists(), sedeId] as const,
    details: () => [...queryKeys.equipos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.equipos.details(), id] as const,
  },
  
  sesiones: {
    all: ['sesiones'] as const,
    lists: () => [...queryKeys.sesiones.all, 'list'] as const,
    list: (equipoId?: string, fecha?: string) => 
      [...queryKeys.sesiones.lists(), { equipoId, fecha }] as const,
    details: () => [...queryKeys.sesiones.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sesiones.details(), id] as const,
  },
  
  ejercicios: {
    all: ['ejercicios'] as const,
    lists: () => [...queryKeys.ejercicios.all, 'list'] as const,
    list: (sedeId?: string) => [...queryKeys.ejercicios.lists(), sedeId] as const,
    details: () => [...queryKeys.ejercicios.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ejercicios.details(), id] as const,
  },
  
  sedes: {
    all: ['sedes'] as const,
    lists: () => [...queryKeys.sedes.all, 'list'] as const,
    list: () => [...queryKeys.sedes.lists()] as const,
    details: () => [...queryKeys.sedes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sedes.details(), id] as const,
  },
} as const

export type QueryKeys = typeof queryKeys
