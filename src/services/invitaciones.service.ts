import { getSupabaseClient } from "@/services/supabase";

export type RolInvitacion = "AdminSede" | "Entrenador" | "Jugador";

export async function crearInvitacion(
  sedeId: string,
  email: string,
  rol: RolInvitacion,
): Promise<{ token: string | null; error: unknown }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { token: null, error: new Error("Faltan variables de entorno de Supabase") };
  }
  const { data, error } = await supabase.rpc("create_sede_invitation", {
    p_sede_id: sedeId,
    p_email: email.trim().toLowerCase(),
    p_rol: rol,
  });
  return { token: data ?? null, error };
}
