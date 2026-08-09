import { describe, expect, it } from "vitest";
import { economicEntrySchema } from "@/schemas/economia.schema";

const baseEntry = {
  categoryId: "8e1d2619-1f59-4f97-9fd2-f17938ff4024",
  concept: "Cuota de septiembre",
  amountMinor: 5000,
  currencyCode: "EUR",
  issueDate: "2026-09-01",
  dueDate: "2026-09-05",
};

describe("economicEntrySchema", () => {
  it("acepta importes enteros positivos y moneda ISO en mayúsculas", () => {
    expect(
      economicEntrySchema.parse({
        ...baseEntry,
        entryType: "player_charge",
        playerId: "d5e1f2a4-7618-4e38-895f-42c60e66fb61",
      }),
    ).toMatchObject({ amountMinor: 5000, currencyCode: "EUR" });
  });

  it.each([0, -1, 12.5, Number.MAX_SAFE_INTEGER + 1])(
    "rechaza amountMinor no entero y positivo: %s",
    (amountMinor) => {
      expect(
        economicEntrySchema.safeParse({
          ...baseEntry,
          amountMinor,
          entryType: "player_charge",
          playerId: "d5e1f2a4-7618-4e38-895f-42c60e66fb61",
        }).success,
      ).toBe(false);
    },
  );

  it.each(["eur", "EURO", "EU1"])("rechaza moneda no ISO en mayúsculas: %s", (currencyCode) => {
    expect(
      economicEntrySchema.safeParse({
        ...baseEntry,
        currencyCode,
        entryType: "player_charge",
        playerId: "d5e1f2a4-7618-4e38-895f-42c60e66fb61",
      }).success,
    ).toBe(false);
  });

  it("exige jugador en un cargo a jugador", () => {
    expect(
      economicEntrySchema.safeParse({ ...baseEntry, entryType: "player_charge" }).success,
    ).toBe(false);
  });

  it("acepta ingresos sin jugador ni contraparte", () => {
    expect(economicEntrySchema.safeParse({ ...baseEntry, entryType: "income" }).success).toBe(true);
  });

  it("acepta ingresos asociados a un jugador", () => {
    expect(
      economicEntrySchema.safeParse({
        ...baseEntry,
        entryType: "income",
        playerId: "d5e1f2a4-7618-4e38-895f-42c60e66fb61",
      }).success,
    ).toBe(true);
  });

  it("exige contraparte y rechaza jugador en un gasto", () => {
    expect(
      economicEntrySchema.safeParse({
        ...baseEntry,
        entryType: "expense",
        counterpartyName: "Proveedor",
        playerId: "d5e1f2a4-7618-4e38-895f-42c60e66fb61",
      }).success,
    ).toBe(false);
    expect(economicEntrySchema.safeParse({ ...baseEntry, entryType: "expense" }).success).toBe(false);
  });
});
