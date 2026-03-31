import { getSupabaseClient } from "@/services/supabase";
import type { Ejercicio, EjercicioCreateInput, EjercicioUpdateInput } from "@/types/ejercicios";

function mapEjercicio(row: {
  id: string;
  titulo: string;
  objetivo_principal: string | null;
  numero_jugadores_min: number | null;
  sede_propietaria_id: string | null;
  es_global: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}): Ejercicio {
  return {
    id: row.id,
    titulo: row.titulo,
    objetivoPrincipal: row.objetivo_principal,
    numeroJugadoresMin: row.numero_jugadores_min,
    sedePropietariaId: row.sede_propietaria_id,
    esGlobal: row.es_global,
    workspaceId: row.workspace_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchEjercicios(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .select(
      "id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,workspace_id,created_at,updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  return { data: data ? data.map(mapEjercicio) : null, error };
}

export async function createEjercicio(input: EjercicioCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .insert({
      titulo: input.titulo,
      objetivo_principal: input.objetivoPrincipal,
      numero_jugadores_min: input.numeroJugadoresMin,
      sede_propietaria_id: input.sedePropietariaId,
      es_global: input.esGlobal,
      workspace_id: input.workspaceId,
    })
    .select(
      "id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,workspace_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapEjercicio(data) : null, error };
}

export async function updateEjercicio(id: string, input: EjercicioUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .update({
      titulo: input.titulo,
      objetivo_principal: input.objetivoPrincipal,
      numero_jugadores_min: input.numeroJugadoresMin,
      sede_propietaria_id: input.sedePropietariaId,
      es_global: input.esGlobal,
      workspace_id: input.workspaceId,
    })
    .eq("id", id)
    .select(
      "id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,workspace_id,created_at,updated_at",
    )
    .single();

  return { data: data ? mapEjercicio(data) : null, error };
}

export async function deleteEjercicio(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { error } = await supabase.from("ejercicios").delete().eq("id", id);
  return { data: true, error };
}
