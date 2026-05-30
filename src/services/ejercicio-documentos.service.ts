import { getSupabaseClient } from "@/services/supabase";

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

export async function fetchDocumentoIdsByEjercicio(ejercicioId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase
    .from("ejercicio_documentos")
    .select("documento_id")
    .eq("ejercicio_id", ejercicioId);

  if (error) return { data: null, error };
  return { data: (data ?? []).map((r) => r.documento_id), error: null };
}

export async function fetchDocumentoIdsByEjercicios(ejercicioIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };
  if (ejercicioIds.length === 0) return { data: new Map<string, string[]>(), error: null };

  const { data, error } = await supabase
    .from("ejercicio_documentos")
    .select("ejercicio_id, documento_id")
    .in("ejercicio_id", ejercicioIds);

  if (error) return { data: null, error };

  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    const list = map.get(r.ejercicio_id) ?? [];
    list.push(r.documento_id);
    map.set(r.ejercicio_id, list);
  }
  return { data: map, error: null };
}

export async function syncEjercicioDocumentos(
  ejercicioId: string,
  documentoIds: string[],
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: MISSING_CLIENT };

  await supabase
    .from("ejercicio_documentos")
    .delete()
    .eq("ejercicio_id", ejercicioId);

  if (documentoIds.length === 0) return { data: true, error: null };

  const { error } = await supabase
    .from("ejercicio_documentos")
    .insert(documentoIds.map((documento_id) => ({ ejercicio_id: ejercicioId, documento_id })));

  return { data: !error, error };
}
