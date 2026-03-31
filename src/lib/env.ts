export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

export function getOptionalEnv() {
  return env;
}

export function getRequiredEnv() {
  if (!env.supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!env.supabaseAnonKey)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return env;
}

