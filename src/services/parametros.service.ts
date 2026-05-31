import { getSupabaseClient } from "@/services/supabase";
import type {
  ParametroSistema,
  ParametroSistemaCreateInput,
  ParametroSistemaUpdateInput,
} from "@/types/parametros";

function mapParametro(row: {
  id: string;
  categoria: string;
  nombre: string;
  activo: boolean | null;
  sede_id: string | null;
  created_at: string | null;
}): ParametroSistema {
  return {
    id: row.id,
    categoria: row.categoria,
    nombre: row.nombre,
    activo: row.activo ?? true,
    sedeId: row.sede_id,
    createdAt: row.created_at ?? "",
  };
}

export async function fetchParametrosByCategoria(
  categoria: string,
  sedeId: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  // Devuelve globales (sede_id IS NULL) + los de la sede
  const { data, error } = await supabase
    .from("parametros_sistema")
    .select("id,categoria,nombre,activo,sede_id,created_at")
    .eq("categoria", categoria)
    .or(`sede_id.is.null,sede_id.eq.${sedeId}`)
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapParametro) : null, error };
}

export async function createParametro(input: ParametroSistemaCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("parametros_sistema")
    .insert({
      categoria: input.categoria,
      nombre: input.nombre,
      activo: input.activo,
      sede_id: input.sedeId,
    } as never)
    .select("id,categoria,nombre,activo,sede_id,created_at")
    .single();

  return { data: data ? mapParametro(data) : null, error };
}

export async function updateParametro(id: string, input: ParametroSistemaUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { data, error } = await supabase
    .from("parametros_sistema")
    .update({
      nombre: input.nombre,
      activo: input.activo,
      sede_id: input.sedeId,
    })
    .eq("id", id)
    .select("id,categoria,nombre,activo,sede_id,created_at")
    .single();

  return { data: data ? mapParametro(data) : null, error };
}

export async function deleteParametro(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: null, error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY") };
  }
  const { error } = await supabase.from("parametros_sistema").delete().eq("id", id);
  return { data: true, error };
}
