import { z } from 'zod'

export const createEquipoSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido (mín. 2 caracteres)'),
  categoria: z.string().optional().nullable(),
  sedeId: z.string().uuid('Sede requerida'),
  entrenadorIds: z.array(z.string().uuid()).default([]),
  jugadorIds: z.array(z.string().uuid()).default([]),
})

export const updateEquipoSchema = createEquipoSchema

export type CreateEquipo = z.infer<typeof createEquipoSchema>
export type UpdateEquipo = z.infer<typeof updateEquipoSchema>
