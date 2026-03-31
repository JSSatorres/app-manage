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
  activo: boolean;
  sede_id: string | null;
  workspace_id: string;
  created_at: string;
}): ParametroSistema {
  return {
    id: row.id,
    categoria: row.categoria,
    nombre: row.nombre,
    activo: row.activo,
    sedeId: row.sede_id,
    workspaceId: row.workspace_id,
    createdAt: row.created_at,
  };
}

export async function fetchParametrosByCategoria(
  categoria: string,
  workspaceId: string,
) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("parametros_sistema")
    .select("id,categoria,nombre,activo,sede_id,workspace_id,created_at")
    .eq("categoria", categoria)
    .eq("workspace_id", workspaceId)
    .order("nombre", { ascending: true });

  return { data: data ? data.map(mapParametro) : null, error };
}

export async function createParametro(input: ParametroSistemaCreateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("parametros_sistema")
    .insert({
      categoria: input.categoria,
      nombre: input.nombre,
      activo: input.activo,
      sede_id: input.sedeId,
      workspace_id: input.workspaceId,
    })
    .select("id,categoria,nombre,activo,sede_id,workspace_id,created_at")
    .single();

  return { data: data ? mapParametro(data) : null, error };
}

export async function updateParametro(id: string, input: ParametroSistemaUpdateInput) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { data, error } = await supabase
    .from("parametros_sistema")
    .update({
      nombre: input.nombre,
      activo: input.activo,
      sede_id: input.sedeId,
      workspace_id: input.workspaceId,
    })
    .eq("id", id)
    .select("id,categoria,nombre,activo,sede_id,workspace_id,created_at")
    .single();

  return { data: data ? mapParametro(data) : null, error };
}

export async function deleteParametro(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      data: null,
      error: new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    };
  }
  const { error } = await supabase
    .from("parametros_sistema")
    .delete()
    .eq("id", id);
  return { data: true, error };
}
