import { getSupabaseClient } from "@/services/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  CloneSedeInput,
  CloneSedeResponse,
  CloneableSedeContent,
  Sede,
  SedeCreateInput,
  SedeUpdateInput,
} from "@/types/sedes";
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

export async function fetchSedes(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .select(SELECT_FIELDS)
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapSede) : null, error };
}

export async function getSedeById(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("sedes")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return { data: data ? mapSede(data) : null, error };
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

function formatPersonName(nombre: string, apellidos: string | null) {
  return apellidos ? `${nombre} ${apellidos}` : nombre;
}

export async function fetchCloneableSedeContent(workspaceId: string, sourceSedeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }

  const { data: sourceSede, error: sourceError } = await supabase
    .from("sedes")
    .select("id")
    .eq("id", sourceSedeId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (sourceError || !sourceSede) {
    return { data: null, error: sourceError };
  }

  const { data: equipos, error: equiposError } = await supabase
    .from("equipos")
    .select("id,nombre,categoria")
    .eq("sede_id", sourceSedeId)
    .eq("workspace_id", workspaceId);

  if (equiposError) {
    return { data: null, error: equiposError };
  }

  const [entrenadorSedesResult, jugadorSedesResult, parametrosResult, documentoSedesResult] = await Promise.all([
    supabase.from("entrenador_sedes").select("entrenador_id").eq("sede_id", sourceSedeId),
    supabase.from("jugador_sedes").select("jugador_id").eq("sede_id", sourceSedeId),
    supabase
      .from("parametros_sistema")
      .select("id,nombre,categoria")
      .eq("sede_id", sourceSedeId)
      .eq("workspace_id", workspaceId),
    supabase.from("documento_sedes").select("documento_id").eq("sede_id", sourceSedeId),
  ]);

  const relationError = [
    entrenadorSedesResult.error,
    jugadorSedesResult.error,
    parametrosResult.error,
    documentoSedesResult.error,
  ].find(Boolean);
  if (relationError) {
    return { data: null, error: relationError };
  }

  const equipoIds = (equipos ?? []).map((equipo) => equipo.id);
  const entrenadorIds = (entrenadorSedesResult.data ?? []).map((relation) => relation.entrenador_id);
  const jugadorIds = (jugadorSedesResult.data ?? []).map((relation) => relation.jugador_id);
  const documentoIds = (documentoSedesResult.data ?? []).map((relation) => relation.documento_id);

  const [
    entrenadoresResult,
    jugadoresResult,
    sesionesResult,
    documentosResult,
    entrenadorEquiposResult,
    jugadorEquiposResult,
  ] = await Promise.all([
    entrenadorIds.length > 0
      ? supabase.from("entrenadores").select("id,nombre,apellidos").eq("workspace_id", workspaceId).in("id", entrenadorIds)
      : Promise.resolve({ data: [], error: null }),
    jugadorIds.length > 0
      ? supabase.from("jugadores").select("id,nombre,apellidos").eq("workspace_id", workspaceId).in("id", jugadorIds)
      : Promise.resolve({ data: [], error: null }),
    equipoIds.length > 0
      ? supabase.from("sesiones").select("id,equipo_id,fecha").in("equipo_id", equipoIds)
      : Promise.resolve({ data: [], error: null }),
    documentoIds.length > 0
      ? supabase.from("documentos").select("id,titulo").eq("workspace_id", workspaceId).in("id", documentoIds)
      : Promise.resolve({ data: [], error: null }),
    equipoIds.length > 0
      ? supabase.from("entrenador_equipos").select("entrenador_id,equipo_id").in("equipo_id", equipoIds)
      : Promise.resolve({ data: [], error: null }),
    equipoIds.length > 0
      ? supabase.from("jugador_equipos").select("jugador_id,equipo_id").in("equipo_id", equipoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const contentError = [
    entrenadoresResult.error,
    jugadoresResult.error,
    sesionesResult.error,
    documentosResult.error,
    entrenadorEquiposResult.error,
    jugadorEquiposResult.error,
  ].find(Boolean);
  if (contentError) {
    return { data: null, error: contentError };
  }

  const sesionIds = (sesionesResult.data ?? []).map((sesion) => sesion.id);
  const sesionEntrenadoresResult = sesionIds.length > 0
    ? await supabase
      .from("sesion_entrenadores")
      .select("sesion_id,entrenador_id")
      .in("sesion_id", sesionIds)
    : { data: [], error: null };

  if (sesionEntrenadoresResult.error) {
    return { data: null, error: sesionEntrenadoresResult.error };
  }

  const trainerIdsBySesionId = new Map<string, string[]>();
  for (const relation of sesionEntrenadoresResult.data ?? []) {
    const trainerIds = trainerIdsBySesionId.get(relation.sesion_id) ?? [];
    trainerIds.push(relation.entrenador_id);
    trainerIdsBySesionId.set(relation.sesion_id, trainerIds);
  }

  const data: CloneableSedeContent = {
    equipos: (equipos ?? []).map((equipo) => ({
      id: equipo.id,
      label: equipo.nombre,
      categoria: equipo.categoria,
    })),
    entrenadores: (entrenadoresResult.data ?? []).map((entrenador) => ({
      id: entrenador.id,
      label: formatPersonName(entrenador.nombre, entrenador.apellidos),
    })),
    jugadores: (jugadoresResult.data ?? []).map((jugador) => ({
      id: jugador.id,
      label: formatPersonName(jugador.nombre, jugador.apellidos),
    })),
    sesiones: (sesionesResult.data ?? []).map((sesion) => ({
      id: sesion.id,
      label: sesion.fecha,
      equipoId: sesion.equipo_id,
      trainerIds: trainerIdsBySesionId.get(sesion.id) ?? [],
    })),
    entrenadorEquipos: (entrenadorEquiposResult.data ?? []).map((relation) => ({
      personId: relation.entrenador_id,
      equipoId: relation.equipo_id,
    })),
    jugadorEquipos: (jugadorEquiposResult.data ?? []).map((relation) => ({
      personId: relation.jugador_id,
      equipoId: relation.equipo_id,
    })),
    parametros: (parametrosResult.data ?? []).map((parametro) => ({
      id: parametro.id,
      label: parametro.nombre,
      categoria: parametro.categoria,
    })),
    documentos: (documentosResult.data ?? []).map((documento) => ({
      id: documento.id,
      label: documento.titulo,
    })),
  };

  return { data, error: null };
}

type CloneSedeRpcResult = {
  data: CloneSedeResponse | null;
  error: PostgrestError | null;
};

export async function cloneSede(input: CloneSedeInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }

  const result = await supabase.rpc("clone_sede", {
    p_workspace_id: input.workspaceId,
    p_source_sede_id: input.sourceSedeId,
    p_nombre: input.nombre,
    p_direccion: input.direccion,
    p_seleccion: input.seleccion,
  } as never);

  return result as unknown as CloneSedeRpcResult;
}
