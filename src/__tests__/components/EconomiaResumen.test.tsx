import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EconomiaResumen } from "@/components/economia/EconomiaResumen";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

const entries: EconomicEntry[] = [
  {
    id: "cuota-1", workspaceId: "workspace-1", entryType: "player_charge", categoryId: "cuotas", playerId: "jugador-1",
    concept: "Cuota de agosto", counterpartyName: null, amountMinor: 10000, currencyCode: "EUR",
    issueDate: "2026-08-01", dueDate: "2026-08-05", scheduleId: null, periodKey: "2026-08",
    lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null,
    createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "gasto-1", workspaceId: "workspace-1", entryType: "expense", categoryId: "material", playerId: null,
    concept: "Material", counterpartyName: "Proveedor", amountMinor: 4000, currencyCode: "EUR",
    issueDate: "2026-08-01", dueDate: "2026-08-31", scheduleId: null, periodKey: "2026-08",
    lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null,
    createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "ingreso-1", workspaceId: "workspace-1", entryType: "income", categoryId: "actividades", playerId: null,
    concept: "Campus", counterpartyName: null, amountMinor: 2000, currencyCode: "EUR",
    issueDate: "2026-08-01", dueDate: "2026-08-05", scheduleId: null, periodKey: "2026-08",
    lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null,
    createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z",
  },
];

const movementsByEntry: Record<string, EconomicMovement[]> = {
  "cuota-1": [{
    id: "movimiento-1", workspaceId: "workspace-1", entryId: "cuota-1", movementType: "settlement",
    paymentMethod: "cash", amountMinor: 6000, currencyCode: "EUR", externalStatus: "succeeded",
    originalMovementId: null, externalReference: null, occurredAt: "2026-08-03T00:00:00Z", createdAt: "2026-08-03T00:00:00Z",
  }],
  "gasto-1": [{
    id: "movimiento-2", workspaceId: "workspace-1", entryId: "gasto-1", movementType: "settlement",
    paymentMethod: "cash", amountMinor: 4000, currencyCode: "EUR", externalStatus: "succeeded",
    originalMovementId: null, externalReference: null, occurredAt: "2026-08-03T00:00:00Z", createdAt: "2026-08-03T00:00:00Z",
  }],
};

describe("EconomiaResumen", () => {
  it("muestra previstos, reales, pendiente, vencido y balance para el período activo", () => {
    render(
      <EconomiaResumen
        entries={entries}
        movementsByEntry={movementsByEntry}
        periodLabel="Agosto de 2026"
        referenceDate="2026-08-08"
      />,
    );

    expect(screen.getByRole("heading", { name: "Previstos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reales" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pendiente" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vencido" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Balance" })).toBeInTheDocument();
    expect(screen.getByText("Período: Agosto de 2026")).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Previstos" }).closest("article")!).getByText(/160,00\s€/)).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Vencido" }).closest("article")!).getByText(/20,00\s€/)).toBeInTheDocument();
    expect(within(screen.getByRole("heading", { name: "Pendiente" }).closest("article")!).getByText(/60,00\s€/)).toBeInTheDocument();
  });

  it("no presenta el balance como saldo bancario", () => {
    render(<EconomiaResumen entries={entries} movementsByEntry={movementsByEntry} periodLabel="Agosto de 2026" />);

    expect(screen.queryByText(/saldo bancario/i)).not.toBeInTheDocument();
  });
});
