import { getSupabaseClient } from "@/services/supabase";
import type { Sede, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";
import type { Json } from "@/types/database.types";

const SELECT_FIELDS = "id,nombre,direccion,configuracion_visual,responsable_id,workspace_id,created_at,updated_at";

function mapSede(row: {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracion_visual: Json;
  responsable_id: string | null;
  workspace_id: string;
  created_at: string | null;
  updated_at: string | null;
}): Sede {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    configuracionVisual: row.configuracion_visual,
    responsableId: row.responsable_id,
    workspaceId: row.workspace_id,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export async function fetchSedes() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .select(SELECT_FIELDS)
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
      workspace_id: input.workspaceId,
    })
    .select(SELECT_FIELDS)
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
    .select(SELECT_FIELDS)
    .single();

  return { data: data ? mapSede(data) : null, error };
}

export async function deleteSede(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  const { error } = await supabase.from("sedes").delete().eq("id", id);
  return { data: true, error };
}
