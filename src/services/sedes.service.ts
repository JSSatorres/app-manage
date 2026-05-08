import { getSupabaseClient } from "@/services/supabase";
import type { Sede, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";
import type { Json } from "@/types/database.types";

function mapSede(row: {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracion_visual: Json;
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
}): Sede {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    configuracionVisual: row.configuracion_visual,
    responsableId: row.responsable_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSedes() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .select("id,nombre,direccion,configuracion_visual,responsable_id,created_at,updated_at")
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapSede) : null, error };
}

export async function createSede(input: SedeCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .insert({
      nombre: input.nombre,
      direccion: input.direccion,
      configuracion_visual: {},
      responsable_id: null,
    })
    .select("id,nombre,direccion,configuracion_visual,responsable_id,created_at,updated_at")
    .single();

  return { data: data ? mapSede(data) : null, error };
}

export async function updateSede(id: string, input: SedeUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .update({ nombre: input.nombre, direccion: input.direccion })
    .eq("id", id)
    .select("id,nombre,direccion,configuracion_visual,responsable_id,created_at,updated_at")
    .single();

  return { data: data ? mapSede(data) : null, error };
}

export async function deleteSede(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  const { error } = await supabase.from("sedes").delete().eq("id", id);
  return { data: true, error };
}
