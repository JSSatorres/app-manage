import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

const { pushMock, replaceMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: pushMock,
    replace: replaceMock,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("reserva el acceso a cuentas existentes y deriva nuevas solicitudes a la waitlist", () => {
    render(<LoginPage />);

    expect(
      screen.queryByRole("button", { name: "Continuar con Google" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Unirme a la lista de espera" }),
    );

    expect(pushMock).toHaveBeenCalledWith("/landing#lista-espera");
  });
});
