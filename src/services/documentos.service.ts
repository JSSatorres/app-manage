import { getSupabaseClient } from "@/services/supabase";
import type { Documento, DocumentoUpdateInput } from "@/types/documentos";

export const DOCUMENTOS_BUCKET = "documentos";

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

interface DocumentoRow {
  id: string;
  titulo: string;
  categoria_doc: string | null;
  drive_file_id: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  extension: string | null;
  sede_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapDocumento(row: DocumentoRow, sedeIds: string[], equipoIds: string[]): Documento {
  return {
    id: row.id,
    titulo: row.titulo,
    categoriaDoc: row.categoria_doc,
    driveFileId: row.drive_file_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    extension: row.extension,
    sedeId: row.sede_id,
    sedeIds,
    equipoIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id,titulo,categoria_doc,drive_file_id,storage_path,file_name,mime_type,size_bytes,extension,sede_id,created_at,updated_at";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>;

/** Carga los pivotes (sedes y equipos) para un conjunto de documentos. */
async function fetchPivots(supabase: SupabaseClient, documentoIds: string[]) {
  const sedeMap = new Map<string, string[]>();
  const equipoMap = new Map<string, string[]>();
  if (documentoIds.length === 0) return { sedeMap, equipoMap };

  const [{ data: sedes }, { data: equipos }] = await Promise.all([
    supabase.from("documento_sedes").select("documento_id,sede_id").in("documento_id", documentoIds),
    supabase
      .from("documento_equipos")
      .select("documento_id,equipo_id")
      .in("documento_id", documentoIds),
  ]);

  for (const r of sedes ?? []) {
    const list = sedeMap.get(r.documento_id) ?? [];
    list.push(r.sede_id);
    sedeMap.set(r.documento_id, list);
  }
  for (const r of equipos ?? []) {
    const list = equipoMap.get(r.documento_id) ?? [];
    list.push(r.equipo_id);
    equipoMap.set(r.documento_id, list);
  }
  return { sedeMap, equipoMap };
}

/** Sincroniza los pivotes de un documento (reemplaza el conjunto completo). */
async function syncPivots(
  supabase: SupabaseClient,
  documentoId: string,
  sedeIds: string[],
  equipoIds: string[],
) {
  await Promise.all([
    supabase.from("documento_sedes").delete().eq("documento_id", documentoId),
    supabase.from("documento_equipos").delete().eq("documento_id", documentoId),
  ]);

  const inserts: Promise<unknown>[] = [];
  if (sedeIds.length) {
    inserts.push(
      supabase
        .from("documento_sedes")
        .insert(sedeIds.map((sede_id) => ({ documento_id: documentoId, sede_id }))),
    );
  }
  if (equipoIds.length) {
    inserts.push(
      supabase
        .from("documento_equipos")
        .insert(equipoIds.map((equipo_id) => ({ documento_id: documentoId, equipo_id }))),
    );
  }
  if (inserts.length) await Promise.all(inserts);
}

/**
 * Documentos asociados a cualquiera de las sedes indicadas (vía pivote documento_sedes),
 * más los documentos legacy cuyo sede_id directo coincida.
 */
export async function fetchDocumentosBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  // IDs de documentos asociados a estas sedes vía pivote.
  const { data: pivotRows, error: pivotError } = await supabase
    .from("documento_sedes")
    .select("documento_id")
    .in("sede_id", sedeIds);
  if (pivotError) return { data: null, error: pivotError };

  const ids = new Set((pivotRows ?? []).map((r) => r.documento_id));

  // Documentos legacy (sede_id directo) por si quedan sin pivote.
  const { data: legacy } = await supabase
    .from("documentos")
    .select("id")
    .in("sede_id", sedeIds);
  for (const r of legacy ?? []) ids.add(r.id);

  if (ids.size === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("documentos")
    .select(SELECT_COLS)
    .in("id", [...ids])
    .order("updated_at", { ascending: false });
  if (error) return { data: null, error };

  const { sedeMap, equipoMap } = await fetchPivots(
    supabase,
    (data ?? []).map((d) => d.id),
  );

  const rows = (data ?? []).map((d) =>
    mapDocumento(d, sedeMap.get(d.id) ?? [], equipoMap.get(d.id) ?? []),
  );
  return { data: rows, error: null };
}

/**
 * Sube un archivo al bucket de Storage, crea el registro de documento y sus
 * asociaciones con sedes y equipos. Acepta cualquier formato.
 */
export async function uploadDocumento(input: {
  file: File;
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { file } = input;
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : null;
  const folder = input.sedeId ?? input.sedeIds[0] ?? "global";
  const uniqueName = `${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  const storagePath = `${folder}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) return { data: null, error: uploadError };

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      sede_id: input.sedeId ?? input.sedeIds[0] ?? null,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      extension,
      permisos_roles: {},
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) {
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([storagePath]);
    return { data: null, error: error ?? new Error("No se pudo crear el documento") };
  }

  await syncPivots(supabase, data.id, input.sedeIds, input.equipoIds);

  return { data: mapDocumento(data, input.sedeIds, input.equipoIds), error: null };
}

export async function updateDocumento(id: string, input: DocumentoUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase
    .from("documentos")
    .update({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      sede_id: input.sedeId ?? input.sedeIds[0] ?? null,
    })
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error || !data) return { data: null, error };

  await syncPivots(supabase, id, input.sedeIds, input.equipoIds);

  return { data: mapDocumento(data, input.sedeIds, input.equipoIds), error: null };
}

export async function deleteDocumento(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: MISSING_CLIENT };

  const { data: row } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", id)
    .single();

  // Los pivotes se borran en cascada (ON DELETE CASCADE).
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) return { data: false, error };

  if (row?.storage_path) {
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([row.storage_path]);
  }

  return { data: true, error: null };
}

/** Genera una signed URL temporal para ver/descargar el archivo (privado). */
export async function getDocumentoUrl(storagePath: string, expiresInSeconds = 3600) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };
  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  return { data: data?.signedUrl ?? null, error };
}
