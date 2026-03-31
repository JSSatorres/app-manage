import { supabase } from "@/services/supabase";
import type { Documento, DocumentoCreateInput, DocumentoUpdateInput } from "@/types/documentos";

function mapDocumento(row: {
  id: string;
  titulo: string;
  categoria_doc: string | null;
  drive_file_id: string | null;
  sede_id: string | null;
  created_at: string;
  updated_at: string;
}): Documento {
  return {
    id: row.id,
    titulo: row.titulo,
    categoriaDoc: row.categoria_doc,
    driveFileId: row.drive_file_id,
    sedeId: row.sede_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchDocumentosBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("documentos")
    .select("id,titulo,categoria_doc,drive_file_id,sede_id,created_at,updated_at")
    .in("sede_id", sedeIds)
    .order("updated_at", { ascending: false });

  return { data: data ? data.map(mapDocumento) : null, error };
}

export async function createDocumento(input: DocumentoCreateInput) {
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      drive_file_id: input.driveFileId,
      sede_id: input.sedeId,
      permisos_roles: {},
    })
    .select("id,titulo,categoria_doc,drive_file_id,sede_id,created_at,updated_at")
    .single();

  return { data: data ? mapDocumento(data) : null, error };
}

export async function updateDocumento(id: string, input: DocumentoUpdateInput) {
  const { data, error } = await supabase
    .from("documentos")
    .update({
      titulo: input.titulo,
      categoria_doc: input.categoriaDoc,
      drive_file_id: input.driveFileId,
      sede_id: input.sedeId,
    })
    .eq("id", id)
    .select("id,titulo,categoria_doc,drive_file_id,sede_id,created_at,updated_at")
    .single();

  return { data: data ? mapDocumento(data) : null, error };
}

export async function deleteDocumento(id: string) {
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  return { data: true, error };
}

