import { supabase } from "@/services/supabase";
import type { Equipo, EquipoCreateInput, EquipoUpdateInput } from "@/types/equipos";

function mapEquipo(row: {
  id: string;
  nombre: string;
  categoria: string | null;
  sede_id: string;
  entrenador_principal_id: string | null;
  entrenador_adjunto_id: string | null;
  created_at: string;
  updated_at: string;
}): Equipo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    sedeId: row.sede_id,
    entrenadorPrincipalId: row.entrenador_principal_id,
    entrenadorAdjuntoId: row.entrenador_adjunto_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchSedeIdsByWorkspace(workspaceId: string) {
  const { data, error } = await supabase
    .from("sedes")
    .select("id")
    .eq("workspace_id", workspaceId);
  if (error) return { ids: [] as string[], error };
  return { ids: data?.map((r) => r.id) ?? [], error: null };
}

export async function fetchEquiposForWorkspace(workspaceId: string) {
  const { ids, error: e1 } = await fetchSedeIdsByWorkspace(workspaceId);
  if (e1) return { data: null, error: e1 };
  if (!ids.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from("equipos")
    .select(
      "id,nombre,categoria,sede_id,entrenador_principal_id,entrenador_adjunto_id,created_at,updated_at",
    )
    .in("sede_id", ids)
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapEquipo) : null, error };
}

export async function createEquipo(input: EquipoCreateInput) {
  const { data, error } = await supabase
    .from("equipos")
    .insert({
      nombre: input.nombre,
      categoria: input.categoria,
      sede_id: input.sedeId,
      entrenador_principal_id: input.entrenadorPrincipalId,
      entrenador_adjunto_id: input.entrenadorAdjuntoId,
    })
    .select(
      "id,nombre,categoria,sede_id,entrenador_principal_id,entrenador_adjunto_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapEquipo(data) : null, error };
}

export async function updateEquipo(id: string, input: EquipoUpdateInput) {
  const { data, error } = await supabase
    .from("equipos")
    .update({
      nombre: input.nombre,
      categoria: input.categoria,
      sede_id: input.sedeId,
      entrenador_principal_id: input.entrenadorPrincipalId,
      entrenador_adjunto_id: input.entrenadorAdjuntoId,
    })
    .eq("id", id)
    .select(
      "id,nombre,categoria,sede_id,entrenador_principal_id,entrenador_adjunto_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapEquipo(data) : null, error };
}

export async function deleteEquipo(id: string) {
  const { error } = await supabase.from("equipos").delete().eq("id", id);
  return { data: true, error };
}
