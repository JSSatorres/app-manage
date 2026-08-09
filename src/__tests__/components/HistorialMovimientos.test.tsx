import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistorialMovimientos } from "@/components/economia/HistorialMovimientos";
import type { EconomicMovement } from "@/types/economia";

const movements: EconomicMovement[] = [
  {
    id: "refund-1", workspaceId: "workspace-1", entryId: "entry-1", movementType: "refund", paymentMethod: "cash",
    amountMinor: 1500, currencyCode: "EUR", externalStatus: "succeeded", originalMovementId: "settlement-1",
    externalReference: "Duplicado", occurredAt: "2026-09-03", createdAt: "2026-09-03T10:00:00.000Z",
  },
  {
    id: "settlement-1", workspaceId: "workspace-1", entryId: "entry-1", movementType: "settlement", paymentMethod: "bank_transfer",
    amountMinor: 5000, currencyCode: "EUR", externalStatus: "succeeded", originalMovementId: null,
    externalReference: "TRF-001", occurredAt: "2026-09-01", createdAt: "2026-09-01T10:00:00.000Z",
  },
];

describe("HistorialMovimientos", () => {
  it("muestra el historial cronolÃ³gico con tipo, estado, actor y fecha manual", () => {
    render(<HistorialMovimientos movements={movements} actorNameByMovementId={{ "settlement-1": "Ana PÃ©rez" }} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("LiquidaciÃ³n");
    expect(items[0]).toHaveTextContent("Ana PÃ©rez");
    expect(items[1]).toHaveTextContent("Reembolso");
    expect(screen.getAllByText("Completado")).toHaveLength(2);
    expect(screen.getAllByText(/registrado manualmente/i)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /editar|eliminar|borrar/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmado por banco/i)).not.toBeInTheDocument();
  });
});
