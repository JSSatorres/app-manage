import { getSupabaseClient } from "@/services/supabase";

export interface EquipoLookupItem {
  id: string;
  nombre: string;
}

export async function fetchEquiposLookupBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("equipos")
    .select("id,nombre")
    .in("sede_id", sedeIds)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
