import { getSupabaseClient } from "@/services/supabase";

export interface EquipoLookupItem {
  id: string;
  nombre: string;
  entrenadorIds: string[];
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
    .select("id,nombre,entrenador_equipos(entrenador_id)")
    .in("sede_id", sedeIds)
    .order("nombre", { ascending: true });

  if (error || !data) return { data: null, error };

  const mapped: EquipoLookupItem[] = data.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    entrenadorIds: (e.entrenador_equipos as { entrenador_id: string }[]).map((r) => r.entrenador_id),
  }));

  return { data: mapped, error: null };
}
