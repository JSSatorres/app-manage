import { describe, expect, it } from "vitest";
import { buildEconomicCsv, buildEconomicCsvFilename } from "@/lib/economiaCsv";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

const entry: EconomicEntry = {
  id: "entry-1",
  workspaceId: "workspace-1",
  entryType: "player_charge",
  categoryId: "category-1",
  playerId: "player-1",
  concept: '=HYPERLINK("https://example.test")',
  counterpartyName: null,
  amountMinor: 12345,
  currencyCode: "EUR",
  issueDate: "2026-09-01",
  dueDate: "2026-09-15",
  scheduleId: null,
  periodKey: "2026-09",
  lifecycle: "open",
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

const movements: EconomicMovement[] = [{
  id: "movement-1",
  workspaceId: "workspace-1",
  entryId: "entry-1",
  movementType: "settlement",
  paymentMethod: "cash",
  amountMinor: 4500,
  currencyCode: "EUR",
  externalStatus: "succeeded",
  originalMovementId: null,
  externalReference: "private-reference",
  occurredAt: "2026-09-02T10:00:00.000Z",
  createdAt: "2026-09-02T10:00:00.000Z",
}];

describe("buildEconomicCsv", () => {
  it("genera un CSV RFC4180 con BOM, saldo derivado y valores seguros para Excel", () => {
    const csv = buildEconomicCsv([entry], { [entry.id]: movements });

    expect(csv).toBe(
      '\uFEFF"Tipo","Concepto","Importe","Moneda","Fecha","Estado","Pagador o contraparte","Saldo pendiente"\r\n"Cargo","\'=HYPERLINK(""https://example.test"")","123,45","EUR","2026-09-15","Parcial","Jugador","78,45"\r\n',
    );
    expect(csv).not.toContain("entry-1");
    expect(csv).not.toContain("private-reference");
  });

  it("compone un nombre de archivo con período y workspace no personal", () => {
    expect(buildEconomicCsvFilename({ period: "2026-09", workspaceId: "workspace-123456" }))
      .toBe("economia-workspace-123456-2026-09.csv");
  });
});
