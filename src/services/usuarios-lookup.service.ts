import { getSupabaseClient } from "@/services/supabase";

export interface UsuarioLookupItem {
  id: string;
  email: string;
  nombre: string | null;
}

export async function fetchUsuariosLookup() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,email,nombre")
    .order("email", { ascending: true });

  return { data: data ?? null, error };
}

