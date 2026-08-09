import { getSupabaseClient } from "@/services/supabase";
import { mapSesionDetalleToBloquesDraft } from "@/lib/sesionBloques";
import { fetchSesionDetalle } from "@/services/sesion-detalle.service";
import type {
  SesionBloque,
  SesionBloqueDraft,
  SesionBloqueReplaceInput,
} from "@/types/sesion-bloques";

const MISSING_CLIENT = new Error("Falta la configuración de conexión con Supabase");

const SELECT_COLUMNS =
  "id,sesion_id,titulo,duracion_minutos,ejercicio_id,documento_id,orden,created_at,ejercicios(id,titulo),documentos(id,titulo)";

interface SesionBloqueRow {
  id: string;
  sesion_id: string;
  titulo: string;
  duracion_minutos: number;
  ejercicio_id: string;
  documento_id: string | null;
  orden: number;
  created_at: string;
}

export interface SesionBloquesPersistidosData {
  bloques: SesionBloque[];
  source: "blocks";
  isExecutable: true;
}

export interface SesionBloquesLegacyDraftData {
  bloques: SesionBloqueDraft[];
  source: "legacy-draft";
  isExecutable: false;
}

export type SesionBloquesData = SesionBloquesPersistidosData | SesionBloquesLegacyDraftData;

function mapSesionBloque(row: SesionBloqueRow): SesionBloque {
  return {
    id: row.id,
    sesionId: row.sesion_id,
    titulo: row.titulo,
    duracionMinutos: row.duracion_minutos,
    ejercicioId: row.ejercicio_id,
    documentoId: row.documento_id,
    orden: row.orden,
    createdAt: row.created_at,
  };
}

export async function fetchSesionBloques(sesionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase
    .from("sesion_bloques")
    .select(SELECT_COLUMNS)
    .eq("sesion_id", sesionId)
    .order("orden", { ascending: true });

  if (error) return { data: null, error };

  const bloques = ((data ?? []) as SesionBloqueRow[])
    .map(mapSesionBloque)
    .sort((left, right) => left.orden - right.orden);

  if (bloques.length === 0) {
    const legacy = await fetchSesionDetalle(sesionId);
    if (legacy.error || !legacy.data) return { data: null, error: legacy.error };

    return {
      data: {
        bloques: mapSesionDetalleToBloquesDraft(legacy.data).sort(
          (left, right) => left.orden - right.orden,
        ),
        source: "legacy-draft",
        isExecutable: false,
      } as SesionBloquesLegacyDraftData,
      error: null,
    };
  }

  return {
    data: { bloques, source: "blocks", isExecutable: true } as SesionBloquesPersistidosData,
    error: null,
  };
}

export async function replaceSesionBloques(
  sesionId: string,
  bloques: SesionBloqueReplaceInput[],
) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: MISSING_CLIENT };

  const { data, error } = await supabase.rpc("replace_sesion_bloques", {
    p_sesion_id: sesionId,
    p_bloques: bloques.map((bloque) => ({
      titulo: bloque.titulo,
      duracion_minutos: bloque.duracionMinutos,
      ejercicio_id: bloque.ejercicioId,
      documento_id: bloque.documentoId,
      orden: bloque.orden,
    })),
  });

  if (error || !data) return { data: null, error };

  return {
    data: (data as SesionBloqueRow[])
      .map(mapSesionBloque)
      .sort((left, right) => left.orden - right.orden),
    error: null,
  };
}
