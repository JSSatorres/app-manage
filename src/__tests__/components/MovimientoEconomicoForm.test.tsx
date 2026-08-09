import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MovimientoEconomicoForm } from "@/components/economia/MovimientoEconomicoForm";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

const entry: EconomicEntry = {
  id: "entry-1", workspaceId: "workspace-1", entryType: "player_charge", categoryId: "cuotas", playerId: "player-1",
  concept: "Cuota de septiembre", counterpartyName: null, amountMinor: 10000, currencyCode: "EUR",
  issueDate: "2026-09-01", dueDate: "2026-09-15", scheduleId: null, periodKey: null,
  lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null,
  createdAt: "2026-08-09T10:00:00.000Z", updatedAt: "2026-08-09T10:00:00.000Z",
};

const firstSettlement: EconomicMovement = {
  id: "movement-1", workspaceId: "workspace-1", entryId: entry.id, movementType: "settlement",
  paymentMethod: "cash", amountMinor: 6000, currencyCode: "EUR", externalStatus: "succeeded",
  originalMovementId: null, externalReference: "REC-001", occurredAt: "2026-09-02", createdAt: "2026-09-02T10:00:00.000Z",
};

function fillSettlement(amount: string) {
  fireEvent.change(screen.getByLabelText(/^Importe/), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/todo/), { target: { value: "bank_transfer" } });
  fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: "2026-09-03" } });
  fireEvent.change(screen.getByLabelText(/^Referencia/), { target: { value: "TRF-002" } });
}

describe("MovimientoEconomicoForm", () => {
  it("registra un cobro parcial manual con moneda heredada y sin exceder el pendiente", async () => {
    const onSubmit = vi.fn();
    render(<MovimientoEconomicoForm entry={entry} movements={[firstSettlement]} onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Registrar cobro" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Moneda/)).toHaveValue("EUR");
    expect(screen.getByLabelText(/^Moneda/)).toHaveAttribute("readonly");

    fillSettlement("40,01");
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }));
    expect(await screen.findByText(/^El importe no puede superar 40,00/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fillSettlement("40,00");
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      entryId: entry.id,
      movementType: "settlement",
      paymentMethod: "bank_transfer",
      amountMinor: 4000,
      currencyCode: "EUR",
      externalReference: "TRF-002",
      occurredAt: "2026-09-03",
    }));
  });

  it("permite registrar el segundo parcial que completa la entrada", async () => {
    const onSubmit = vi.fn();
    render(<MovimientoEconomicoForm entry={entry} movements={[firstSettlement]} onSubmit={onSubmit} />);

    fillSettlement("40,00");
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 4000 })));
  });

  it("rotula un gasto como pago y exige movimiento original y motivo para ajustes", async () => {
    const onSubmit = vi.fn();
    render(<MovimientoEconomicoForm entry={{ ...entry, entryType: "expense" }} movements={[firstSettlement]} onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Tipo de movimiento/), { target: { value: "refund" } });
    fireEvent.change(screen.getByLabelText(/^Importe/), { target: { value: "60,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));

    expect(await screen.findByText("Selecciona el movimiento original.")).toBeInTheDocument();
    expect(screen.getByText("Indica el motivo del ajuste.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Movimiento original/), { target: { value: firstSettlement.id } });
    fireEvent.change(screen.getByLabelText(/^Importe/), { target: { value: "60,01" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));

    await waitFor(() => expect(screen.getByText(/^El importe no puede superar 60,00/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/^Importe/), { target: { value: "60,00" } });
    fireEvent.change(screen.getByLabelText(/^Motivo/), { target: { value: "DevoluciÃ³n solicitada" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar ajuste" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      movementType: "refund",
      originalMovementId: firstSettlement.id,
      externalReference: "DevoluciÃ³n solicitada",
      amountMinor: 6000,
      currencyCode: "EUR",
    })));
  });
});
