import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EjercicioForm } from "@/components/ejercicios/EjercicioForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote C). El schema (`createEjercicioSchema`)
 * es la fuente de verdad de la validación: ver
 * docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

vi.mock("@/hooks/useSedesLookup", () => ({
  useSedesLookup: () => ({
    data: [{ id: "11111111-1111-4111-8111-111111111111", nombre: "Sede Central" }],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: () => ({ data: null, count: null, loading: false, errorMessage: null, refetch: vi.fn() }),
}));

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({ activeSede: null }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("EjercicioForm", () => {
  it("no llama a onSubmit y muestra un error cuando el título es inválido", async () => {
    const onSubmit = vi.fn();
    render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/título requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Ejercicio Test" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      titulo: "Ejercicio Test",
      objetivoPrincipal: null,
      numeroJugadoresMin: null,
      esGlobal: false,
      sedePropietariaId: null,
      documentoIds: [],
    });
  });
});
