import { getSupabaseClient } from "@/services/supabase";

export interface UsuarioLookupItem {
  id: string;
  email: string;
  nombre: string | null;
}

export async function fetchUsuariosLookup(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  // Los usuarios no tienen workspace_id propio: la membresía al workspace
  // vive en workspace_members. Resolvemos primero los user_id del workspace
  // activo y luego acotamos la consulta a usuarios con ellos.
  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);
  if (membersError) return { data: null, error: membersError };

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select("id,email,nombre")
    .in("id", userIds)
    .order("email", { ascending: true });

  return { data: data ?? null, error };
}

