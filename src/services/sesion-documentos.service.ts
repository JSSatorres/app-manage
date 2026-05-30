import { getSupabaseClient } from "@/services/supabase";
import type { Documento } from "@/types/documentos";

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

const DOC_COLS =
  "id,titulo,categoria_doc,drive_file_id,storage_path,file_name,mime_type,size_bytes,extension,sede_id,created_at,updated_at";

function mapDocumento(row: {
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
}): Documento {
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
    sedeIds: [],
    equipoIds: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Documentos adjuntos a una sesión. */
export async function fetchDocumentosBySesion(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data: pivot, error: pivotError } = await supabase
    .from("sesion_documentos")
    .select("documento_id, created_at")
    .eq("sesion_id", sesionId)
    .order("created_at", { ascending: true });

  if (pivotError) return { data: null, error: pivotError };

  const ids = (pivot ?? []).map((r) => r.documento_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data: docs, error: docsError } = await supabase
    .from("documentos")
    .select(DOC_COLS)
    .in("id", ids);

  if (docsError) return { data: null, error: docsError };

  // Conserva el orden de adjuntado del pivote.
  const byId = new Map((docs ?? []).map((d) => [d.id, mapDocumento(d)]));
  const rows = ids
    .map((id) => byId.get(id))
    .filter((d): d is Documento => d != null);

  return { data: rows, error: null };
}

export async function attachDocumentoToSesion(sesionId: string, documentoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: MISSING_CLIENT };
  const { error } = await supabase
    .from("sesion_documentos")
    .upsert(
      { sesion_id: sesionId, documento_id: documentoId },
      { onConflict: "sesion_id,documento_id", ignoreDuplicates: true },
    );
  return { data: !error, error };
}

export async function detachDocumentoFromSesion(sesionId: string, documentoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: MISSING_CLIENT };
  const { error } = await supabase
    .from("sesion_documentos")
    .delete()
    .eq("sesion_id", sesionId)
    .eq("documento_id", documentoId);
  return { data: !error, error };
}
