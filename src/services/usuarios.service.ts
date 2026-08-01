import { getSupabaseClient } from "@/services/supabase";
import type { Usuario, UsuarioUpdateInput } from "@/types/usuarios";
import type { Rol } from "@/lib/permisos";

const USUARIO_SELECT_FIELDS = "id,email,nombre,rol,telefono,foto_perfil,created_at,updated_at";

/**
 * `usuarios` no tiene `workspace_id` propio ni el rol real (ese vive en
 * `workspace_members.role`). `workspaceRol` se resuelve aparte y se pasa
 * explícitamente; si no se conoce (p. ej. quien llama no lo consultó) cae al
 * campo legacy `rol` para no romper la forma del dominio.
 */
function mapUsuario(
  row: {
    id: string;
    email: string;
    nombre: string | null;
    rol: string;
    telefono: string | null;
    foto_perfil: string | null;
    created_at: string | null;
    updated_at: string | null;
  },
  workspaceRol: string = row.rol,
): Usuario {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    rol: row.rol,
    workspaceRol,
    telefono: row.telefono,
    fotoPerfil: row.foto_perfil,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/**
 * Lectura pública de un usuario por id, acotada al workspace activo.
 * `usuarios` no tiene `workspace_id` propio: la membresía se verifica vía
 * `workspace_members` (mismo patrón que `usuarios-lookup.service.ts`).
 */
export async function getUsuarioById(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", id)
    .maybeSingle();
  if (membershipError) return { data: null, error: membershipError };
  if (!membership) return { data: null, error: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select(USUARIO_SELECT_FIELDS)
    .eq("id", id)
    .maybeSingle();

  return { data: data ? mapUsuario(data) : null, error };
}

/**
 * Lista los usuarios del workspace activo. Como `usuarios` no tiene
 * `workspace_id` propio, resolvemos primero los miembros del workspace
 * (con su rol real) y acotamos `usuarios` a esos ids — mismo patrón que
 * `usuarios-lookup.service.ts` (defensa en profundidad, no confiar solo en RLS).
 */
export async function fetchUsuarios(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id,role")
    .eq("workspace_id", workspaceId);
  if (membersError) return { data: null, error: membersError };

  const roleByUserId = new Map<string, string>(
    (members ?? []).map((m) => [m.user_id as string, m.role as string]),
  );
  const userIds = Array.from(roleByUserId.keys());
  if (userIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select(USUARIO_SELECT_FIELDS)
    .in("id", userIds)
    .order("email", { ascending: true });
  if (error) return { data: null, error };

  return {
    data: (data ?? []).map((row) => mapUsuario(row, roleByUserId.get(row.id))),
    error: null,
  };
}

/**
 * Actualiza los campos de perfil editables de un usuario (nombre, teléfono).
 * Verifica primero que el usuario sea miembro del workspace activo: `usuarios`
 * no tiene `workspace_id`, así que sin este chequeo cualquier `id` válido
 * sería editable desde el cliente si RLS fallara (defensa en profundidad).
 */
export async function updateUsuario(id: string, workspaceId: string, input: UsuarioUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("user_id,role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", id)
    .maybeSingle();
  if (membershipError) return { data: null, error: membershipError };
  if (!membership) {
    return { data: null, error: new Error("El usuario no pertenece al workspace activo") };
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({ nombre: input.nombre, telefono: input.telefono })
    .eq("id", id)
    .select(USUARIO_SELECT_FIELDS)
    .maybeSingle();

  return { data: data ? mapUsuario(data, membership.role as string) : null, error };
}

/**
 * Cambia el rol de un usuario en el workspace activo (`workspace_members.role`,
 * el rol canónico que consultan `useWorkspaceContext`/`can()` — no el campo
 * legacy `usuarios.rol`). Acotado por `workspace_id` + `user_id`: el update no
 * puede tocar la membresía de otro workspace.
 */
export async function updateUsuarioRol(workspaceId: string, userId: string, rol: Rol) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role: rol })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("workspace_id,user_id,role")
    .maybeSingle();

  return {
    data: data
      ? { workspaceId: data.workspace_id as string, userId: data.user_id as string, rol: data.role as string }
      : null,
    error,
  };
}

/**
 * "Elimina" un usuario del workspace activo: borra su fila en
 * `workspace_members` (pierde acceso a este workspace), acotado por
 * `workspace_id` + `user_id`. NO borra la fila `usuarios` (puede pertenecer a
 * otros workspaces) ni la cuenta de Supabase Auth — eso requiere la admin API
 * con `service_role`, que no puede vivir en el cliente.
 */
export async function deleteUsuario(workspaceId: string, userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: false,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  return { data: !error, error };
}
