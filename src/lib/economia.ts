import type {
  EconomicEntryLifecycle,
  EconomicExternalStatus,
  EconomicMovementType,
  EconomicScheduleFrequency,
  EconomicStatus,
} from "@/types/economia";

const maxSafeInteger = Number.MAX_SAFE_INTEGER;

type EconomicStatusEntry = {
  lifecycle: EconomicEntryLifecycle;
  amountMinor: number;
  currencyCode: string;
  dueDate: string;
};

type EconomicStatusMovement = {
  movementType: EconomicMovementType;
  amountMinor: number;
  currencyCode: string;
  externalStatus: EconomicExternalStatus;
};

export interface EconomicStatusOptions {
  referenceDate?: Date | string;
  timezone?: string;
}

export function deriveEconomicStatus(
  entry: EconomicStatusEntry,
  movements: readonly EconomicStatusMovement[],
  options: EconomicStatusOptions = {},
): EconomicStatus {
  if (entry.lifecycle === "cancelled") {
    return "cancelled";
  }

  const balance = calculateEconomicBalance(entry, movements);
  if (balance.adjustmentsMinor > 0) {
    return balance.netSettledMinor === 0 ? "refunded" : "partially_refunded";
  }
  if (balance.netSettledMinor >= entry.amountMinor) {
    return "paid";
  }
  if (balance.netSettledMinor > 0) {
    return "partial";
  }

  const workspaceDate = resolveWorkspaceDate(options.referenceDate, options.timezone);
  return entry.dueDate < workspaceDate ? "overdue" : "pending";
}

export function calculateOutstandingMinor(
  entry: Pick<EconomicStatusEntry, "amountMinor" | "currencyCode">,
  movements: readonly EconomicStatusMovement[],
): number {
  const balance = calculateEconomicBalance(entry, movements);
  return balance.netSettledMinor >= entry.amountMinor ? 0 : entry.amountMinor - balance.netSettledMinor;
}

export function nextOccurrenceDate(date: string, frequency: EconomicScheduleFrequency): string {
  const current = parseCalendarDate(date);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  if (frequency === "weekly") {
    current.setUTCDate(day + 7);
    return formatCalendarDate(current);
  }

  if (frequency === "monthly") {
    const targetYear = year + Math.floor((month + 1) / 12);
    const targetMonth = (month + 1) % 12;
    return formatCalendarDate(createClampedDate(targetYear, targetMonth, day));
  }

  if (frequency === "yearly") {
    return formatCalendarDate(createClampedDate(year + 1, month, day));
  }

  throw new RangeError("La frecuencia económica no es válida.");
}

export function formatMinorUnits(amountMinor: number, currencyCode: string, locale = "es-ES"): string {
  assertSafeMinorAmount(amountMinor, "El importe a formatear");
  assertCurrencyCode(currencyCode);

  let fractionDigits: number | undefined;
  try {
    fractionDigits = new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new RangeError("La moneda o la configuración regional no son válidas.");
  }
  if (fractionDigits === undefined) {
    throw new RangeError("No se pudo determinar la precisión de la moneda.");
  }

  const divisor = 10 ** fractionDigits;
  const integerAmount = Math.floor(amountMinor / divisor);
  const fractionAmount = amountMinor % divisor;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const parts = formatter.formatToParts(integerAmount);

  if (fractionDigits === 0) {
    return parts.map((part) => part.value).join("");
  }

  const decimalSeparator = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 })
    .formatToParts(1)
    .find((part) => part.type === "decimal")?.value;
  if (!decimalSeparator) {
    throw new RangeError("No se pudo determinar el separador decimal.");
  }

  const lastIntegerPart = parts.map((part) => part.type).lastIndexOf("integer");
  const fraction = String(fractionAmount).padStart(fractionDigits, "0");
  return parts
    .flatMap((part, index) =>
      index === lastIntegerPart
        ? [part.value, decimalSeparator, fraction]
        : [part.value],
    )
    .join("");
}

function calculateEconomicBalance(
  entry: Pick<EconomicStatusEntry, "amountMinor" | "currencyCode">,
  movements: readonly EconomicStatusMovement[],
): { adjustmentsMinor: number; netSettledMinor: number } {
  assertSafeMinorAmount(entry.amountMinor, "El importe de la entrada");
  assertCurrencyCode(entry.currencyCode);

  let settledMinor = 0;
  let adjustmentsMinor = 0;

  for (const movement of movements) {
    assertSafeMinorAmount(movement.amountMinor, "El importe del movimiento");
    assertCurrencyCode(movement.currencyCode);
    if (movement.currencyCode !== entry.currencyCode) {
      throw new RangeError("La moneda del movimiento debe coincidir con la entrada.");
    }
    if (movement.externalStatus !== "succeeded") {
      continue;
    }

    if (movement.movementType === "settlement") {
      settledMinor = safeAdd(settledMinor, movement.amountMinor);
      continue;
    }
    adjustmentsMinor = safeAdd(adjustmentsMinor, movement.amountMinor);
  }

  if (adjustmentsMinor > settledMinor) {
    throw new RangeError("Los reembolsos y reversiones no pueden superar lo liquidado.");
  }

  return { adjustmentsMinor, netSettledMinor: settledMinor - adjustmentsMinor };
}

function resolveWorkspaceDate(referenceDate: Date | string | undefined, timezone = "Europe/Madrid"): string {
  if (typeof referenceDate === "string") {
    parseCalendarDate(referenceDate);
    return referenceDate;
  }

  const instant = referenceDate ?? new Date();
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError("La fecha de referencia no es válida.");
  }

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
  } catch {
    throw new RangeError("La zona horaria del workspace no es válida.");
  }

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new RangeError("No se pudo calcular la fecha del workspace.");
  }
  return `${year}-${month}-${day}`;
}

function createClampedDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("La fecha debe tener formato AAAA-MM-DD.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("La fecha del calendario no es válida.");
  }
  return date;
}

function formatCalendarDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function assertSafeMinorAmount(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} debe ser un entero seguro no negativo.`);
  }
}

function assertCurrencyCode(value: string): void {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new RangeError("La moneda debe ser un código ISO en mayúsculas.");
  }
}

function safeAdd(left: number, right: number): number {
  if (left > maxSafeInteger - right) {
    throw new RangeError("La suma de importes supera el máximo seguro.");
  }
  return left + right;
}
