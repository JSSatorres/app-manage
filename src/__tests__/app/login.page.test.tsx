import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

const { pushMock, replaceMock, signInWithOAuthMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signInWithPassword: vi.fn(),
    },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    signInWithOAuthMock.mockReset();
    signInWithOAuthMock.mockResolvedValue({ error: null });
  });

  it("permite Google a cuentas existentes y deriva nuevas solicitudes a la waitlist", async () => {
    render(<LoginPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Continuar con Google" }),
    );

    await waitFor(() =>
      expect(signInWithOAuthMock).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        },
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Unirme a la lista de espera" }),
    );

    expect(pushMock).toHaveBeenCalledWith("/landing#lista-espera");
  });
});
