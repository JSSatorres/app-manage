import { getSupabaseClient } from "@/services/supabase";
import type {
  Jugador,
  JugadorCreateInput,
  JugadorUpdateInput,
  PieDominante,
} from "@/types/jugadores";

interface JugadorRow {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  dorsal: number | null;
  posicion: string | null;
  pie_dominante: PieDominante | null;
  foto_url: string | null;
  notas: string | null;
  tutor_nombre: string | null;
  tutor_telefono: string | null;
  user_id: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  jugador_sedes?: { sede_id: string }[];
  jugador_equipos?: { equipo_id: string }[];
}

function mapJugador(row: JugadorRow): Jugador {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    email: row.email,
    telefono: row.telefono,
    fechaNacimiento: row.fecha_nacimiento,
    dorsal: row.dorsal,
    posicion: row.posicion,
    pieDominante: row.pie_dominante,
    fotoUrl: row.foto_url,
    notas: row.notas,
    tutorNombre: row.tutor_nombre,
    tutorTelefono: row.tutor_telefono,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    sedeIds: (row.jugador_sedes ?? []).map((s) => s.sede_id),
    equipoIds: (row.jugador_equipos ?? []).map((e) => e.equipo_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id,nombre,apellidos,email,telefono,fecha_nacimiento,dorsal,posicion,pie_dominante,foto_url,notas,tutor_nombre,tutor_telefono,user_id,workspace_id,created_at,updated_at,jugador_sedes(sede_id),jugador_equipos(equipo_id)";

export async function fetchJugadoresByWorkspace(workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  const { data, error } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });
  return { data: data ? (data as JugadorRow[]).map(mapJugador) : null, error };
}

export async function fetchJugadoresBySede(sedeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { data: links, error: linkErr } = await supabase
    .from("jugador_sedes")
    .select("jugador_id")
    .eq("sede_id", sedeId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.jugador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ? (data as JugadorRow[]).map(mapJugador) : null, error };
}

export async function fetchJugadoresByEquipo(equipoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { data: links, error: linkErr } = await supabase
    .from("jugador_equipos")
    .select("jugador_id")
    .eq("equipo_id", equipoId);
  if (linkErr) return { data: null, error: linkErr };

  const ids = (links ?? []).map((l) => l.jugador_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .in("id", ids)
    .order("nombre", { ascending: true });

  return { data: data ? (data as JugadorRow[]).map(mapJugador) : null, error };
}

export async function fetchAllJugadores() {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };
  const { data, error } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .order("nombre", { ascending: true });
  return { data: data ? (data as JugadorRow[]).map(mapJugador) : null, error };
}

async function syncPivots(jugadorId: string, sedeIds: string[], equipoIds: string[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: new Error("Missing Supabase env") };

  const { error: delSedesErr } = await supabase
    .from("jugador_sedes")
    .delete()
    .eq("jugador_id", jugadorId);
  if (delSedesErr) return { error: delSedesErr };

  if (sedeIds.length > 0) {
    const { error: insSedesErr } = await supabase
      .from("jugador_sedes")
      .insert(sedeIds.map((sede_id) => ({ jugador_id: jugadorId, sede_id })));
    if (insSedesErr) return { error: insSedesErr };
  }

  const { error: delEqErr } = await supabase
    .from("jugador_equipos")
    .delete()
    .eq("jugador_id", jugadorId);
  if (delEqErr) return { error: delEqErr };

  if (equipoIds.length > 0) {
    const { error: insEqErr } = await supabase
      .from("jugador_equipos")
      .insert(equipoIds.map((equipo_id) => ({ jugador_id: jugadorId, equipo_id })));
    if (insEqErr) return { error: insEqErr };
  }

  return { error: null };
}

export async function createJugador(input: JugadorCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  if (!input.workspaceId) {
    return { data: null, error: new Error("workspaceId requerido") };
  }

  const { data, error } = await supabase
    .from("jugadores")
    .insert({
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      fecha_nacimiento: input.fechaNacimiento,
      dorsal: input.dorsal,
      posicion: input.posicion,
      pie_dominante: input.pieDominante,
      notas: input.notas,
      tutor_nombre: input.tutorNombre,
      tutor_telefono: input.tutorTelefono,
      workspace_id: input.workspaceId,
    })
    .select("id")
    .single();

  if (error || !data) return { data: null, error };

  const { error: pivotErr } = await syncPivots(data.id, input.sedeIds, input.equipoIds);
  if (pivotErr) return { data: null, error: pivotErr };

  const { data: full, error: fullErr } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .eq("id", data.id)
    .single();

  return { data: full ? mapJugador(full as JugadorRow) : null, error: fullErr };
}

export async function updateJugador(id: string, input: JugadorUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: new Error("Missing Supabase env") };

  const { error } = await supabase
    .from("jugadores")
    .update({
      nombre: input.nombre,
      apellidos: input.apellidos,
      email: input.email,
      telefono: input.telefono,
      fecha_nacimiento: input.fechaNacimiento,
      dorsal: input.dorsal,
      posicion: input.posicion,
      pie_dominante: input.pieDominante,
      notas: input.notas,
      tutor_nombre: input.tutorNombre,
      tutor_telefono: input.tutorTelefono,
    })
    .eq("id", id);
  if (error) return { data: null, error };

  const { error: pivotErr } = await syncPivots(id, input.sedeIds, input.equipoIds);
  if (pivotErr) return { data: null, error: pivotErr };

  const { data: full, error: fullErr } = await supabase
    .from("jugadores")
    .select(SELECT_COLS)
    .eq("id", id)
    .single();

  return { data: full ? mapJugador(full as JugadorRow) : null, error: fullErr };
}

export async function deleteJugador(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing Supabase env") };
  const { error } = await supabase.from("jugadores").delete().eq("id", id);
  return { data: !error, error };
}
