export const BYTES_PER_GIB = 1_073_741_824

export type StorageUsageState = "ok" | "warning" | "limited"

export interface StorageUsageInput {
  usedBytes: number
  reservedBytes: number
  limitBytes: number
}

export interface StorageUsageCalculation {
  occupiedBytes: number
  realPercent: number | null
  percent: number
  state: StorageUsageState
}

export interface StorageCostMarginInput {
  capacityBytes: number
  monthlyPriceMinor: number
  storageCostMinorPerGibMonth: number
  originEgressGib: number
  originEgressCostMinorPerGib: number
  cachedEgressGib: number
  cachedEgressCostMinorPerGib: number
  supportCostMinor: number
  paymentCostMinor: number
  exchangeBufferMinor: number
}

export interface StorageCostMargin {
  revenueMinor: number
  estimatedCostMinor: number
  grossMarginMinor: number
  grossMarginPercent: number | null
}

function asNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

export function bytesToGib(bytes: number): number {
  return asNonNegativeInteger(bytes) / BYTES_PER_GIB
}

export function calculateStorageUsage({
  usedBytes,
  reservedBytes,
  limitBytes,
}: StorageUsageInput): StorageUsageCalculation {
  const occupiedBytes = asNonNegativeInteger(usedBytes) + asNonNegativeInteger(reservedBytes)
  const safeLimitBytes = asNonNegativeInteger(limitBytes)

  if (safeLimitBytes === 0) {
    return { occupiedBytes, realPercent: null, percent: 100, state: "limited" }
  }

  const realPercent = (occupiedBytes / safeLimitBytes) * 100
  const percent = Math.min(100, Math.max(0, realPercent))
  const state = realPercent >= 100 ? "limited" : realPercent >= 80 ? "warning" : "ok"

  return { occupiedBytes, realPercent, percent, state }
}

/**
 * Estimación administrativa en unidades monetarias menores. No es una tarifa
 * ni una promesa comercial: los precios visibles proceden del catálogo.
 */
export function calculateStorageCostMargin({
  capacityBytes,
  monthlyPriceMinor,
  storageCostMinorPerGibMonth,
  originEgressGib,
  originEgressCostMinorPerGib,
  cachedEgressGib,
  cachedEgressCostMinorPerGib,
  supportCostMinor,
  paymentCostMinor,
  exchangeBufferMinor,
}: StorageCostMarginInput): StorageCostMargin {
  const estimatedCostMinor = Math.ceil(
    bytesToGib(capacityBytes) * storageCostMinorPerGibMonth +
      originEgressGib * originEgressCostMinorPerGib +
      cachedEgressGib * cachedEgressCostMinorPerGib +
      supportCostMinor +
      paymentCostMinor +
      exchangeBufferMinor,
  )
  const revenueMinor = asNonNegativeInteger(monthlyPriceMinor)
  const grossMarginMinor = revenueMinor - estimatedCostMinor

  return {
    revenueMinor,
    estimatedCostMinor,
    grossMarginMinor,
    grossMarginPercent: revenueMinor > 0 ? (grossMarginMinor / revenueMinor) * 100 : null,
  }
}
