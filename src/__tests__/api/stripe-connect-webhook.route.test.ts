import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ getSupabaseServiceClient: vi.fn(), getStripe: vi.fn(), getServerEnv: vi.fn() }));
vi.mock("@/services/supabase-server", () => ({ getSupabaseServiceClient: mocks.getSupabaseServiceClient }));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/serverEnv", () => ({ getServerEnv: mocks.getServerEnv }));

import { POST } from "@/app/api/stripe/connect-webhook/route";

function request() { return new Request("http://localhost/api/stripe/connect-webhook", { method: "POST", headers: { "stripe-signature": "signature" }, body: "raw-body" }); }

function mockRefundSupabase() {
  const connection = { id: "connection-1", workspace_id: "workspace-1", stripe_account_id: "acct_club" };
  const attempt = { id: "attempt-1", workspace_id: "workspace-1", stripe_connected_account_id: connection.id, payment_intent_id: "pi_123" };
  const settlement = { id: "settlement-1", workspace_id: "workspace-1", entry_id: "entry-1", amount_minor: 5000, currency_code: "EUR" };
  let movementReads = 0;
  const movementInsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const eventInsert = vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "inbox-1" }, error: null }) })) }));
  const chain = (result: object | null) => {
    const value = {
      eq: vi.fn(() => value),
      maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
    };
    return value;
  };
  const from = vi.fn((table: string) => {
    if (table === "stripe_webhook_events") return { insert: eventInsert, update };
    if (table === "stripe_connected_accounts") return { select: vi.fn(() => chain(connection)) };
    if (table === "stripe_payment_attempts") return { select: vi.fn(() => chain(attempt)) };
    return {
      select: vi.fn(() => chain(movementReads++ === 0 ? settlement : null)),
      insert: movementInsert,
      update,
    };
  });
  mocks.getSupabaseServiceClient.mockReturnValue({ from });
  return { movementInsert };
}

describe("POST /api/stripe/connect-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerEnv.mockReturnValue({ stripeConnectWebhookSecret: "whsec_test" });
  });

  it("no escribe cuando la firma raw no es válida", async () => {
    mocks.getStripe.mockReturnValue({ webhooks: { constructEvent: vi.fn(() => { throw new Error("invalid"); }) } });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.getSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it("recupera el refund actual y proyecta un único movimiento pendiente vinculado a su liquidación", async () => {
    const { movementInsert } = mockRefundSupabase();
    mocks.getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: "evt_refund",
          type: "refund.updated",
          account: "acct_club",
          data: { object: { id: "re_123" } },
        })),
      },
      refunds: {
        retrieve: vi.fn().mockResolvedValue({
          id: "re_123",
          amount: 2000,
          currency: "eur",
          status: "pending",
          created: 1_780_000_000,
          payment_intent: "pi_123",
          charge: "ch_123",
        }),
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(movementInsert).toHaveBeenCalledWith(expect.objectContaining({
      movement_type: "refund",
      external_status: "pending",
      original_movement_id: "settlement-1",
      external_reference: "stripe:refund:re_123",
    }));
  });
});
