import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerfilForm } from "@/components/perfil/PerfilForm";

const { pendingMock, runMock, updateUserMock, uploadMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
  updateUserMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    user: {
      id: "user-1",
      email: "ana@ejemplo.es",
      user_metadata: { full_name: "Ana PÃ©rez" },
    },
  }),
}));

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: () => ({
    auth: { updateUser: updateUserMock },
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: () => ({ data: { publicUrl: "https://cdn.test/avatar.webp" } }),
      }),
    },
  }),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

describe("PerfilForm", () => {
  beforeEach(() => {
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
    updateUserMock.mockReset();
    updateUserMock.mockResolvedValue({ error: null });
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ error: null });
  });

  it("usa el lock y solo actualiza los datos personales una vez", async () => {
    const { container } = render(<PerfilForm />);
    const fullName = await screen.findByLabelText("Nombre completo");
    fireEvent.change(fullName, { target: { value: "Ana Garcia" } });
    const form = container.querySelectorAll("form")[0];
    if (!form) throw new Error("No se encontrÃ³ el formulario de perfil");

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledTimes(1));
    expect(updateUserMock).toHaveBeenCalledWith({ data: { full_name: "Ana Garcia" } });
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Perfil actualizado")).toBeInTheDocument();
  });

  it("agrupa la subida de avatar y la actualizaciÃ³n de metadata en un Ãºnico lock", async () => {
    const { container } = render(<PerfilForm />);
    const fileInput = container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("No se encontrÃ³ el control de avatar");
    }
    const file = new File(["avatar"], "avatar.webp", { type: "image/webp" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));
    expect(updateUserMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Avatar actualizado")).toBeInTheDocument();
  });

  it("deshabilita los controles editables mientras el lock global estÃ¡ pendiente", async () => {
    pendingMock.value = true;
    render(<PerfilForm />);

    expect(await screen.findByLabelText("Nombre completo")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cambiar imagen" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });
});
