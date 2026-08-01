import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SedeForm } from "@/components/sedes/SedeForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote A). El schema (`createSedeSchema`, sin
 * `workspace_id`/`responsable_id`, que no gestiona este form) es la fuente de
 * verdad de la validación.
 */

vi.mock("@/hooks/useQuery", () => ({
  useQuery: () => ({ data: null, count: null, loading: false, errorMessage: null, refetch: vi.fn() }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("SedeForm", () => {
  it("no llama a onSubmit y muestra un error cuando el nombre está vacío", async () => {
    const onSubmit = vi.fn();
    render(
      <SedeForm open onOpenChange={vi.fn()} title="Nueva sede" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <SedeForm open onOpenChange={vi.fn()} title="Nueva sede" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede Test" } });
    fireEvent.change(getField(baseElement, "direccion"), { target: { value: "Calle Falsa 123" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Sede Test", direccion: "Calle Falsa 123" });
  });
});
