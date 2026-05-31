import { z } from 'zod'

export const createEntrenadorSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido (min 2)'),
  apellidos: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  titulacion: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  sedeIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos una sede'),
  equipoIds: z.array(z.string().uuid()).default([]),
})

export const updateEntrenadorSchema = createEntrenadorSchema

export type CreateEntrenador = z.infer<typeof createEntrenadorSchema>
export type UpdateEntrenador = z.infer<typeof updateEntrenadorSchema>
