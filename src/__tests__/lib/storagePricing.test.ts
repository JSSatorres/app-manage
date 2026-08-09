import { describe, expect, it } from "vitest"
import {
  BYTES_PER_GIB,
  bytesToGib,
  calculateStorageCostMargin,
  calculateStorageUsage,
} from "@/lib/storagePricing"

describe("storagePricing", () => {
  it("convierte bytes a GiB binarios sin redondear el valor de diagnóstico", () => {
    expect(bytesToGib(BYTES_PER_GIB)).toBe(1)
    expect(bytesToGib(BYTES_PER_GIB * 10)).toBe(10)
  })

  it.each([
    [7_999, 79.99, 79.99, "ok"],
    [8_000, 80, 80, "warning"],
    [9_999, 99.99, 99.99, "warning"],
    [10_000, 100, 100, "limited"],
    [12_500, 125, 100, "limited"],
  ] as const)(
    "clasifica %i bytes usados sobre 10.000 como %s",
    (usedBytes, realPercent, percent, state) => {
      const usage = calculateStorageUsage({ usedBytes, reservedBytes: 0, limitBytes: 10_000 })

      expect(usage.realPercent).toBeCloseTo(realPercent)
      expect(usage.percent).toBeCloseTo(percent)
      expect(usage.state).toBe(state)
    },
  )

  it("incluye las reservas activas en la cuota", () => {
    expect(calculateStorageUsage({ usedBytes: 7_900, reservedBytes: 100, limitBytes: 10_000 }))
      .toMatchObject({ occupiedBytes: 8_000, realPercent: 80, percent: 80, state: "warning" })
  })

  it("limita la visualización cuando no hay cuota contratada", () => {
    expect(calculateStorageUsage({ usedBytes: 0, reservedBytes: 0, limitBytes: 0 }))
      .toEqual({ occupiedBytes: 0, realPercent: null, percent: 100, state: "limited" })
  })

  it("mantiene cálculos con enteros de bytes grandes", () => {
    const limitBytes = Number.MAX_SAFE_INTEGER - 1
    const usage = calculateStorageUsage({
      usedBytes: limitBytes - 1,
      reservedBytes: 1,
      limitBytes,
    })

    expect(usage.occupiedBytes).toBe(limitBytes)
    expect(usage.state).toBe("limited")
    expect(usage.percent).toBe(100)
  })

  it("calcula el margen administrativo a partir de la capacidad y tarifa del catálogo", () => {
    expect(calculateStorageCostMargin({
      capacityBytes: BYTES_PER_GIB * 10,
      monthlyPriceMinor: 300,
      storageCostMinorPerGibMonth: 11,
      originEgressGib: 10,
      originEgressCostMinorPerGib: 9,
      cachedEgressGib: 0,
      cachedEgressCostMinorPerGib: 3,
      supportCostMinor: 20,
      paymentCostMinor: 10,
      exchangeBufferMinor: 5,
    })).toEqual({
      revenueMinor: 300,
      estimatedCostMinor: 235,
      grossMarginMinor: 65,
      grossMarginPercent: 21.666666666666668,
    })
  })
})
