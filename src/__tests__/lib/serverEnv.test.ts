import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getServerEnv } from "@/lib/serverEnv";

describe("getServerEnv", () => {
  it("rechaza un entorno sin secretos server-only", () => {
    expect(() => getServerEnv({})).toThrow("Missing STRIPE_SECRET_KEY");
  });

  it("rechaza una clave secreta Stripe en modo live", () => {
    expect(() =>
      getServerEnv({
        STRIPE_SECRET_KEY: "sk_live_dummy",
        STRIPE_WEBHOOK_SECRET: "whsec_dummy",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_dummy",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-dummy",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrow("STRIPE_SECRET_KEY must use a test-mode key");
  });

  it("rechaza una clave publicable Stripe live cuando está configurada", () => {
    expect(() =>
      getServerEnv({
        STRIPE_SECRET_KEY: "sk_test_dummy",
        STRIPE_WEBHOOK_SECRET: "whsec_dummy",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_dummy",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-dummy",
        APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_dummy",
      }),
    ).toThrow("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must use a test-mode key");
  });

  it("rechaza combinaciones incompletas", () => {
    expect(() =>
      getServerEnv({
        STRIPE_SECRET_KEY: "sk_test_dummy",
        STRIPE_WEBHOOK_SECRET: "whsec_dummy",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-dummy",
        APP_URL: "http://localhost:3000",
      }),
    ).toThrow("Missing STRIPE_CONNECT_WEBHOOK_SECRET");
  });

  it("acepta una configuración server-only completa en test mode", () => {
    expect(
      getServerEnv({
        STRIPE_SECRET_KEY: "sk_test_dummy",
        STRIPE_WEBHOOK_SECRET: "whsec_dummy",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_dummy",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-dummy",
        APP_URL: "http://localhost:3000",
      }),
    ).toMatchObject({
      stripeSecretKey: "sk_test_dummy",
      appUrl: "http://localhost:3000",
    });
  });
});
