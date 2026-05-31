import { getSupabaseClient } from "@/services/supabase";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import type { Sesion, SesionCreateInput, SesionUpdateInput } from "@/types/sesiones";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>;

const MISSING_CLIENT = new Error(
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

const SELECT_COLS =
  "id,fecha,hora_inicio,duracion_estimada,equipo_id,entrenador_id,microciclo,periodo_temporada,objetivo_sesion,observaciones_previas,feedback_post_entreno,estado,created_at,updated_at";

interface SesionRow {
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
}

function mapSesion(row: SesionRow, entrenadorIds: string[]): Sesion {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    duracionEstimada: row.duracion_estimada,
    equipoId: row.equipo_id,
    // Si la pivote no devuelve nada (datos legacy), usar el entrenador_id directo.
    entrenadorIds: entrenadorIds.length > 0 ? entrenadorIds : row.entrenador_id ? [row.entrenador_id] : [],
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

/** Carga los entrenadores (pivote) de un conjunto de sesiones. */
async function fetchEntrenadoresPivot(
  supabase: SupabaseClient,
  sesionIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (sesionIds.length === 0) return map;
  const { data } = await supabase
    .from("sesion_entrenadores")
    .select("sesion_id,entrenador_id")
    .in("sesion_id", sesionIds);
  for (const r of (data ?? []) as { sesion_id: string; entrenador_id: string }[]) {
    const list = map.get(r.sesion_id) ?? [];
    list.push(r.entrenador_id);
    map.set(r.sesion_id, list);
  }
  return map;
}

/** Reemplaza el conjunto de entrenadores de una sesión en la pivote. */
async function syncEntrenadores(
  supabase: SupabaseClient,
  sesionId: string,
  entrenadorIds: string[],
) {
  await supabase.from("sesion_entrenadores").delete().eq("sesion_id", sesionId);
  if (entrenadorIds.length > 0) {
    const rows = entrenadorIds.map((entrenador_id) => ({ sesion_id: sesionId, entrenador_id }));
    await supabase.from("sesion_entrenadores").insert(rows as unknown as never);
  }
}

export async function fetchSesionesBySedeIds(sedeIds: string[]) {
  if (!sedeIds.length) return { data: [], error: null };
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data: equipos, error: e1 } = await supabase
    .from("equipos")
    .select("id")
    .in("sede_id", sedeIds);
  if (e1) return { data: null, error: e1 };
  const equipoIds = equipos?.map((e) => e.id) ?? [];
  if (!equipoIds.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from("sesiones")
    .select(SELECT_COLS)
    .in("equipo_id", equipoIds)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false, nullsFirst: false });

  if (error || !data) return { data: null, error };

  const rows = data as unknown as SesionRow[];
  const pivot = await fetchEntrenadoresPivot(supabase, rows.map((r) => r.id));
  return { data: rows.map((r) => mapSesion(r, pivot.get(r.id) ?? [])), error: null };
}

export async function fetchSesionesByEquipoId(equipoId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };
  const { data, error } = await supabase
    .from("sesiones")
    .select(SELECT_COLS)
    .eq("equipo_id", equipoId)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: true, nullsFirst: false })
    .limit(20);

  if (error || !data) return { data: null, error };

  const rows = data as unknown as SesionRow[];
  const pivot = await fetchEntrenadoresPivot(supabase, rows.map((r) => r.id));
  return { data: rows.map((r) => mapSesion(r, pivot.get(r.id) ?? [])), error: null };
}

export async function createSesion(input: SesionCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase
    .from("sesiones")
    .insert({
      fecha: input.fecha,
      hora_inicio: input.horaInicio,
      duracion_estimada: input.duracionEstimada,
      equipo_id: input.equipoId,
      entrenador_id: input.entrenadorIds[0],
      microciclo: input.microciclo,
      periodo_temporada: input.periodoTemporada,
      objetivo_sesion: input.objetivoSesion,
      observaciones_previas: input.observacionesPrevias,
      estado: input.estado,
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) return { data: null, error };

  const row = data as unknown as SesionRow;
  await syncEntrenadores(supabase, row.id, input.entrenadorIds);
  return { data: mapSesion(row, input.entrenadorIds), error: null };
}

export async function updateSesion(id: string, input: SesionUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase
    .from("sesiones")
    .update({
      fecha: input.fecha,
      hora_inicio: input.horaInicio,
      duracion_estimada: input.duracionEstimada,
      equipo_id: input.equipoId,
      entrenador_id: input.entrenadorIds[0],
      microciclo: input.microciclo,
      periodo_temporada: input.periodoTemporada,
      objetivo_sesion: input.objetivoSesion,
      observaciones_previas: input.observacionesPrevias,
      feedback_post_entreno: input.feedbackPostEntreno,
      estado: input.estado,
    })
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error || !data) return { data: null, error };

  const row = data as unknown as SesionRow;
  await syncEntrenadores(supabase, row.id, input.entrenadorIds);
  return { data: mapSesion(row, input.entrenadorIds), error: null };
}

export async function createSesionesBulk(inputs: SesionCreateInput[]) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const rows = inputs.map((input) => ({
    fecha: input.fecha,
    hora_inicio: input.horaInicio,
    duracion_estimada: input.duracionEstimada,
    equipo_id: input.equipoId,
    entrenador_id: input.entrenadorIds[0],
    microciclo: input.microciclo,
    periodo_temporada: input.periodoTemporada,
    objetivo_sesion: input.objetivoSesion,
    observaciones_previas: input.observacionesPrevias,
    estado: input.estado,
  }));
  const { data, error } = await supabase.from("sesiones").insert(rows).select(SELECT_COLS);

  if (error || !data) return { data: null, error };

  const created = data as unknown as SesionRow[];
  // Sincroniza la pivote para cada sesión creada (mismo orden que inputs).
  await Promise.all(
    created.map((row, i) => syncEntrenadores(supabase, row.id, inputs[i]?.entrenadorIds ?? [])),
  );
  return { data: created.map((row, i) => mapSesion(row, inputs[i]?.entrenadorIds ?? [])), error: null };
}

export async function deleteSesion(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: false, error: MISSING_CLIENT };
  const { error } = await supabase.from("sesiones").delete().eq("id", id);
  return { data: true, error };
}
