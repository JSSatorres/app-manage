import { getSupabaseClient } from "@/services/supabase";

export interface SedeLookupItem {
  id: string;
  nombre: string;
}

export async function fetchSedesLookup(workspaceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("id,nombre")
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
