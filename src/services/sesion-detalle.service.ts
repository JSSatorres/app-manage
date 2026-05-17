import { getSupabaseClient } from "@/services/supabase";

export interface SesionEjercicioItem {
  id: string;
  ejercicioId: string;
  orden: number;
  tiempoEjecucion: number | null;
  tiempoDescanso: number | null;
  varianteAplicada: string | null;
  titulo: string;
  objetivoPrincipal: string | null;
}

interface RawRow {
  id: string;
  ejercicio_id: string;
  orden: number;
  tiempo_ejecucion: number | null;
  tiempo_descanso: number | null;
  variante_aplicada: string | null;
  ejercicios: {
    titulo: string;
    objetivo_principal: string | null;
  } | null;
}

export async function fetchSesionDetalle(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }

  const { data, error } = await supabase
    .from("sesion_detalle")
    .select(
      "id,ejercicio_id,orden,tiempo_ejecucion,tiempo_descanso,variante_aplicada,ejercicios(titulo,objetivo_principal)",
    )
    .eq("sesion_id", sesionId)
    .order("orden", { ascending: true });

  if (error) return { data: null, error };

  const rows = (data ?? []) as unknown as RawRow[];
  const items: SesionEjercicioItem[] = rows.map((r) => ({
    id: r.id,
    ejercicioId: r.ejercicio_id,
    orden: r.orden,
    tiempoEjecucion: r.tiempo_ejecucion,
    tiempoDescanso: r.tiempo_descanso,
    varianteAplicada: r.variante_aplicada,
    titulo: r.ejercicios?.titulo ?? "(ejercicio eliminado)",
    objetivoPrincipal: r.ejercicios?.objetivo_principal ?? null,
  }));

  return { data: items, error: null };
}
