import "server-only";

export type ServerEnv = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectWebhookSecret: string;
  supabaseServiceRoleKey: string;
  appUrl: string;
  stripePublishableKey?: string;
};

function requireEnv(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function requireTestKey(name: string, value: string, prefix: string): string {
  if (value.startsWith(`${prefix.replace("test", "live")}_`)) {
    throw new Error(`${name} must use a test-mode key`);
  }
  if (!value.startsWith(`${prefix}_`)) {
    throw new Error(`${name} must use a ${prefix}_ key`);
  }
  return value;
}

function requireWebhookSecret(name: string, value: string): string {
  if (!value.startsWith("whsec_")) {
    throw new Error(`${name} must use a whsec_ secret`);
  }
  return value;
}

function requireAppUrl(value: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("APP_URL must be a valid URL");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("APP_URL must use http or https");
  }

  return parsedUrl.origin;
}

export function getServerEnv(
  env: Record<string, string | undefined> = process.env,
): ServerEnv {
  const stripeSecretKey = requireTestKey(
    "STRIPE_SECRET_KEY",
    requireEnv(env, "STRIPE_SECRET_KEY"),
    "sk_test",
  );
  const stripeWebhookSecret = requireWebhookSecret(
    "STRIPE_WEBHOOK_SECRET",
    requireEnv(env, "STRIPE_WEBHOOK_SECRET"),
  );
  const stripeConnectWebhookSecret = requireWebhookSecret(
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    requireEnv(env, "STRIPE_CONNECT_WEBHOOK_SECRET"),
  );
  const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = requireAppUrl(requireEnv(env, "APP_URL"));
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

  return {
    stripeSecretKey,
    stripeWebhookSecret,
    stripeConnectWebhookSecret,
    supabaseServiceRoleKey,
    appUrl,
    stripePublishableKey: publishableKey
      ? requireTestKey(
          "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
          publishableKey,
          "pk_test",
        )
      : undefined,
  };
}
