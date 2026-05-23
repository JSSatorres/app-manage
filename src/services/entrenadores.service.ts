import { getSupabaseClient } from "@/services/supabase";
import type {
  Entrenador,
  EntrenadorCreateInput,
  EntrenadorUpdateInput,
} from "@/types/entrenadores";

interface EntrenadorRow {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  titulacion: string | null;
  foto_url: string | null;
  notas: string | null;
  user_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  entrenador_sedes?: { sede_id: string }[];
  entrenador_equipos?: { equipo_id: string }[];
}

function mapEntrenador(row: EntrenadorRow): Entrenador {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    email: row.email,
    telefono: row.telefono,
    fechaNacimiento: row.fecha_nacimiento,
    titulacion: row.titulacion,
    fotoUrl: row.foto_url,
    notas: row.notas,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    sedeIds: (row.entrenador_sedes ?? []).map((s) => s.sede_id),
    equipoIds: (row.entrenador_equipos ?? []).map((e) => e.equipo_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id,nombre,apellidos,email,telefono,fecha_nacimiento,titulacion,foto_url,notas,user_id,workspace_id,created_at,updated_at,entrenador_sedes(sede_id),entrenador_equipos(equipo_id)";

export async function fetchEntrenadoresByWorkspace(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  const { data, error } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });
  return { data: data ? (data as EntrenadorRow[]).map(mapEntrenador) : null, error };
}

export async function fetchEntrenadoresBySede(sedeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { data: links, error: linkErr } = await supabase
    .from("entrenador_sedes")
    .select("entrenador_id")
    .eq("sede_id", sedeId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.entrenador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ? (data as EntrenadorRow[]).map(mapEntrenador) : null, error };
}

export async function fetchEntrenadoresByEquipo(equipoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { data: links, error: linkErr } = await supabase
    .from("entrenador_equipos")
    .select("entrenador_id")
    .eq("equipo_id", equipoId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.entrenador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ? (data as EntrenadorRow[]).map(mapEntrenador) : null, error };
}

export async function fetchAllEntrenadores() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  const { data, error } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .order("nombre", { ascending: true });
  return { data: data ? (data as EntrenadorRow[]).map(mapEntrenador) : null, error };
}

async function syncPivots(
  entrenadorId: string,
  sedeIds: string[],
  equipoIds: string[],
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error("Missing Supabase env") };

  // Reemplazar sedes
  const { error: delSedesErr } = await supabase
    .from("entrenador_sedes")
    .delete()
    .eq("entrenador_id", entrenadorId);
  if (delSedesErr) return { error: delSedesErr };

  if (sedeIds.length > 0) {
    const { error: insSedesErr } = await supabase
      .from("entrenador_sedes")
      .insert(sedeIds.map((sede_id) => ({ entrenador_id: entrenadorId, sede_id })));
    if (insSedesErr) return { error: insSedesErr };
  }

  // Reemplazar equipos
  const { error: delEqErr } = await supabase
    .from("entrenador_equipos")
    .delete()
    .eq("entrenador_id", entrenadorId);
  if (delEqErr) return { error: delEqErr };

  if (equipoIds.length > 0) {
    const { error: insEqErr } = await supabase
      .from("entrenador_equipos")
      .insert(equipoIds.map((equipo_id) => ({ entrenador_id: entrenadorId, equipo_id })));
    if (insEqErr) return { error: insEqErr };
  }

  return { error: null };
}

export async function createEntrenador(input: EntrenadorCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  if (!input.workspaceId) {
    return { data: null, error: new Error("workspaceId requerido") };
  }

  const { data, error } = await supabase
    .from("entrenadores")
    .insert({
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      fecha_nacimiento: input.fechaNacimiento,
      titulacion: input.titulacion,
      notas: input.notas,
      workspace_id: input.workspaceId,
    })
    .select("id")
    .single();

  if (error || !data) return { data: null, error };

  const { error: pivotErr } = await syncPivots(data.id, input.sedeIds, input.equipoIds);
  if (pivotErr) return { data: null, error: pivotErr };

  const { data: full, error: fullErr } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .eq("id", data.id)
    .single();

  return { data: full ? mapEntrenador(full as EntrenadorRow) : null, error: fullErr };
}

export async function updateEntrenador(id: string, input: EntrenadorUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { error } = await supabase
    .from("entrenadores")
    .update({
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      fecha_nacimiento: input.fechaNacimiento,
      titulacion: input.titulacion,
      notas: input.notas,
    })
    .eq("id", id);
  if (error) return { data: null, error };

  const { error: pivotErr } = await syncPivots(id, input.sedeIds, input.equipoIds);
  if (pivotErr) return { data: null, error: pivotErr };

  const { data: full, error: fullErr } = await supabase
    .from("entrenadores")
    .select(SELECT_COLS)
    .eq("id", id)
    .single();

  return { data: full ? mapEntrenador(full as EntrenadorRow) : null, error: fullErr };
}

export async function deleteEntrenador(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing Supabase env") };
  const { error } = await supabase.from("entrenadores").delete().eq("id", id);
  return { data: !error, error };
}
