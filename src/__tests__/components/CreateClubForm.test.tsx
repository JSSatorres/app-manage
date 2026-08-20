import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateClubForm } from "@/components/onboarding/CreateClubForm";

const { pendingMock, refreshMock, rpcMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  refreshMock: vi.fn(),
  rpcMock: vi.fn(),
  runMock: vi.fn(),
}));

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({ refresh: refreshMock }),
}));

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: () => ({ rpc: rpcMock }),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

describe("CreateClubForm", () => {
  beforeEach(() => {
    pendingMock.value = false;
    refreshMock.mockReset();
    refreshMock.mockResolvedValue(undefined);
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ error: null });
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
  });

  it("usa el lock y solo crea un club ante dos submits en el mismo tick", async () => {
    const { container } = render(<CreateClubForm />);
    fireEvent.change(screen.getByLabelText("Nombre del club"), {
      target: { value: "Club Norte" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("No se encontrÃ³ el formulario de creaciÃ³n");

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("deshabilita la creaciÃ³n mientras el lock global estÃ¡ pendiente", () => {
    pendingMock.value = true;
    render(<CreateClubForm />);

    expect(screen.getByRole("button", { name: "Crear mi club" })).toBeDisabled();
  });
});
