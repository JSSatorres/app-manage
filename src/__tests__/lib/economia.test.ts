import { describe, expect, it } from "vitest";
import {
  calculateOutstandingMinor,
  deriveEconomicStatus,
  formatMinorUnits,
  nextOccurrenceDate,
} from "@/lib/economia";

const entry = {
  lifecycle: "open" as const,
  amountMinor: 10000,
  currencyCode: "EUR",
  dueDate: "2026-08-08",
};

const settlement = (amountMinor: number) => ({
  movementType: "settlement" as const,
  amountMinor,
  currencyCode: "EUR",
  externalStatus: "succeeded" as const,
});

const refund = (amountMinor: number) => ({
  movementType: "refund" as const,
  amountMinor,
  currencyCode: "EUR",
  externalStatus: "succeeded" as const,
});

describe("deriveEconomicStatus", () => {
  it("deriva pending, overdue, partial y paid usando la fecha del workspace", () => {
    expect(deriveEconomicStatus(entry, [], { referenceDate: "2026-08-08" })).toBe("pending");
    expect(deriveEconomicStatus(entry, [], { referenceDate: "2026-08-09" })).toBe("overdue");
    expect(deriveEconomicStatus(entry, [settlement(4000)], { referenceDate: "2026-08-09" })).toBe("partial");
    expect(deriveEconomicStatus(entry, [settlement(10000)], { referenceDate: "2026-08-09" })).toBe("paid");
  });

  it("calcula el vencimiento en la zona horaria del workspace", () => {
    expect(
      deriveEconomicStatus(entry, [], {
        referenceDate: new Date("2026-08-08T22:30:00.000Z"),
        timezone: "Europe/Madrid",
      }),
    ).toBe("overdue");
  });

  it("deriva los reembolsos y la cancelación", () => {
    expect(deriveEconomicStatus(entry, [settlement(10000), refund(2000)])).toBe("partially_refunded");
    expect(deriveEconomicStatus(entry, [settlement(10000), refund(10000)])).toBe("refunded");
    expect(deriveEconomicStatus({ ...entry, lifecycle: "cancelled" }, [settlement(10000)])).toBe("cancelled");
  });
});

describe("calculateOutstandingMinor", () => {
  it("calcula el importe pendiente sin redondeos", () => {
    expect(calculateOutstandingMinor(entry, [settlement(4000)])).toBe(6000);
    expect(calculateOutstandingMinor(entry, [settlement(10000), refund(2500)])).toBe(2500);
  });

  it("rechaza monedas distintas, refunds superiores y sumas inseguras", () => {
    expect(() => calculateOutstandingMinor(entry, [{ ...settlement(100), currencyCode: "USD" }])).toThrow(RangeError);
    expect(() => calculateOutstandingMinor(entry, [settlement(1000), refund(1001)])).toThrow(RangeError);
    expect(() => calculateOutstandingMinor(entry, [settlement(Number.MAX_SAFE_INTEGER), settlement(1)])).toThrow(RangeError);
  });
});

describe("nextOccurrenceDate", () => {
  it("avanza la recurrencia y clampa el día 31 y el año bisiesto", () => {
    expect(nextOccurrenceDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrenceDate("2028-02-29", "yearly")).toBe("2029-02-28");
    expect(nextOccurrenceDate("2026-08-08", "weekly")).toBe("2026-08-15");
  });

  it("rechaza fechas y frecuencias no válidas", () => {
    expect(() => nextOccurrenceDate("2026-02-31", "monthly")).toThrow(RangeError);
    expect(() => nextOccurrenceDate("2026-08-08", "daily" as never)).toThrow(RangeError);
  });

  it("mantiene una clave de período ISO determinista tras el clamp mensual", () => {
    const februaryOccurrence = nextOccurrenceDate("2026-01-31", "monthly");

    expect(februaryOccurrence).toBe("2026-02-28");
    expect(nextOccurrenceDate(februaryOccurrence, "monthly")).toBe("2026-03-28");
  });
});

describe("formatMinorUnits", () => {
  it("formatea minor units sin redondear con float", () => {
    expect(formatMinorUnits(123456, "EUR", "es-ES")).toBe("1234,56 €");
  });

  it("rechaza cantidades no enteras", () => {
    expect(() => formatMinorUnits(12.5, "EUR")).toThrow(RangeError);
  });
});
