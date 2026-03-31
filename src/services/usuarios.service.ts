import { supabase } from "@/services/supabase";
import type { Usuario } from "@/types/usuarios";
import type { Rol } from "@/lib/constants";

function mapUsuario(row: {
  id: string;
  email: string;
  nombre: string | null;
  rol: string;
  sede_id: string | null;
  telefono: string | null;
  foto_perfil: string | null;
  created_at: string;
  updated_at: string;
}): Usuario {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    rol: row.rol as Rol,
    sedeId: row.sede_id,
    telefono: row.telefono,
    fotoPerfil: row.foto_perfil,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,email,nombre,rol,sede_id,telefono,foto_perfil,created_at,updated_at")
    .order("email", { ascending: true });

  return { data: data ? data.map(mapUsuario) : null, error };
}

