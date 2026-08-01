import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EntrenadorForm } from "@/components/entrenadores/EntrenadorForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote A). El schema (`createEntrenadorSchema`,
 * sin `workspaceId`, inyectado por el consumidor) es la fuente de verdad de
 * la validación: ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

vi.mock("@/hooks/useSedesLookup", () => ({
  useSedesLookup: () => ({
    data: [{ id: "11111111-1111-4111-8111-111111111111", nombre: "Sede Central" }],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useEquiposLookup", () => ({
  useEquiposLookup: () => ({
    data: [],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement | HTMLTextAreaElement;
}

describe("EntrenadorForm", () => {
  it("no llama a onSubmit y muestra errores cuando el formulario es inválido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <EntrenadorForm open onOpenChange={vi.fn()} title="Nuevo entrenador" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(await screen.findByText(/selecciona al menos una sede/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(baseElement).toBeTruthy();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <EntrenadorForm open onOpenChange={vi.fn()} title="Nuevo entrenador" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Carlos" } });
    fireEvent.click(screen.getByText("Sede Central"));
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "Carlos",
      apellidos: null,
      email: null,
      telefono: null,
      fechaNacimiento: null,
      titulacion: null,
      notas: null,
      sedeIds: ["11111111-1111-4111-8111-111111111111"],
      equipoIds: [],
    });
  });
});
