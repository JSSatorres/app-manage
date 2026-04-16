import { z } from 'zod'

export const estadoSesionEnum = z.enum(['Borrador', 'Planificada', 'Realizada'])
export const periodoTemporadaEnum = z.enum(['Pretemporada', 'Competición'])

export const sesionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato fecha inválido'),
  hora_inicio: z.string().optional().nullable(),
  duracion_estimada: z.number().int().positive().optional(),
  equipo_id: z.string().uuid(),
  entrenador_id: z.string().uuid(),
  microciclo: z.number().int().min(1).max(52).optional().nullable(),
  periodo_temporada: periodoTemporadaEnum.optional().nullable(),
  objetivo_sesion: z.string().optional().nullable(),
  observaciones_previas: z.string().optional().nullable(),
  feedback_post_entreno: z.string().optional().nullable(),
  estado: estadoSesionEnum,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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

export const updateSesionSchema = createSesionSchema.partial()
  .omit({ equipo_id: true, entrenador_id: true })

export type Sesion = z.infer<typeof sesionSchema>
export type CreateSesion = z.infer<typeof createSesionSchema>
export type UpdateSesion = z.infer<typeof updateSesionSchema>
