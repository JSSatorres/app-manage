import { z } from 'zod'

export const estadoSesionEnum = z.enum(['Borrador', 'Planificada', 'Realizada', 'NoRealizada'])
export const periodoTemporadaEnum = z.enum(['Pretemporada', 'Competición'])

// Alineado con `Sesion`/`SesionCreateInput`/`SesionUpdateInput` (src/types/sesiones.ts):
// camelCase en todos los campos, `entrenadorIds` como array (tabla pivote
// sesion_entrenadores). Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
// Task 1.2 (entrenadorIds) y Task 3.1 Lote D (resto de campos a camelCase).
export const sesionSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato fecha inválido'),
  horaInicio: z.string().optional().nullable(),
  duracionEstimada: z.number().int().positive().optional().nullable(),
  equipoId: z.string().uuid(),
  entrenadorIds: z.array(z.string().uuid()),
  microciclo: z.number().int().min(1).max(52).optional().nullable(),
  periodoTemporada: periodoTemporadaEnum.optional().nullable(),
  objetivoSesion: z.string().optional().nullable(),
  observacionesPrevias: z.string().optional().nullable(),
  feedbackPostEntreno: z.string().optional().nullable(),
  estado: estadoSesionEnum,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const createSesionSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida'),
  horaInicio: z.string().optional().nullable(),
  duracionEstimada: z.number().int().positive().optional().nullable(),
  equipoId: z.string().uuid('Equipo requerido'),
  entrenadorIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos un entrenador'),
  microciclo: z.number().int().min(1).max(52).optional().nullable(),
  periodoTemporada: periodoTemporadaEnum.optional().nullable(),
  objetivoSesion: z.string().optional().nullable(),
  observacionesPrevias: z.string().optional().nullable(),
  estado: estadoSesionEnum.default('Borrador'),
})

// `SesionUpdateInput` = `SesionCreateInput` + `feedbackPostEntreno` (src/types/sesiones.ts).
// A diferencia de la versión anterior, no se hace `.partial()`: el servicio
// `updateSesion` reemplaza el registro completo (incluye equipo/entrenadores).
export const updateSesionSchema = createSesionSchema.extend({
  feedbackPostEntreno: z.string().optional().nullable(),
})

export type Sesion = z.infer<typeof sesionSchema>
export type CreateSesion = z.infer<typeof createSesionSchema>
export type UpdateSesion = z.infer<typeof updateSesionSchema>
