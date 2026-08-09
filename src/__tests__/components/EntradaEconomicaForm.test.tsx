import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EntradaEconomicaForm } from "@/components/economia/EntradaEconomicaForm";
import { EntradaEconomicaDialog } from "@/components/economia/EntradaEconomicaDialog";
import type { EconomicCategory, EconomicEntry } from "@/types/economia";

const incomeCategory: EconomicCategory = {
  id: "income-category",
  workspaceId: "workspace-1",
  direction: "income",
  code: "CUOTAS",
  name: "Cuotas de jugadores",
  isPredefined: true,
  isActive: true,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

const expenseCategory: EconomicCategory = {
  ...incomeCategory,
  id: "expense-category",
  direction: "expense",
  code: "MATERIAL",
  name: "Material",
};

const inactiveIncomeCategory: EconomicCategory = {
  ...incomeCategory,
  id: "inactive-income-category",
  isActive: false,
};

const players = [{ id: "player-1", label: "Marta López" }];

const entry: EconomicEntry = {
  id: "entry-1",
  workspaceId: "workspace-1",
  entryType: "player_charge",
  categoryId: incomeCategory.id,
  playerId: "player-1",
  concept: "Cuota de septiembre",
  counterpartyName: null,
  amountMinor: 1250,
  currencyCode: "EUR",
  issueDate: "2026-09-01",
  dueDate: "2026-09-15",
  scheduleId: null,
  periodKey: null,
  lifecycle: "open",
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

function fillCommonFields() {
  fireEvent.change(screen.getByLabelText(/concepto/i), { target: { value: "Cuota de septiembre" } });
  fireEvent.change(screen.getByLabelText(/importe/i), { target: { value: "12,50" } });
  fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: "eur" } });
  fireEvent.change(screen.getByLabelText(/vencimiento/i), { target: { value: "2026-09-15" } });
}

describe("EntradaEconomicaForm", () => {
  it("exige jugador, categoría de ingreso activa, concepto, importe, moneda y vencimiento para un cargo", async () => {
    const onSubmit = vi.fn();
    render(
      <EntradaEconomicaForm
        categories={[incomeCategory, inactiveIncomeCategory]}
        players={players}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/moneda/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar entrada/i }));

    expect(await screen.findByText("Selecciona un jugador.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona una categoría de ingreso activa.")).toBeInTheDocument();
    expect(screen.getByText("El concepto es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("Indica un importe válido.")).toBeInTheDocument();
    expect(screen.getByText("Indica una moneda ISO de tres letras.")).toBeInTheDocument();
    expect(screen.getByText("El vencimiento es obligatorio.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("entrega un cargo en minor units", async () => {
    const onSubmit = vi.fn();
    render(<EntradaEconomicaForm categories={[incomeCategory]} players={players} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/jugador/i), { target: { value: "player-1" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: incomeCategory.id } });
    fillCommonFields();
    fireEvent.click(screen.getByRole("button", { name: /guardar entrada/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      entryType: "player_charge",
      categoryId: incomeCategory.id,
      playerId: "player-1",
      concept: "Cuota de septiembre",
      counterpartyName: null,
      amountMinor: 1250,
      currencyCode: "EUR",
      issueDate: expect.any(String),
      dueDate: "2026-09-15",
    });
  });

  it("permite un ingreso sin jugador", async () => {
    const onSubmit = vi.fn();
    render(<EntradaEconomicaForm categories={[incomeCategory]} players={players} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: "income" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: incomeCategory.id } });
    fillCommonFields();
    fireEvent.click(screen.getByRole("button", { name: /guardar entrada/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryType: "income",
      playerId: null,
      categoryId: incomeCategory.id,
    })));
  });

  it("exige categoría de gasto y proveedor libre para un gasto", async () => {
    const onSubmit = vi.fn();
    render(<EntradaEconomicaForm categories={[incomeCategory, expenseCategory]} players={players} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/tipo/i), { target: { value: "expense" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: expenseCategory.id } });
    fillCommonFields();
    fireEvent.click(screen.getByRole("button", { name: /guardar entrada/i }));

    expect(await screen.findByText("El proveedor o contraparte es obligatorio.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/proveedor o contraparte/i), { target: { value: "Papelería Central" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar entrada/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      entryType: "expense",
      categoryId: expenseCategory.id,
      counterpartyName: "Papelería Central",
    })));
  });

  it("pide confirmación y motivo antes de cancelar una entrada", async () => {
    const onCancel = vi.fn();
    render(
      <EntradaEconomicaDialog
        open
        onOpenChange={vi.fn()}
        entry={entry}
        categories={[incomeCategory]}
        players={players}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cancelar entrada/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar cancelación/i }));
    expect(await screen.findByText("Indica el motivo de la cancelación.")).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/motivo de la cancelación/i), { target: { value: "Cuota duplicada" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cancelación/i }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(entry.id, "Cuota duplicada"));
    expect(screen.getByText("Entrada cancelada correctamente.")).toBeInTheDocument();
  });
});
