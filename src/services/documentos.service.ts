import { getSupabaseClient } from "@/services/supabase"
import {
  deleteDocumentStorageAsset,
  getDocumentStorageOpenUrl,
  uploadDocumentFile,
} from "@/services/document-storage.service"
import type {
  Documento,
  DocumentoLinkCreateInput,
  DocumentoSourceType,
  DocumentoUpdateInput,
} from "@/types/documentos"
import { detectPlatform } from "@/lib/documentoLinks"

export const DOCUMENTOS_BUCKET = "documentos"

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
)

interface DocumentoRow {
  id: string
  titulo: string
  categoria_doc: string | null
  drive_file_id: string | null
  storage_path: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  extension: string | null
  external_url: string | null
  source_type: string | null
  content_asset_id: string | null
  content_assets: ContentAssetRow | ContentAssetRow[] | null
  sede_id: string | null
  workspace_id: string | null
  visible_entrenadores: boolean
  created_at: string | null
  updated_at: string | null
}

interface ContentAssetRow {
  provider: string
  original_url: string | null
  external_resource_id: string | null
  storage_path: string | null
  size_bytes: number
  mime_type: string | null
}

function getContentAsset(row: DocumentoRow): ContentAssetRow | null {
  return Array.isArray(row.content_assets)
    ? (row.content_assets[0] ?? null)
    : row.content_assets
}

function mapDocumento(
  row: DocumentoRow,
  sedeIds: string[],
  equipoIds: string[],
  entrenadorIds: string[],
): Documento {
  const contentAsset = getContentAsset(row)
  const isStorageAsset = contentAsset?.provider === "supabase_storage"
  const isExternalAsset = contentAsset != null && !isStorageAsset
  return {
    id: row.id,
    titulo: row.titulo,
    categoriaDoc: row.categoria_doc,
    driveFileId:
      contentAsset?.provider === "google_drive"
        ? contentAsset.external_resource_id
        : row.drive_file_id,
    storagePath: isStorageAsset ? contentAsset.storage_path : row.storage_path,
    fileName: row.file_name,
    mimeType: isStorageAsset ? contentAsset.mime_type : row.mime_type,
    sizeBytes: isStorageAsset ? contentAsset.size_bytes : row.size_bytes,
    extension: row.extension,
    sourceType: (isExternalAsset || row.source_type === "link"
      ? "link"
      : "file") as DocumentoSourceType,
    externalUrl: isExternalAsset ? contentAsset.original_url : row.external_url,
    sedeId: row.sede_id,
    sedeIds,
    equipoIds,
    workspaceId: row.workspace_id,
    visibleEntrenadores: row.visible_entrenadores ?? false,
    entrenadorIds,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  }
}

const SELECT_COLS =
  "id,titulo,categoria_doc,drive_file_id,storage_path,file_name,mime_type,size_bytes,extension,external_url,source_type,content_asset_id,sede_id,workspace_id,visible_entrenadores,created_at,updated_at,content_assets(provider,original_url,external_resource_id,storage_path,size_bytes,mime_type)"

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>

/** Carga los pivotes (sedes, equipos, entrenadores) para un conjunto de documentos. */
async function fetchPivots(supabase: SupabaseClient, documentoIds: string[]) {
  const sedeMap = new Map<string, string[]>()
  const equipoMap = new Map<string, string[]>()
  const entrenadorMap = new Map<string, string[]>()
  if (documentoIds.length === 0) return { sedeMap, equipoMap, entrenadorMap }

  const [{ data: sedes }, { data: equipos }, { data: entrenadores }] =
    await Promise.all([
      supabase
        .from("documento_sedes")
        .select("documento_id,sede_id")
        .in("documento_id", documentoIds),
      supabase
        .from("documento_equipos")
        .select("documento_id,equipo_id")
        .in("documento_id", documentoIds),
      supabase
        .from("documento_entrenadores")
        .select("documento_id,entrenador_id")
        .in("documento_id", documentoIds),
    ])

  for (const r of sedes ?? []) {
    const list = sedeMap.get(r.documento_id) ?? []
    list.push(r.sede_id)
    sedeMap.set(r.documento_id, list)
  }
  for (const r of equipos ?? []) {
    const list = equipoMap.get(r.documento_id) ?? []
    list.push(r.equipo_id)
    equipoMap.set(r.documento_id, list)
  }
  for (const r of entrenadores ?? []) {
    const list = entrenadorMap.get(r.documento_id) ?? []
    list.push(r.entrenador_id)
    entrenadorMap.set(r.documento_id, list)
  }
  return { sedeMap, equipoMap, entrenadorMap }
}

/** Sincroniza los pivotes de un documento (reemplaza el conjunto completo). */
async function syncPivots(
  supabase: SupabaseClient,
  documentoId: string,
  sedeIds: string[],
  equipoIds: string[],
  entrenadorIds: string[],
) {
  await Promise.all([
    supabase.from("documento_sedes").delete().eq("documento_id", documentoId),
    supabase.from("documento_equipos").delete().eq("documento_id", documentoId),
    supabase
      .from("documento_entrenadores")
      .delete()
      .eq("documento_id", documentoId),
  ])

  const inserts: PromiseLike<unknown>[] = []
  if (sedeIds.length) {
    inserts.push(
      supabase
        .from("documento_sedes")
        .insert(
          sedeIds.map((sede_id) => ({ documento_id: documentoId, sede_id })),
        ),
    )
  }
  if (equipoIds.length) {
    inserts.push(
      supabase
        .from("documento_equipos")
        .insert(
          equipoIds.map((equipo_id) => ({
            documento_id: documentoId,
            equipo_id,
          })),
        ),
    )
  }
  if (entrenadorIds.length) {
    inserts.push(
      supabase
        .from("documento_entrenadores")
        .insert(
          entrenadorIds.map((entrenador_id) => ({
            documento_id: documentoId,
            entrenador_id,
          })),
        ),
    )
  }
  if (inserts.length) await Promise.all(inserts)
}

/**
 * Documentos asociados a cualquiera de las sedes indicadas (vía pivote documento_sedes),
 * más los documentos legacy cuyo sede_id directo coincida,
 * más los documentos globales del workspace.
 *
 * Si se pasa `userId` de un entrenador, filtra solo los documentos que ese
 * entrenador puede ver (visible_entrenadores=true o asignado específicamente).
 */
export async function fetchDocumentosBySedeIds(
  sedeIds: string[],
  workspaceId?: string | null,
  entrenadorUserId?: string | null,
) {
  if (!sedeIds.length) return { data: [], error: null }
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data: pivotRows, error: pivotError } = await supabase
    .from("documento_sedes")
    .select("documento_id")
    .in("sede_id", sedeIds)
  if (pivotError) return { data: null, error: pivotError }

  const ids = new Set((pivotRows ?? []).map((r) => r.documento_id))

  const { data: legacy } = await supabase
    .from("documentos")
    .select("id")
    .in("sede_id", sedeIds)
  for (const r of legacy ?? []) ids.add(r.id)

  if (ids.size === 0 && !workspaceId) return { data: [], error: null }

  let query = supabase
    .from("documentos")
    .select(SELECT_COLS)
    .order("updated_at", { ascending: false })

  if (ids.size > 0) {
    query = query.in("id", [...ids])
  }

  if (workspaceId) {
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
  }

  const { data, error } = await query
  if (error) return { data: null, error }

  const { sedeMap, equipoMap, entrenadorMap } = await fetchPivots(
    supabase,
    (data ?? []).map((d) => d.id),
  )

  let rows = (data ?? []).map((d) =>
    mapDocumento(
      d,
      sedeMap.get(d.id) ?? [],
      equipoMap.get(d.id) ?? [],
      entrenadorMap.get(d.id) ?? [],
    ),
  )

  // Si es entrenador, filtra solo los documentos que puede ver.
  if (entrenadorUserId) {
    rows = rows.filter(
      (doc) =>
        doc.visibleEntrenadores || doc.entrenadorIds.includes(entrenadorUserId),
    )
  }

  return { data: rows, error: null }
}

/**
 * Documentos disponibles para vincular a ejercicios: los de las sedes indicadas
 * más los globales del workspace (workspace_id igual o null).
 */
export async function fetchDocumentosDisponibles(
  sedeIds: string[],
  workspaceId?: string | null,
) {
  if (!sedeIds.length) return { data: [], error: null }
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data: pivotRows, error: pivotError } = await supabase
    .from("documento_sedes")
    .select("documento_id")
    .in("sede_id", sedeIds)
  if (pivotError) return { data: null, error: pivotError }

  const ids = new Set((pivotRows ?? []).map((r) => r.documento_id))

  const { data: legacy } = await supabase
    .from("documentos")
    .select("id")
    .in("sede_id", sedeIds)
  for (const r of legacy ?? []) ids.add(r.id)

  if (ids.size === 0 && !workspaceId) return { data: [], error: null }

  let query = supabase
    .from("documentos")
    .select(SELECT_COLS)
    .order("updated_at", { ascending: false })

  if (ids.size > 0) {
    query = query.in("id", [...ids])
  }

  if (workspaceId) {
    query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
  }

  const { data, error } = await query
  if (error) return { data: null, error }

  const { sedeMap, equipoMap, entrenadorMap } = await fetchPivots(
    supabase,
    (data ?? []).map((d) => d.id),
  )

  const rows = (data ?? []).map((d) =>
    mapDocumento(
      d,
      sedeMap.get(d.id) ?? [],
      equipoMap.get(d.id) ?? [],
      entrenadorMap.get(d.id) ?? [],
    ),
  )
  return { data: rows, error: null }
}

/**
 * Lectura pública de un documento por id, acotada al workspace activo
 * (incluye los globales, `workspace_id IS NULL`, igual que las lecturas por sede).
 */
export async function getDocumentoById(id: string, workspaceId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { data, error } = await supabase
    .from("documentos")
    .select(SELECT_COLS)
    .eq("id", id)
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .maybeSingle()

  if (error || !data) return { data: null, error }

  const { sedeMap, equipoMap, entrenadorMap } = await fetchPivots(supabase, [data.id])

  return {
    data: mapDocumento(
      data,
      sedeMap.get(data.id) ?? [],
      equipoMap.get(data.id) ?? [],
      entrenadorMap.get(data.id) ?? [],
    ),
    error: null,
  }
}

/**
 * Crea el registro editorial y sube el archivo con reserva de cuota atómica.
 */
export async function uploadDocumento(input: {
  file: File
  titulo: string
  categoriaDoc: string | null
  sedeId: string | null
  sedeIds: string[]
  equipoIds: string[]
  workspaceId: string | null
  visibleEntrenadores: boolean
  entrenadorIds: string[]
}) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const { file } = input
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : null

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      sede_id: input.sedeId ?? input.sedeIds[0] ?? null,
      workspace_id: input.workspaceId,
      storage_path: null,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      extension,
      permisos_roles: {},
      visible_entrenadores: input.visibleEntrenadores,
    })
    .select(SELECT_COLS)
    .single()

  if (error || !data) {
    return {
      data: null,
      error: error ?? new Error("No se pudo crear el documento"),
    }
  }

  await syncPivots(
    supabase,
    data.id,
    input.sedeIds,
    input.equipoIds,
    input.entrenadorIds,
  )

  const storageResult = await uploadDocumentFile({
    documentoId: data.id,
    file,
  })
  if (storageResult.error) return { data: null, error: storageResult.error }

  const { data: savedDocument, error: savedDocumentError } = await supabase
    .from("documentos")
    .select(SELECT_COLS)
    .eq("id", data.id)
    .single()
  if (savedDocumentError || !savedDocument) {
    return {
      data: null,
      error: savedDocumentError ?? new Error("No se pudo recuperar el documento"),
    }
  }

  return {
    data: mapDocumento(
      savedDocument,
      input.sedeIds,
      input.equipoIds,
      input.entrenadorIds,
    ),
    error: null,
  }
}

/**
 * Crea un documento de tipo enlace (URL externa: YouTube, Vimeo, web…) sin
 * archivo en Storage, y sus asociaciones con sedes y equipos.
 */
export async function createDocumentoLink(input: DocumentoLinkCreateInput) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const platform = detectPlatform(input.externalUrl)

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      sede_id: input.sedeId ?? input.sedeIds[0] ?? null,
      workspace_id: input.workspaceId,
      storage_path: null,
      file_name: null,
      mime_type: null,
      size_bytes: null,
      extension: platform,
      external_url: input.externalUrl,
      source_type: "link",
      permisos_roles: {},
      visible_entrenadores: input.visibleEntrenadores,
    })
    .select(SELECT_COLS)
    .single()

  if (error || !data) {
    return {
      data: null,
      error: error ?? new Error("No se pudo crear el enlace"),
    }
  }

  await syncPivots(
    supabase,
    data.id,
    input.sedeIds,
    input.equipoIds,
    input.entrenadorIds,
  )

  return {
    data: mapDocumento(
      data,
      input.sedeIds,
      input.equipoIds,
      input.entrenadorIds,
    ),
    error: null,
  }
}


export async function updateDocumento(id: string, input: DocumentoUpdateInput) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }

  const patch: Record<string, unknown> = {
    titulo: input.titulo,
    categoria_doc: input.categoriaDoc,
    sede_id: input.sedeId ?? input.sedeIds[0] ?? null,
    visible_entrenadores: input.visibleEntrenadores,
  }
  if (input.workspaceId !== undefined) {
    patch.workspace_id = input.workspaceId
  }
  // Solo se actualiza la URL (y su plataforma) si se proporciona explícitamente.
  if (input.externalUrl != null) {
    patch.external_url = input.externalUrl
    patch.extension = detectPlatform(input.externalUrl)
  }

  const { data, error } = await supabase
    .from("documentos")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLS)
    .single()

  if (error || !data) return { data: null, error }

  await syncPivots(
    supabase,
    id,
    input.sedeIds,
    input.equipoIds,
    input.entrenadorIds,
  )

  return {
    data: mapDocumento(
      data,
      input.sedeIds,
      input.equipoIds,
      input.entrenadorIds,
    ),
    error: null,
  }
}

export async function deleteDocumento(id: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return { data: false, error: MISSING_CLIENT }

  const { data: row } = await supabase
    .from("documentos")
    .select("content_asset_id,storage_path,content_assets(provider,storage_path)")
    .eq("id", id)
    .single()

  const contentAsset = Array.isArray(row?.content_assets)
    ? (row.content_assets[0] ?? null)
    : row?.content_assets
  if (
    row?.content_asset_id &&
    contentAsset?.provider === "supabase_storage" &&
    contentAsset.storage_path
  ) {
    const storageResult = await deleteDocumentStorageAsset({
      assetId: row.content_asset_id,
      storagePath: contentAsset.storage_path,
    })
    if (storageResult.error) return { data: false, error: storageResult.error }
  } else if (row?.storage_path) {
    const { error: removeError } = await supabase.storage
      .from(DOCUMENTOS_BUCKET)
      .remove([row.storage_path])
    if (removeError) return { data: false, error: removeError }
  }

  // Los pivotes se borran en cascada (ON DELETE CASCADE).
  const { error } = await supabase.from("documentos").delete().eq("id", id)
  if (error) return { data: false, error }

  return { data: true, error: null }
}

/** Genera una signed URL temporal para ver/descargar el archivo (privado). */
export async function getDocumentoUrl(
  storagePath: string,
  expiresInSeconds = 600,
) {
  const safeExpiresInSeconds = Math.min(900, Math.max(300, expiresInSeconds))
  if (safeExpiresInSeconds === 600) return getDocumentStorageOpenUrl(storagePath)
  const supabase = getSupabaseClient()
  if (!supabase) return { data: null, error: MISSING_CLIENT }
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(storagePath, safeExpiresInSeconds)
  return { data: data?.signedUrl ?? null, error }
}

/**
 * Devuelve la URL para abrir un documento, sea cual sea su origen:
 * - link  → su URL externa directamente.
 * - file  → una signed URL temporal del archivo en Storage.
 */
export async function getDocumentoOpenUrl(
  doc: Pick<Documento, "sourceType" | "externalUrl" | "storagePath">,
) {
  if (doc.sourceType === "link") {
    if (!doc.externalUrl)
      return { data: null, error: new Error("El enlace no tiene URL.") }
    return { data: doc.externalUrl, error: null as Error | null }
  }
  if (!doc.storagePath) {
    return {
      data: null,
      error: new Error("Este documento no tiene archivo asociado."),
    }
  }
  return getDocumentoUrl(doc.storagePath)
}
