import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EquipoForm } from "@/components/equipos/EquipoForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote B). El schema (`createEquipoSchema`) es
 * la fuente de verdad de la validación: ver
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

vi.mock("@/hooks/useEntrenadoresLookup", () => ({
  useEntrenadoresLookup: () => ({
    data: [],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useJugadoresLookup", () => ({
  useJugadoresLookup: () => ({
    data: [],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("EquipoForm", () => {
  it("no llama a onSubmit y muestra errores cuando el formulario es inválido", async () => {
    const onSubmit = vi.fn();
    render(
      <EquipoForm open onOpenChange={vi.fn()} title="Nuevo equipo" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(await screen.findByText(/sede requerida/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <EquipoForm open onOpenChange={vi.fn()} title="Nuevo equipo" onSubmit={onSubmit} />,
    );

    // El montaje inicial agenda un `reset()` a los valores por defecto vía
    // `queueMicrotask` (mismo patrón que EntrenadorForm/JugadorForm). Se espera
    // a que se resuelva antes de escribir, igual que en una interacción real.
    await waitFor(() => {});

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Equipo Test" } });

    fireEvent.click(screen.getByRole("combobox"));
    await waitFor(() => expect(screen.getByText("Sede Central")).toBeInTheDocument());
    const sedeOption = screen.getByText("Sede Central");
    // Base UI Select solo confirma la selección por click de mouse si la opción
    // está "highlighted" (requiere hover previo); con un pointerdown de tipo
    // "touch" el commit se hace incondicionalmente, como en un tap real.
    fireEvent.pointerDown(sedeOption, { pointerType: "touch" });
    fireEvent.click(sedeOption);

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "Equipo Test",
      categoria: null,
      sedeId: "11111111-1111-4111-8111-111111111111",
      entrenadorIds: [],
      jugadorIds: [],
    });
  });
});
