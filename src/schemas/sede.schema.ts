import { z } from 'zod'

export const sedeSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1, 'Nombre requerido'),
  direccion: z.string().optional().nullable(),
  configuracion_visual: z.record(z.string(), z.unknown()).optional(),
  responsable_id: z.string().uuid().nullable().optional(),
  workspace_id: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createSedeSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  direccion: z.string().optional(),
  responsable_id: z.string().uuid().optional().nullable(),
  workspace_id: z.string(),
})

export const updateSedeSchema = createSedeSchema.partial()
  .omit({ workspace_id: true })

export type Sede = z.infer<typeof sedeSchema>
export type CreateSede = z.infer<typeof createSedeSchema>
export type UpdateSede = z.infer<typeof updateSedeSchema>
