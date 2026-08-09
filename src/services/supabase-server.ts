import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/serverEnv";
import type { Database } from "@/types/database.types";

function createServerClient(apiKey: string, accessToken?: string): SupabaseClient<Database> {
  const { supabaseUrl } = getRequiredEnv();

  return createClient<Database>(supabaseUrl, apiKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function getSupabaseServerClient(accessToken: string): SupabaseClient<Database> {
  const { supabaseAnonKey } = getRequiredEnv();
  return createServerClient(supabaseAnonKey, accessToken);
}

let supabaseServiceClient: SupabaseClient<Database> | null = null;

export function getSupabaseServiceClient(): SupabaseClient<Database> {
  if (supabaseServiceClient) return supabaseServiceClient;

  const { supabaseServiceRoleKey } = getServerEnv();
  supabaseServiceClient = createServerClient(supabaseServiceRoleKey);
  return supabaseServiceClient;
}
