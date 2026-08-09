import { z } from "zod"

export const storageUpgradeRequestSchema = z.object({
  workspaceId: z.string().uuid("Workspace invÃ¡lido"),
  catalogItemId: z.string().uuid("AmpliaciÃ³n invÃ¡lida"),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no pueden superar 500 caracteres")
    .optional()
    .nullable()
    .transform((value) => value || null),
})

export type StorageUpgradeRequestInput = z.input<typeof storageUpgradeRequestSchema>
