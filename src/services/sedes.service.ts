import { getSupabaseClient } from "@/services/supabase";
import type { Sede, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";
import type { Json } from "@/types/database.types";

function mapSede(row: {
  id: string;
  nombre: string;
  direccion: string | null;
  configuracion_visual: Json;
  responsable_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}): Sede {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    configuracionVisual: row.configuracion_visual,
    responsableId: row.responsable_id,
    workspaceId: row.workspace_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSedes(workspaceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .select(
      "id,nombre,direccion,configuracion_visual,responsable_id,workspace_id,created_at,updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapSede) : null, error };
}

export async function createSede(input: SedeCreateInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .insert({
      nombre: input.nombre,
      direccion: input.direccion,
      configuracion_visual: {},
      responsable_id: null,
      workspace_id: input.workspaceId,
    })
    .select(
      "id,nombre,direccion,configuracion_visual,responsable_id,workspace_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapSede(data) : null, error };
}

export async function updateSede(id: string, input: SedeUpdateInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .update({
      nombre: input.nombre,
      direccion: input.direccion,
    })
    .eq("id", id)
    .select(
      "id,nombre,direccion,configuracion_visual,responsable_id,workspace_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapSede(data) : null, error };
}

export async function deleteSede(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("sedes").delete().eq("id", id);
  return { data: true, error };
}

