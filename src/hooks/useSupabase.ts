import { getSupabaseClient } from "@/services/supabase";

export function useSupabase() {
  return getSupabaseClient();
}
