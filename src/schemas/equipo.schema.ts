import { z } from 'zod'

export const equipoSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, 'Nombre requerido'),
  categoria: z.string().optional().nullable(),
  sede_id: z.string().uuid(),
  entrenador_principal_id: z.string().uuid().nullable().optional(),
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
