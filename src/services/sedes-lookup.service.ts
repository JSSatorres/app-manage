import { getSupabaseClient } from "@/services/supabase";

export interface SedeLookupItem {
  id: string;
  nombre: string;
}

export async function fetchSedesLookup(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("sedes")
    .select("id,nombre")
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ?? null, error };
}
