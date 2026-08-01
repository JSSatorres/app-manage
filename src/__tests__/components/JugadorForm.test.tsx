import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JugadorForm } from "@/components/jugadores/JugadorForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote B). El schema (`createJugadorSchema`,
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

describe("JugadorForm", () => {
  it("no llama a onSubmit y muestra errores cuando el formulario es inválido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <JugadorForm open onOpenChange={vi.fn()} title="Nuevo jugador" onSubmit={onSubmit} />,
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
      <JugadorForm open onOpenChange={vi.fn()} title="Nuevo jugador" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Ana" } });
    fireEvent.click(screen.getByText("Sede Central"));
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "Ana",
      apellidos: null,
      email: null,
      telefono: null,
      fechaNacimiento: null,
      dorsal: null,
      posicion: null,
      pieDominante: null,
      notas: null,
      tutorNombre: null,
      tutorTelefono: null,
      sedeIds: ["11111111-1111-4111-8111-111111111111"],
      equipoIds: [],
    });
  });
});
