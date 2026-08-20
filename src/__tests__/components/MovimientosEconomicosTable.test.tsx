import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MovimientosEconomicosTable } from "@/components/economia/MovimientosEconomicosTable";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { access_token: "token" } }) }));

const { pendingMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

const entry: EconomicEntry = {
  id: "cuota-1", workspaceId: "workspace-1", entryType: "player_charge", categoryId: "cuotas", playerId: "jugador-1",
  concept: "Cuota de agosto", counterpartyName: null, amountMinor: 10000, currencyCode: "EUR",
  issueDate: "2026-08-01", dueDate: "2026-08-05", scheduleId: null, periodKey: "2026-08",
  lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null,
  createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
};

const movementsByEntry: Record<string, EconomicMovement[]> = {
  "cuota-1": [{
    id: "movimiento-1", workspaceId: "workspace-1", entryId: "cuota-1", movementType: "settlement",
    paymentMethod: "cash", amountMinor: 6000, currencyCode: "EUR", externalStatus: "succeeded",
    originalMovementId: null, externalReference: null, occurredAt: "2026-08-03T00:00:00Z", createdAt: "2026-08-03T00:00:00Z",
  }],
};

describe("MovimientosEconomicosTable", () => {
  it("lista la entrada con jugador, concepto, vencimiento e importes derivados", () => {
    render(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={movementsByEntry}
        playerNameById={{ "jugador-1": "Ana Pérez" }}
        referenceDate="2026-08-08"
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Jugador / entrada" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Vencimiento" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Pérez")).not.toHaveLength(0);
    expect(screen.getAllByText("Cuota de agosto")).not.toHaveLength(0);
    expect(screen.getAllByText((_, element) => element?.textContent === "100,00 €")).not.toHaveLength(0);
    expect(screen.getAllByText((_, element) => element?.textContent === "60,00 €")).not.toHaveLength(0);
    expect(screen.getAllByText((_, element) => element?.textContent === "40,00 €")).not.toHaveLength(0);
    expect(screen.getAllByText("Parcial")).not.toHaveLength(0);
  });

  it("expone una acción accesible por entry", () => {
    const onViewEntry = vi.fn();
    render(<MovimientosEconomicosTable entries={[entry]} movementsByEntry={movementsByEntry} onViewEntry={onViewEntry} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Ver detalle de Cuota de agosto" })[0]);

    expect(onViewEntry).toHaveBeenCalledWith(expect.objectContaining({ id: entry.id }));
  });

  it("ofrece el enlace de Stripe solo para cargos abiertos con saldo pendiente y cuenta activa", () => {
    const { rerender } = render(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={movementsByEntry}
        workspaceId="workspace-1"
        stripeAccountActive
      />,
    );

    expect(screen.getAllByRole("button", { name: "Generar enlace de pago" })).not.toHaveLength(0);

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={movementsByEntry}
        workspaceId="workspace-1"
        stripeAccountActive={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[{ ...entry, entryType: "income" }]}
        movementsByEntry={movementsByEntry}
        workspaceId="workspace-1"
        stripeAccountActive
      />,
    );
    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[{ ...entry, entryType: "expense" }]}
        movementsByEntry={movementsByEntry}
        workspaceId="workspace-1"
        stripeAccountActive
      />,
    );
    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{ ...movementsByEntry, [entry.id]: [{ ...movementsByEntry[entry.id][0], amountMinor: entry.amountMinor }] }}
        workspaceId="workspace-1"
        stripeAccountActive
      />,
    );
    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[{ ...entry, lifecycle: "cancelled" }]}
        movementsByEntry={movementsByEntry}
        workspaceId="workspace-1"
        stripeAccountActive
      />,
    );
    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();
  });

  it("no ofrece el enlace de Stripe sin un workspace activo", () => {
    render(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={movementsByEntry}
        stripeAccountActive
      />,
    );

    expect(screen.queryByRole("button", { name: "Generar enlace de pago" })).not.toBeInTheDocument();
  });

  it("ofrece el reembolso solo para liquidaciones Stripe confirmadas y con saldo reembolsable", () => {
    const stripeSettlement: EconomicMovement = {
      ...movementsByEntry[entry.id][0],
      id: "stripe-settlement-1",
      paymentMethod: "stripe",
      amountMinor: 6000,
      externalReference: "stripe:pi_123",
    };
    const { rerender } = render(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{ [entry.id]: [stripeSettlement] }}
        workspaceId="workspace-1"
      />,
    );

    const refundButtons = screen.getAllByRole("button", { name: /reembolsar cobro Stripe de 60,00/i });
    expect(refundButtons).not.toHaveLength(0);
    fireEvent.click(refundButtons[0]);
    expect(screen.getByRole("heading", { name: "Reembolsar cobro Stripe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/importe a reembolsar/i)).toHaveValue(6000);

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{ [entry.id]: [{ ...stripeSettlement, paymentMethod: "cash" }] }}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole("button", { name: /reembolsar cobro Stripe/i })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{ [entry.id]: [{ ...stripeSettlement, paymentMethod: "other" }] }}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole("button", { name: /reembolsar cobro Stripe/i })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{ [entry.id]: [{ ...stripeSettlement, externalStatus: "failed" }] }}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole("button", { name: /reembolsar cobro Stripe/i })).not.toBeInTheDocument();

    rerender(
      <MovimientosEconomicosTable
        entries={[entry]}
        movementsByEntry={{
          [entry.id]: [
            stripeSettlement,
            {
              ...stripeSettlement,
              id: "refund-1",
              movementType: "refund",
              amountMinor: 6000,
              originalMovementId: stripeSettlement.id,
            },
          ],
        }}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole("button", { name: /reembolsar cobro Stripe/i })).not.toBeInTheDocument();
  });

  it("distingue la ausencia de datos de la ausencia de resultados y permite reintentar un error", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<MovimientosEconomicosTable entries={[]} movementsByEntry={{}} />);
    expect(screen.getByRole("heading", { name: "No hay movimientos económicos todavía" })).toBeInTheDocument();

    rerender(<MovimientosEconomicosTable entries={[]} movementsByEntry={{}} hasActiveFilters />);
    expect(screen.getByRole("heading", { name: "No hay resultados para estos filtros" })).toBeInTheDocument();

    rerender(<MovimientosEconomicosTable entries={[]} movementsByEntry={{}} error="No se pudo cargar" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
