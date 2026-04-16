import { z } from 'zod'

export const rolEnum = z.enum(['SuperAdmin', 'AdminSede', 'Entrenador'])

export const usuarioSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'Nombre muy corto').max(100),
  rol: z.string(),
  sede_id: z.string().uuid().nullable(),
  telefono: z.string().optional(),
  foto_perfil: z.string().url().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createUsuarioSchema = z.object({
  email: z.string().email('Email requerido'),
  nombre: z.string().min(2, 'Nombre requerido'),
  rol: rolEnum,
  sede_id: z.string().uuid().optional().nullable(),
  telefono: z.string().optional(),
})

export const updateUsuarioSchema = createUsuarioSchema.partial()

export type Usuario = z.infer<typeof usuarioSchema>
export type CreateUsuario = z.infer<typeof createUsuarioSchema>
export type UpdateUsuario = z.infer<typeof updateUsuarioSchema>
