import { z } from 'zod'
import type {
  CloneSedeOmission,
  CloneSedeOmissionSummary,
  CloneSedePreflight,
  CloneSedeSelection,
  CloneableSedeContent,
  CloneableSesionOption,
} from "@/types/sedes"

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

const cloneSedeSelectionCategories = [
  "equipos",
  "entrenadores",
  "jugadores",
  "sesiones",
  "parametros",
  "documentos",
] as const

const uniqueUuidArraySchema = z.array(z.string().uuid()).superRefine((ids, context) => {
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: "custom",
      message: "Los identificadores seleccionados no pueden repetirse",
    })
  }
})

export const cloneSedeCategorySchema = z.enum(cloneSedeSelectionCategories)

export const cloneSedeSelectionSchema = z.object({
  equipos: uniqueUuidArraySchema,
  entrenadores: uniqueUuidArraySchema,
  jugadores: uniqueUuidArraySchema,
  sesiones: uniqueUuidArraySchema,
  parametros: uniqueUuidArraySchema,
  documentos: uniqueUuidArraySchema,
}).strict()

export function normalizeCloneSedeSelection(
  selection: CloneSedeSelection,
  sesiones: CloneableSesionOption[],
): CloneSedeSelection {
  const selectedSessionIds = new Set(selection.sesiones)
  const selectedSessions = sesiones.filter((sesion) => selectedSessionIds.has(sesion.id))
  const unresolvedSessionId = selection.sesiones.find(
    (sesionId) => !selectedSessions.some((sesion) => sesion.id === sesionId),
  )

  if (unresolvedSessionId) {
    throw new Error("No se han podido resolver las dependencias de la sesiÃ³n seleccionada")
  }

  return {
    equipos: [...new Set([...selection.equipos, ...selectedSessions.map((sesion) => sesion.equipoId)])],
    entrenadores: [...new Set([...selection.entrenadores, ...selectedSessions.flatMap((sesion) => sesion.trainerIds)])],
    jugadores: [...new Set(selection.jugadores)],
    sesiones: selectedSessions.map((sesion) => sesion.id),
    parametros: [...new Set(selection.parametros)],
    documentos: [...new Set(selection.documentos)],
  }
}

function createOmissionSummary(omissions: CloneSedeOmission[]): CloneSedeOmissionSummary {
  const summary: CloneSedeOmissionSummary = {
    entrenador_equipo_no_seleccionado: 0,
    jugador_equipo_no_seleccionado: 0,
    sesion_equipo_no_seleccionado: 0,
    total: omissions.length,
  }

  for (const omission of omissions) {
    summary[omission.code] += 1
  }

  return summary
}

export function deriveCloneSedePreflight(
  content: CloneableSedeContent,
  selection: CloneSedeSelection,
): CloneSedePreflight {
  const normalizedSelection = normalizeCloneSedeSelection(selection, content.sesiones)
  const selectedTeamIds = new Set(normalizedSelection.equipos)
  const selectedTrainerIds = new Set(normalizedSelection.entrenadores)
  const selectedPlayerIds = new Set(normalizedSelection.jugadores)
  const selectedSessionIds = new Set(normalizedSelection.sesiones)
  const trainerLabels = new Map(content.entrenadores.map((entrenador) => [entrenador.id, entrenador.label]))
  const playerLabels = new Map(content.jugadores.map((jugador) => [jugador.id, jugador.label]))
  const teamLabels = new Map(content.equipos.map((equipo) => [equipo.id, equipo.label]))
  const selectedSessions = content.sesiones.filter((sesion) => selectedSessionIds.has(sesion.id))
  const effectiveTrainerIds = new Set([
    ...selectedTrainerIds,
    ...selectedSessions.flatMap((sesion) => sesion.trainerIds),
  ])
  const omissions: CloneSedeOmission[] = []

  for (const relation of content.entrenadorEquipos ?? []) {
    if (!effectiveTrainerIds.has(relation.personId) || selectedTeamIds.has(relation.equipoId)) {
      continue
    }

    const trainerLabel = trainerLabels.get(relation.personId) ?? relation.personId
    const teamLabel = teamLabels.get(relation.equipoId) ?? relation.equipoId
    omissions.push({
      code: "entrenador_equipo_no_seleccionado",
      entityId: relation.personId,
      entityLabel: trainerLabel,
      relatedId: relation.equipoId,
      relatedLabel: teamLabel,
      detail: `El entrenador ${trainerLabel} se asociará a la sede, pero no al equipo ${teamLabel} porque no se ha seleccionado.`,
    })
  }

  for (const relation of content.jugadorEquipos ?? []) {
    if (!selectedPlayerIds.has(relation.personId) || selectedTeamIds.has(relation.equipoId)) {
      continue
    }

    const playerLabel = playerLabels.get(relation.personId) ?? relation.personId
    const teamLabel = teamLabels.get(relation.equipoId) ?? relation.equipoId
    omissions.push({
      code: "jugador_equipo_no_seleccionado",
      entityId: relation.personId,
      entityLabel: playerLabel,
      relatedId: relation.equipoId,
      relatedLabel: teamLabel,
      detail: `El jugador ${playerLabel} se asociará a la sede, pero no al equipo ${teamLabel} porque no se ha seleccionado.`,
    })
  }

  return {
    effectiveSelection: {
      equipos: normalizedSelection.equipos,
      entrenadores: [...effectiveTrainerIds],
      jugadores: normalizedSelection.jugadores,
      sesiones: normalizedSelection.sesiones,
      parametros: normalizedSelection.parametros,
      documentos: normalizedSelection.documentos,
    },
    omissions,
    omissionSummary: createOmissionSummary(omissions),
  }
}

export const cloneSedeSchema = z.object({
  workspaceId: z.string().uuid(),
  sourceSedeId: z.string().uuid(),
  nombre: z.string().min(1, "Nombre requerido"),
  direccion: z.string().nullable(),
  seleccion: cloneSedeSelectionSchema,
}).strict()

export type Sede = z.infer<typeof sedeSchema>
export type CreateSede = z.infer<typeof createSedeSchema>
export type UpdateSede = z.infer<typeof updateSedeSchema>
export type CloneSede = z.infer<typeof cloneSedeSchema>
