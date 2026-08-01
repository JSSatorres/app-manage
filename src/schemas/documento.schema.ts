import { z } from 'zod'

const documentoCommonSchema = z.object({
  titulo: z.string().min(2, 'Título requerido (mín. 2 caracteres)'),
  categoriaDoc: z.string().optional().nullable(),
  sedeId: z.string().uuid('Sede inválida').optional().nullable(),
  sedeIds: z.array(z.string().uuid()).default([]),
  equipoIds: z.array(z.string().uuid()).default([]),
  // workspace_id es nullable: null = documento global del club, visible en todo el workspace.
  workspaceId: z.string().uuid('Workspace inválido').optional().nullable(),
  visibleEntrenadores: z.boolean().default(false),
  entrenadorIds: z.array(z.string().uuid()).default([]),
})

export const createDocumentoFileSchema = documentoCommonSchema.extend({
  file: z.file('Selecciona un archivo'),
})

export const createDocumentoLinkSchema = documentoCommonSchema.extend({
  externalUrl: z.string().url('URL inválida'),
})

export const updateDocumentoSchema = documentoCommonSchema.extend({
  externalUrl: z.string().url('URL inválida').optional().nullable(),
})

export type CreateDocumentoFile = z.infer<typeof createDocumentoFileSchema>
export type CreateDocumentoLink = z.infer<typeof createDocumentoLinkSchema>
export type UpdateDocumento = z.infer<typeof updateDocumentoSchema>
