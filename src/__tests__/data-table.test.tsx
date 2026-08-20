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

  it("separa el activador de edición y las acciones de una tarjeta móvil", () => {
    const onRowClick = vi.fn();

    render(
      <DataTable
        data={[{ id: "1", nombre: "Juvenil A" }]}
        columns={[{ key: "nombre", header: "Nombre" }]}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
        mobileCard={(row) => <p>{row.nombre}</p>}
        mobileCardActions={() => <a href="/sesiones/1/ejecutar">Ejecutar</a>}
      />,
    );

    const editTrigger = screen.getByRole("button", { name: "Juvenil A" });
    const executeLink = screen.getByRole("link", { name: "Ejecutar" });

    expect(editTrigger).not.toContainElement(executeLink);

    fireEvent.click(editTrigger);
    fireEvent.keyDown(editTrigger, { key: "Enter" });
    fireEvent.click(executeLink);

    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenLastCalledWith({ id: "1", nombre: "Juvenil A" });
  });
});
