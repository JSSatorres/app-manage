import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "@/app/register/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("dirige cualquier intento de registro a la lista de espera", () => {
    render(<RegisterPage />);

    expect(redirectMock).toHaveBeenCalledWith("/landing#lista-espera");
  });
});
