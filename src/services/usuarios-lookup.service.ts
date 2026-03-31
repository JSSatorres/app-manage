import { getSupabaseClient } from "@/services/supabase";

export interface UsuarioLookupItem {
  id: string;
  email: string;
  nombre: string | null;
}

export async function fetchUsuariosLookup() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,email,nombre")
    .order("email", { ascending: true });

  return { data: data ?? null, error };
}

