import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireWorkspaceAdmin: vi.fn(),
  getSupabaseServiceClient: vi.fn(),
  getStripe: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({
  requireWorkspaceAdmin: mocks.requireWorkspaceAdmin,
}));
vi.mock("@/services/supabase-server", () => ({
  getSupabaseServiceClient: mocks.getSupabaseServiceClient,
}));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));

import { GET, POST } from "@/app/api/stripe/connect/account/route";

const workspaceId = "workspace-1";
const connection = {
  id: "connection-1",
  workspace_id: workspaceId,
  stripe_account_id: "acct_existing",
  dashboard_access: "full",
  controller_configuration: {},
  details_submitted: false,
  charges_enabled: false,
  payouts_enabled: false,
  status: "pending",
  last_synced_at: null,
};

function createRequest(method: "GET" | "POST", payload?: object) {
  const url = new URL("http://localhost/api/stripe/connect/account");
  if (method === "GET") url.searchParams.set("workspaceId", workspaceId);
  return new Request(url, {
    method,
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

function mockSupabase(existing: typeof connection | null, inserted = connection) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
  const insertSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
  const from = vi.fn(() => ({ select, insert }));
  mocks.getSupabaseServiceClient.mockReturnValue({ from });
  return { from, insert };
}

describe("POST /api/stripe/connect/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({ workspaceId, userId: "user-1", role: "admin" });
    mocks.getStripe.mockReturnValue({
      accounts: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({
          id: "acct_created",
          controller: {
            fees: { payer: "account" },
            losses: { payments: "stripe" },
            requirement_collection: "stripe",
            stripe_dashboard: { type: "full" },
          },
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements: { currently_due: [] },
        }),
      },
    });
  });

  it("solo permite crear la cuenta a un admin del workspace", async () => {
    mocks.requireWorkspaceAdmin.mockRejectedValue({ status: 403 });

    const response = await POST(createRequest("POST", { workspaceId }));

    expect(response.status).toBe(403);
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("reutiliza la misma fila y cuenta en un segundo POST", async () => {
    mockSupabase(connection);

    const response = await POST(createRequest("POST", { workspaceId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ connection: { stripeAccountId: "acct_existing" } });
    expect(mocks.getStripe().accounts.create).not.toHaveBeenCalled();
  });

  it("crea la cuenta con controller Standard/full Dashboard sin país ni capabilities", async () => {
    mockSupabase(null, { ...connection, stripe_account_id: "acct_created" });

    await POST(createRequest("POST", { workspaceId }));

    expect(mocks.getStripe().accounts.create).toHaveBeenCalledWith({
      metadata: { workspace_id: workspaceId },
      controller: {
        fees: { payer: "account" },
        losses: { payments: "stripe" },
        requirement_collection: "stripe",
        stripe_dashboard: { type: "full" },
      },
    });
  });

  it("reconcilia una cuenta creada antes de que fallase su persistencia", async () => {
    mockSupabase(null, { ...connection, stripe_account_id: "acct_reconciled" });
    mocks.getStripe.mockReturnValue({
      accounts: {
        list: vi.fn().mockResolvedValue({ data: [{
          id: "acct_reconciled",
          metadata: { workspace_id: workspaceId },
          controller: { stripe_dashboard: { type: "full" } },
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements: { currently_due: [] },
        }] }),
        create: vi.fn(),
      },
    });

    const response = await POST(createRequest("POST", { workspaceId }));

    expect(response.status).toBe(201);
    expect(mocks.getStripe().accounts.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/stripe/connect/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({ workspaceId, userId: "user-1", role: "admin" });
  });

  it("no revela una cuenta de otro workspace", async () => {
    const { from } = mockSupabase(null);

    const response = await GET(createRequest("GET"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ connection: null });
    expect(from).toHaveBeenCalledWith("stripe_connected_accounts");
  });
});
