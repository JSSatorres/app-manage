import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

import { getRequiredEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getRequiredEnv();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
