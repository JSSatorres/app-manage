import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSupabaseServiceClient: vi.fn(),
  getStripe: vi.fn(),
  getServerEnv: vi.fn(),
}));

vi.mock("@/services/supabase-server", () => ({ getSupabaseServiceClient: mocks.getSupabaseServiceClient }));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/serverEnv", () => ({ getServerEnv: mocks.getServerEnv }));

import { POST } from "@/app/api/stripe/webhook/route";

function request() {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "signature" },
    body: "raw-body",
  });
}

function createSupabaseMock() {
  const eventInsert = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "inbox-1" }, error: null }) })) }));
  const accountMaybeSingle = vi.fn().mockResolvedValue({ data: { workspace_id: "workspace-1" }, error: null });
  const accountUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
  const eventUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const from = vi.fn((table: string) => table === "stripe_webhook_events"
    ? { insert: eventInsert, update: eventUpdate }
    : { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: accountMaybeSingle })) })), update: accountUpdate });
  mocks.getSupabaseServiceClient.mockReturnValue({ from });
  return { from, eventInsert, accountUpdate };
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerEnv.mockReturnValue({ stripeWebhookSecret: "whsec_test" });
  });

  it("devuelve 400 sin escrituras si la firma es inválida", async () => {
    mocks.getStripe.mockReturnValue({ webhooks: { constructEvent: vi.fn(() => { throw new Error("invalid signature"); }) } });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.getSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("proyecta account.updated solo sobre el workspace de la cuenta conectada", async () => {
    const { accountUpdate } = createSupabaseMock();
    mocks.getStripe.mockReturnValue({ webhooks: { constructEvent: vi.fn(() => ({
      id: "evt_account_updated",
      type: "account.updated",
      account: "acct_workspace",
      data: { object: {
        id: "acct_workspace",
        object: "account",
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        requirements: { currently_due: [] },
      } },
    })) } });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(accountUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "active", charges_enabled: true }));
  });

  it("acepta un evento duplicado sin reproyectarlo", async () => {
    const eventInsert = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }) })) }));
    const from = vi.fn(() => ({ insert: eventInsert }));
    mocks.getSupabaseServiceClient.mockReturnValue({ from });
    mocks.getStripe.mockReturnValue({ webhooks: { constructEvent: vi.fn(() => ({
      id: "evt_duplicate",
      type: "account.updated",
      account: "acct_workspace",
      data: { object: { id: "acct_workspace" } },
    })) } });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
