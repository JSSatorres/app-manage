import { getSupabaseClient } from "@/services/supabase";

export interface EntrenadorLookupItem {
  id: string;
  nombre: string;
  apellidos: string | null;
}

export async function fetchEntrenadoresLookupBySedeId(sedeId: string) {
  if (!sedeId) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing Supabase env") };
  }

  const { data: links, error: linkErr } = await supabase
    .from("entrenador_sedes")
    .select("entrenador_id")
    .eq("sede_id", sedeId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.entrenador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("entrenadores")
    .select("id,nombre,apellidos")
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}

export async function fetchEntrenadoresLookupByWorkspace(workspaceId: string) {
  if (!workspaceId) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing Supabase env") };
  }

  const { data, error } = await supabase
    .from("entrenadores")
    .select("id,nombre,apellidos")
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
