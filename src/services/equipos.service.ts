import { getSupabaseClient } from "@/services/supabase";
import type { Equipo, EquipoCreateInput, EquipoUpdateInput } from "@/types/equipos";

interface EquipoRow {
  id: string;
  nombre: string;
  categoria: string | null;
  sede_id: string;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  entrenador_equipos?: { entrenador_id: string }[];
  jugador_equipos?: { jugador_id: string }[];
}

function mapEquipo(row: EquipoRow): Equipo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    sedeId: row.sede_id,
    workspaceId: row.workspace_id,
    entrenadorIds: (row.entrenador_equipos ?? []).map((e) => e.entrenador_id),
    jugadorIds: (row.jugador_equipos ?? []).map((j) => j.jugador_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Columnas base sin relaciones pivot (fallback si las tablas pivote no existen)
const SELECT_BASE = "id,nombre,categoria,sede_id,created_at,updated_at";
// Columnas completas con relaciones pivot (tablas de la migración 013)
const SELECT_FULL =
  "id,nombre,categoria,sede_id,workspace_id,created_at,updated_at,entrenador_equipos(entrenador_id),jugador_equipos(jugador_id)";

async function selectEquipos(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  filter: { field: "workspace_id" | "sede_id" | "id"; value: string },
) {
  // Intentar primero con columnas completas (post-migración 014)
  const baseQuery = supabase
    .from("equipos")
    .select(SELECT_FULL);

  const { data, error } =
    filter.field === "workspace_id"
      ? await baseQuery.eq("workspace_id" as "id", filter.value).order("nombre", { ascending: true })
      : filter.field === "sede_id"
        ? await baseQuery.eq("sede_id", filter.value).order("nombre", { ascending: true })
        : await baseQuery.eq("id", filter.value).order("nombre", { ascending: true });

  if (!error) {
    return { data: data ? (data as unknown as EquipoRow[]).map(mapEquipo) : null, error: null };
  }

  // Fallback: columnas base (pre-migración 014)
  const fallbackQuery = supabase.from("equipos").select(SELECT_BASE);
  const { data: fallback, error: fallbackErr } =
    filter.field === "workspace_id"
      ? await fallbackQuery.eq("workspace_id" as "id", filter.value).order("nombre", { ascending: true })
      : filter.field === "sede_id"
        ? await fallbackQuery.eq("sede_id", filter.value).order("nombre", { ascending: true })
        : await fallbackQuery.eq("id", filter.value).order("nombre", { ascending: true });

  return {
    data: fallback ? (fallback as unknown as EquipoRow[]).map(mapEquipo) : null,
    error: fallbackErr,
  };
}

export async function fetchEquiposByWorkspace(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  return selectEquipos(supabase, { field: "workspace_id", value: workspaceId });
}

export async function fetchEquipos(sedeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  return selectEquipos(supabase, { field: "sede_id", value: sedeId });
}

export async function fetchAllEquipos() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  const { data, error } = await supabase
    .from("equipos")
    .select(SELECT_FULL)
    .order("nombre", { ascending: true });
  if (!error) {
    return { data: data ? (data as unknown as EquipoRow[]).map(mapEquipo) : null, error: null };
  }
  const { data: fallback, error: fallbackErr } = await supabase
    .from("equipos")
    .select(SELECT_BASE)
    .order("nombre", { ascending: true });
  return { data: fallback ? (fallback as unknown as EquipoRow[]).map(mapEquipo) : null, error: fallbackErr };
}

async function syncPivots(
  equipoId: string,
  entrenadorIds: string[],
  jugadorIds: string[],
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error("Missing Supabase env") };

  // Reemplazar entrenadores
  const { error: delEntErr } = await supabase
    .from("entrenador_equipos")
    .delete()
    .eq("equipo_id", equipoId);
  if (delEntErr) return { error: delEntErr };

  if (entrenadorIds.length > 0) {
    const rows = entrenadorIds.map((entrenador_id) => ({ equipo_id: equipoId, entrenador_id }));
    const { error: insEntErr } = await supabase
      .from("entrenador_equipos")
      .insert(rows as unknown as never);
    if (insEntErr) return { error: insEntErr };
  }

  // Reemplazar jugadores
  const { error: delJugErr } = await supabase
    .from("jugador_equipos")
    .delete()
    .eq("equipo_id", equipoId);
  if (delJugErr) return { error: delJugErr };

  if (jugadorIds.length > 0) {
    const rows = jugadorIds.map((jugador_id) => ({ equipo_id: equipoId, jugador_id }));
    const { error: insJugErr } = await supabase
      .from("jugador_equipos")
      .insert(rows as unknown as never);
    if (insJugErr) return { error: insJugErr };
  }

  return { error: null };
}

async function fetchEquipoById(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>,
  id: string,
) {
  const { data, error } = await supabase
    .from("equipos")
    .select(SELECT_FULL)
    .eq("id", id)
    .single();
  if (!error) return { data: data ? mapEquipo(data as unknown as EquipoRow) : null, error: null };

  const { data: fallback, error: fallbackErr } = await supabase
    .from("equipos")
    .select(SELECT_BASE)
    .eq("id", id)
    .single();
  return { data: fallback ? mapEquipo(fallback as unknown as EquipoRow) : null, error: fallbackErr };
}

export async function createEquipo(input: EquipoCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { data, error } = await supabase
    .from("equipos")
    .insert({
      nombre: input.nombre,
      categoria: input.categoria,
      sede_id: input.sedeId,
    })
    .select("id")
    .single();

  if (error || !data) return { data: null, error };

  await syncPivots(data.id, input.entrenadorIds, input.jugadorIds);

  return fetchEquipoById(supabase, data.id);
}

export async function updateEquipo(id: string, input: EquipoUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { error } = await supabase
    .from("equipos")
    .update({
      nombre: input.nombre,
      categoria: input.categoria,
      sede_id: input.sedeId,
    })
    .eq("id", id);
  if (error) return { data: null, error };

  await syncPivots(id, input.entrenadorIds, input.jugadorIds);

  return fetchEquipoById(supabase, id);
}

export async function updateEquipoSede(equipoId: string, sedeId: string | null) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error("Missing Supabase env") };
  const { error } = await supabase
    .from("equipos")
    .update({ nombre: undefined, sede_id: sedeId } as unknown as { id: string })
    .eq("id", equipoId);
  return { error };
}

export async function deleteEquipo(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing Supabase env") };
  const { error } = await supabase.from("equipos").delete().eq("id", id);
  return { data: !error, error };
}
