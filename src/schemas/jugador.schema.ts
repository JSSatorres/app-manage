import { z } from 'zod'

export const createJugadorSchema = z.object({
  nombre: z.string().min(2, 'Nombre requerido (min 2)'),
  apellidos: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  dorsal: z.number().int().min(0).max(999).optional().nullable(),
  posicion: z.string().optional().nullable(),
  pieDominante: z.enum(['Diestro', 'Zurdo', 'Ambidiestro']).optional().nullable(),
  notas: z.string().optional().nullable(),
  tutorNombre: z.string().optional().nullable(),
  tutorTelefono: z.string().optional().nullable(),
  sedeIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos una sede'),
  equipoIds: z.array(z.string().uuid()).default([]),
})

export const updateJugadorSchema = createJugadorSchema

export type CreateJugador = z.infer<typeof createJugadorSchema>
export type UpdateJugador = z.infer<typeof updateJugadorSchema>
