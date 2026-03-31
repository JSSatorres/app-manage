import { supabase } from "@/services/supabase";

export interface EquipoLookupItem {
  id: string;
  nombre: string;
}

export async function fetchEquiposLookupBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const { data, error } = await supabase
    .from("equipos")
    .select("id,nombre")
    .in("sede_id", sedeIds)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
