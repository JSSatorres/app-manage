import { z } from 'zod'

export const createEjercicioSchema = z.object({
  titulo: z.string().min(2, 'Título requerido (mín. 2 caracteres)'),
  objetivoPrincipal: z.string().optional().nullable(),
  numeroJugadoresMin: z.number().int('Debe ser un número entero').min(0, 'Debe ser 0 o mayor').optional().nullable(),
  sedePropietariaId: z.string().uuid('Sede inválida').optional().nullable(),
  esGlobal: z.boolean(),
  documentoIds: z.array(z.string().uuid()).optional(),
})

export const updateEjercicioSchema = createEjercicioSchema

export type CreateEjercicio = z.infer<typeof createEjercicioSchema>
export type UpdateEjercicio = z.infer<typeof updateEjercicioSchema>
