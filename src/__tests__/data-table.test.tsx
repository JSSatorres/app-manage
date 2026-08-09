import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/shared/DataTable";

describe("DataTable", () => {
  it("expone la tabla, ordena las filas y conserva la acción de cada registro", () => {
    const onRowClick = vi.fn();

    render(
      <DataTable
        data={[
          { id: "1", nombre: "Zaragoza" },
          { id: "2", nombre: "Alcorcón" },
        ]}
        columns={[{ key: "nombre", header: "Nombre", sortable: true }]}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );

    expect(screen.getByRole("table", { name: "Resultados" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /nombre/i }));
    expect(screen.getAllByRole("cell")[0]).toHaveTextContent("Alcorcón");

    fireEvent.click(screen.getByText("Zaragoza"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "1", nombre: "Zaragoza" });
  });
});
