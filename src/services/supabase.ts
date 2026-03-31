import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

import { getRequiredEnv } from "@/lib/env";

let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { supabaseUrl, supabaseAnonKey } = getRequiredEnv();
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}
