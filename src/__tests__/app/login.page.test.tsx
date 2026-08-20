import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

const {
  pendingMock,
  pushMock,
  replaceMock,
  runMock,
  signInWithOAuthMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  pendingMock: { value: false },
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  runMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
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
      signInWithPassword: signInWithPasswordMock,
    },
  }),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
    signInWithOAuthMock.mockReset();
    signInWithOAuthMock.mockResolvedValue({ error: null });
    signInWithPasswordMock.mockReset();
    signInWithPasswordMock.mockResolvedValue({ error: null });
    pendingMock.value = false;
  });

  it("bloquea el doble inicio de sesiÃ³n por email y redirige una vez", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "club@ejemplo.es" },
    });
    fireEvent.change(screen.getByLabelText(/Contrase/), {
      target: { value: "secreto" },
    });
    const submit = screen.getByRole("button", { name: "Entrar" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  it("deshabilita los controles de login mientras el lock global estÃ¡ pendiente", () => {
    pendingMock.value = true;
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText(/Contrase/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continuar con Google" })).toBeDisabled();
  });

  it("conserva el error de email y no redirige si la autenticaciÃ³n falla", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Error de acceso" } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "club@ejemplo.es" },
    });
    fireEvent.change(screen.getByLabelText(/Contrase/), {
      target: { value: "secreto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Error de acceso")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("permite Google a cuentas existentes y deriva nuevas solicitudes a la waitlist", async () => {
    render(<LoginPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Continuar con Google" }),
    );
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
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(signInWithOAuthMock).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Unirme a la lista de espera" }),
    );

    expect(pushMock).toHaveBeenCalledWith("/landing#lista-espera");
  });
});
