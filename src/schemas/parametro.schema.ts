import { z } from 'zod'

export const createParametroSchema = z.object({
  categoria: z.string().min(1, 'Categoría requerida'),
  nombre: z.string().min(1, 'Nombre requerido'),
  activo: z.boolean(),
  sedeId: z.string().uuid('Sede inválida').optional().nullable(),
})

export const updateParametroSchema = createParametroSchema.omit({ categoria: true })

export type CreateParametro = z.infer<typeof createParametroSchema>
export type UpdateParametro = z.infer<typeof updateParametroSchema>
