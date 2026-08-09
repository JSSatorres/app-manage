import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoriasEconomicas } from "@/components/economia/CategoriasEconomicas";
import type { EconomicCategory } from "@/types/economia";

const categorias: EconomicCategory[] = [
  {
    id: "ingreso-predefinida", workspaceId: "workspace-1", direction: "income", code: "CUOTAS",
    name: "Cuotas", isPredefined: true, isActive: true, createdAt: "", updatedAt: "",
  },
  {
    id: "gasto-personalizada", workspaceId: "workspace-1", direction: "expense", code: "MATERIAL",
    name: "Material", isPredefined: false, isActive: true, createdAt: "", updatedAt: "",
  },
];

describe("CategoriasEconomicas", () => {
  it("permite desactivar una categoría predefinida mediante un control accesible", async () => {
    const onSetActive = vi.fn().mockResolvedValue(undefined);

    render(
      <CategoriasEconomicas
        categorias={categorias}
        onCreate={vi.fn()}
        onSetActive={onSetActive}
        onArchive={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ingresos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gastos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Cuotas" }));

    await waitFor(() => expect(onSetActive).toHaveBeenCalledWith("ingreso-predefinida", false));
  });

  it("crea una categoría personalizada y pide confirmación antes de archivarla", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onArchive = vi.fn().mockResolvedValue(undefined);

    render(
      <CategoriasEconomicas
        categorias={categorias}
        onCreate={onCreate}
        onSetActive={vi.fn()}
        onArchive={onArchive}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre de la categoría"), { target: { value: "Patrocinios" } });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "PATROCINIOS" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir categoría" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ direction: "income", code: "PATROCINIOS", name: "Patrocinios" }));

    fireEvent.click(screen.getByRole("button", { name: "Archivar Material" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Los movimientos históricos conservarán esta categoría.");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar archivo" }));
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith("gasto-personalizada"));
  });
});
