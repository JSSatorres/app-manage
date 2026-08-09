import { z } from 'zod'

const EXTERNAL_LINK_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'drive.google.com',
  'www.drive.google.com',
])

const createExternalLinkUrlSchema = z.string().trim().url('URL inválida').refine(
  (value) => {
    try {
      const url = new URL(value)
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        EXTERNAL_LINK_HOSTS.has(url.hostname)
      )
    } catch {
      return false
    }
  },
  'Introduce un enlace HTTPS de YouTube o Google Drive',
)

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
  externalUrl: createExternalLinkUrlSchema,
})

export const updateDocumentoSchema = documentoCommonSchema.extend({
  externalUrl: z.string().url('URL inválida').optional().nullable(),
})

export type CreateDocumentoFile = z.infer<typeof createDocumentoFileSchema>
export type CreateDocumentoLink = z.infer<typeof createDocumentoLinkSchema>
export type UpdateDocumento = z.infer<typeof updateDocumentoSchema>
