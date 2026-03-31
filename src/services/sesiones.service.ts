import { getSupabaseClient } from "@/services/supabase";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import type { Sesion, SesionCreateInput, SesionUpdateInput } from "@/types/sesiones";

function mapSesion(row: {
  id: string;
  fecha: string;
  hora_inicio: string | null;
  duracion_estimada: number | null;
  equipo_id: string;
  entrenador_id: string;
  microciclo: number | null;
  periodo_temporada: string | null;
  objetivo_sesion: string | null;
  observaciones_previas: string | null;
  feedback_post_entreno: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
}): Sesion {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    duracionEstimada: row.duracion_estimada,
    equipoId: row.equipo_id,
    entrenadorId: row.entrenador_id,
    microciclo: row.microciclo,
    periodoTemporada: (row.periodo_temporada as PeriodoTemporada | null) ?? null,
    objetivoSesion: row.objetivo_sesion,
    observacionesPrevias: row.observaciones_previas,
    feedbackPostEntreno: row.feedback_post_entreno,
    estado: row.estado as EstadoSesion,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSesionesBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data: equipos, error: e1 } = await supabase
    .from("equipos")
    .select("id")
    .in("sede_id", sedeIds);
  if (e1) return { data: null, error: e1 };
  const equipoIds = equipos?.map((e) => e.id) ?? [];
  if (!equipoIds.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from("sesiones")
    .select(
      "id,fecha,hora_inicio,duracion_estimada,equipo_id,entrenador_id,microciclo,periodo_temporada,objetivo_sesion,observaciones_previas,feedback_post_entreno,estado,created_at,updated_at",
    )
    .in("equipo_id", equipoIds)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false, nullsFirst: false });

  return { data: data ? data.map(mapSesion) : null, error };
}

export async function createSesion(input: SesionCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("sesiones")
    .insert({
      fecha: input.fecha,
      hora_inicio: input.horaInicio,
      duracion_estimada: input.duracionEstimada,
      equipo_id: input.equipoId,
      entrenador_id: input.entrenadorId,
      microciclo: input.microciclo,
      periodo_temporada: input.periodoTemporada,
      objetivo_sesion: input.objetivoSesion,
      observaciones_previas: input.observacionesPrevias,
      estado: input.estado,
    })
    .select(
      "id,fecha,hora_inicio,duracion_estimada,equipo_id,entrenador_id,microciclo,periodo_temporada,objetivo_sesion,observaciones_previas,feedback_post_entreno,estado,created_at,updated_at",
    )
    .single();

  return { data: data ? mapSesion(data) : null, error };
}

export async function updateSesion(id: string, input: SesionUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("sesiones")
    .update({
      fecha: input.fecha,
      hora_inicio: input.horaInicio,
      duracion_estimada: input.duracionEstimada,
      equipo_id: input.equipoId,
      entrenador_id: input.entrenadorId,
      microciclo: input.microciclo,
      periodo_temporada: input.periodoTemporada,
      objetivo_sesion: input.objetivoSesion,
      observaciones_previas: input.observacionesPrevias,
      feedback_post_entreno: input.feedbackPostEntreno,
      estado: input.estado,
    })
    .eq("id", id)
    .select(
      "id,fecha,hora_inicio,duracion_estimada,equipo_id,entrenador_id,microciclo,periodo_temporada,objetivo_sesion,observaciones_previas,feedback_post_entreno,estado,created_at,updated_at",
    )
    .single();

  return { data: data ? mapSesion(data) : null, error };
}

export async function deleteSesion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  const { error } = await supabase.from("sesiones").delete().eq("id", id);
  return { data: true, error };
}

