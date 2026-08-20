import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CambiarContrasenaForm } from "@/components/perfil/CambiarContrasenaForm";

const { pendingMock, runMock, updateUserMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: () => ({ auth: { updateUser: updateUserMock } }),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

describe("CambiarContrasenaForm", () => {
  beforeEach(() => {
    pendingMock.value = false;
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ error: null });
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
  });

  it("usa el lock, actualiza una vez y limpia el formulario una sola vez", async () => {
    const { container } = render(<CambiarContrasenaForm />);
    fireEvent.change(screen.getByLabelText(/Nueva contrase/), {
      target: { value: "secreto12" },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar contrase/), {
      target: { value: "secreto12" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("No se encontrÃ³ el formulario de contraseÃ±a");

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Nueva contrase/)).toHaveValue("");
    expect(screen.getByText(/actualizada/)).toBeInTheDocument();
  });

  it("deshabilita el formulario mientras el lock global estÃ¡ pendiente", () => {
    pendingMock.value = true;
    render(<CambiarContrasenaForm />);

    expect(screen.getByRole("button", { name: /Guardar contrase/ })).toBeDisabled();
  });
});
