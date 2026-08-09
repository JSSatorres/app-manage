import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSupabaseServerClient } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/services/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { requireWorkspaceAdmin } from "@/lib/apiAuth";

function createRequest(authorization?: string): Request {
  return new Request("http://localhost/api/economia", {
    headers: authorization ? { authorization } : undefined,
  });
}

function mockAuthenticatedUser(role: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: role ? { role } : null,
    error: null,
  });
  const eqUser = vi.fn(() => ({ maybeSingle }));
  const eqWorkspace = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqWorkspace }));

  getSupabaseServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({ select })),
  });
}

describe("requireWorkspaceAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 401 cuando falta bearer", async () => {
    await expect(
      requireWorkspaceAdmin(createRequest(), "workspace-1"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("responde 401 cuando el bearer es inválido", async () => {
    getSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("invalid bearer"),
        }),
      },
    });

    await expect(
      requireWorkspaceAdmin(createRequest("Bearer invalid"), "workspace-1"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("responde 403 cuando el usuario pertenece a otro workspace", async () => {
    mockAuthenticatedUser(null);

    await expect(
      requireWorkspaceAdmin(createRequest("Bearer valid"), "workspace-1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it.each(["admin", "superadmin"])(
    "devuelve el contexto confirmado para %s",
    async (role) => {
      mockAuthenticatedUser(role);

      await expect(
        requireWorkspaceAdmin(createRequest("Bearer valid"), "workspace-1"),
      ).resolves.toEqual({ userId: "user-1", workspaceId: "workspace-1", role });
    },
  );
});
