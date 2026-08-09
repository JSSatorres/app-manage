import { calculateOutstandingMinor, deriveEconomicStatus } from "@/lib/economia";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

const csvHeaders = [
  "Tipo",
  "Concepto",
  "Importe",
  "Moneda",
  "Fecha",
  "Estado",
  "Pagador o contraparte",
  "Saldo pendiente",
] as const;

const entryTypeLabels = {
  player_charge: "Cargo",
  income: "Ingreso",
  expense: "Gasto",
} as const;

const statusLabels = {
  pending: "Pendiente",
  overdue: "Vencido",
  partial: "Parcial",
  paid: "Pagado",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
} as const;

export type EconomicMovementsByEntry = Readonly<Record<string, readonly EconomicMovement[]>>;

export function buildEconomicCsv(
  entries: readonly EconomicEntry[],
  movementsByEntry: EconomicMovementsByEntry,
): string {
  const rows = entries.map((entry) => {
    const movements = movementsByEntry[entry.id] ?? [];
    const status = deriveEconomicStatus(entry, movements);
    const outstandingMinor = calculateOutstandingMinor(entry, movements);
    return [
      entryTypeLabels[entry.entryType],
      entry.concept,
      formatMinorForCsv(entry.amountMinor, entry.currencyCode),
      entry.currencyCode,
      entry.dueDate,
      statusLabels[status],
      entry.counterpartyName ?? (entry.entryType === "player_charge" ? "Jugador" : ""),
      formatMinorForCsv(outstandingMinor, entry.currencyCode),
    ];
  });

  return `\uFEFF${[csvHeaders, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildEconomicCsvFilename({
  period,
  workspaceId,
}: {
  period?: string;
  workspaceId: string;
}): string {
  const workspaceSegment = workspaceId.replace(/[^a-zA-Z0-9-]/g, "").slice(-6) || "activo";
  const periodSegment = /^\d{4}-\d{2}$/.test(period ?? "") ? period : "todos-los-periodos";
  return `economia-workspace-${workspaceSegment}-${periodSegment}.csv`;
}

function formatMinorForCsv(amountMinor: number, currencyCode: string): string {
  const fractionDigits = new Intl.NumberFormat("es-ES", { style: "currency", currency: currencyCode })
    .resolvedOptions()
    .maximumFractionDigits ?? 2;
  return (amountMinor / 10 ** fractionDigits).toLocaleString("es-ES", {
    useGrouping: false,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function escapeCsvCell(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}
