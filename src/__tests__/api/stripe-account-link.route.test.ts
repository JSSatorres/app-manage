import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireWorkspaceAdmin: vi.fn(),
  getSupabaseServiceClient: vi.fn(),
  getStripe: vi.fn(),
  getServerEnv: vi.fn(),
}));

vi.mock("@/lib/apiAuth", () => ({ requireWorkspaceAdmin: mocks.requireWorkspaceAdmin }));
vi.mock("@/services/supabase-server", () => ({ getSupabaseServiceClient: mocks.getSupabaseServiceClient }));
vi.mock("@/lib/stripe", () => ({ getStripe: mocks.getStripe }));
vi.mock("@/lib/serverEnv", () => ({ getServerEnv: mocks.getServerEnv }));

import { POST } from "@/app/api/stripe/connect/account-link/route";

const workspaceId = "workspace-1";

function request() {
  return new Request("http://localhost/api/stripe/connect/account-link", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify({ workspaceId }),
  });
}

describe("POST /api/stripe/connect/account-link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({ workspaceId, userId: "user-1", role: "admin" });
    const maybeSingle = vi.fn().mockResolvedValue({ data: { stripe_account_id: "acct_workspace" }, error: null });
    mocks.getSupabaseServiceClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    });
    mocks.getServerEnv.mockReturnValue({ appUrl: "https://app.example" });
    mocks.getStripe.mockReturnValue({ accountLinks: { create: vi.fn().mockResolvedValue({ url: "https://connect.stripe.test/onboarding" }) } });
  });

  it("genera onboarding alojado para la cuenta del workspace y no persiste la URL", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "https://connect.stripe.test/onboarding" });
    expect(mocks.getStripe().accountLinks.create).toHaveBeenCalledWith({
      account: "acct_workspace",
      type: "account_onboarding",
      refresh_url: "https://app.example/economia?stripe=onboarding-refresh",
      return_url: "https://app.example/economia?stripe=onboarding-return",
    });
  });

  it("rechaza un workspace sin connected account", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mocks.getSupabaseServiceClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    });

    const response = await POST(request());

    expect(response.status).toBe(404);
    expect(mocks.getStripe().accountLinks.create).not.toHaveBeenCalled();
  });
});
