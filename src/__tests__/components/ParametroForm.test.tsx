import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ParametroForm } from "@/components/parametros/ParametroForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote D). El schema (`createParametroSchema`,
 * campos `nombre`/`activo`; `categoria`/`sedeId` los inyecta el consumidor)
 * es la fuente de verdad de la validación: ver
 * docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("ParametroForm", () => {
  it("no llama a onSubmit y muestra un error cuando el nombre está vacío", async () => {
    const onSubmit = vi.fn();
    render(
      <ParametroForm open onOpenChange={vi.fn()} title="Nuevo parámetro" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <ParametroForm open onOpenChange={vi.fn()} title="Nuevo parámetro" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Material" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Material", activo: true });
  });

  it("precarga los valores al editar y permite desactivar el switch", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <ParametroForm
        open
        onOpenChange={vi.fn()}
        title="Editar parámetro"
        initialValue={{
          id: "11111111-1111-4111-8111-111111111111",
          categoria: "material",
          nombre: "Balones",
          activo: true,
          sedeId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        }}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => expect(getField(baseElement, "nombre")).toHaveValue("Balones"));

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Balones", activo: false });
  });
});
