import { getSupabaseClient } from "@/services/supabase";
import type { Ejercicio, EjercicioCreateInput, EjercicioUpdateInput } from "@/types/ejercicios";
import { fetchDocumentoIdsByEjercicios } from "@/services/ejercicio-documentos.service";

function mapEjercicio(
  row: {
    id: string;
    titulo: string;
    objetivo_principal: string | null;
    numero_jugadores_min: number | null;
    sede_propietaria_id: string | null;
    es_global: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  },
  documentoIds: string[] = [],
): Ejercicio {
  return {
    id: row.id,
    titulo: row.titulo,
    objetivoPrincipal: row.objetivo_principal,
    numeroJugadoresMin: row.numero_jugadores_min,
    sedePropietariaId: row.sede_propietaria_id,
    esGlobal: row.es_global ?? false,
    documentoIds,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export async function fetchEjercicios(sedeId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .select("id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,created_at,updated_at")
    .or(`es_global.eq.true,sede_propietaria_id.eq.${sedeId}`)
    .order("updated_at", { ascending: false });

  if (error) return { data: null, error };

  const ids = (data ?? []).map((e) => e.id);
  const { data: docMap } = await fetchDocumentoIdsByEjercicios(ids);
  const docMapVal = docMap as Map<string, string[]> | null;

  const rows = (data ?? []).map((e) =>
    mapEjercicio(e, docMapVal?.get(e.id) ?? []),
  );
  return { data: rows, error: null };
}

export async function createEjercicio(input: EjercicioCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .insert({
      titulo: input.titulo,
      objetivo_principal: input.objetivoPrincipal,
      numero_jugadores_min: input.numeroJugadoresMin,
      sede_propietaria_id: input.sedePropietariaId,
      es_global: input.esGlobal,
    } as never)
    .select("id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,created_at,updated_at")
    .single();

  if (error || !data) return { data: null, error };

  const { data: docMap } = await fetchDocumentoIdsByEjercicios([data.id]);
  const docMapVal = docMap as Map<string, string[]> | null;
  return { data: mapEjercicio(data, docMapVal?.get(data.id) ?? []), error: null };
}

export async function updateEjercicio(id: string, input: EjercicioUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("ejercicios")
    .update({
      titulo: input.titulo,
      objetivo_principal: input.objetivoPrincipal,
      numero_jugadores_min: input.numeroJugadoresMin,
      sede_propietaria_id: input.sedePropietariaId,
      es_global: input.esGlobal,
    })
    .eq("id", id)
    .select("id,titulo,objetivo_principal,numero_jugadores_min,sede_propietaria_id,es_global,created_at,updated_at")
    .single();

  if (error || !data) return { data: null, error };

  const { data: docMap } = await fetchDocumentoIdsByEjercicios([data.id]);
  const docMapVal = docMap as Map<string, string[]> | null;
  return { data: mapEjercicio(data, docMapVal?.get(data.id) ?? []), error: null };
}

export async function deleteEjercicio(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { error } = await supabase.from("ejercicios").delete().eq("id", id);
  return { data: true, error };
}
