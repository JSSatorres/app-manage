import { getSupabaseClient } from "@/services/supabase";

export interface JugadorLookupItem {
  id: string;
  nombre: string;
  apellidos: string | null;
  dorsal: number | null;
}

export async function fetchJugadoresLookupBySedeId(sedeId: string) {
  if (!sedeId) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing Supabase env") };
  }

  const { data: links, error: linkErr } = await supabase
    .from("jugador_sedes")
    .select("jugador_id")
    .eq("sede_id", sedeId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.jugador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("jugadores")
    .select("id,nombre,apellidos,dorsal")
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}

export async function fetchJugadoresLookupByWorkspace(workspaceId: string) {
  if (!workspaceId) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing Supabase env") };
  }

  const { data, error } = await supabase
    .from("jugadores")
    .select("id,nombre,apellidos,dorsal")
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
