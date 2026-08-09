"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { calculateOutstandingMinor, deriveEconomicStatus, formatMinorUnits } from "@/lib/economia";
import type { EconomicEntry, EconomicMovement } from "@/types/economia";

interface EconomiaResumenProps {
  entries: readonly EconomicEntry[];
  movementsByEntry?: Readonly<Record<string, readonly EconomicMovement[]>>;
  periodLabel: string;
  referenceDate?: Date | string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type SummaryValues = {
  projectedMinor: number;
  actualMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  balanceMinor: number;
};

function entryMovements(
  entryId: string,
  movementsByEntry: Readonly<Record<string, readonly EconomicMovement[]>>,
): readonly EconomicMovement[] {
  return movementsByEntry[entryId] ?? [];
}

function calculateSummary(
  entries: readonly EconomicEntry[],
  movementsByEntry: Readonly<Record<string, readonly EconomicMovement[]>>,
  referenceDate?: Date | string,
): SummaryValues {
  return entries.reduce<SummaryValues>((summary, entry) => {
    if (entry.lifecycle === "cancelled") return summary;

    const movements = entryMovements(entry.id, movementsByEntry);
    const outstandingMinor = calculateOutstandingMinor(entry, movements);
    const actualMinor = entry.amountMinor - outstandingMinor;
    const isExpense = entry.entryType === "expense";
    const status = deriveEconomicStatus(entry, movements, { referenceDate });

    return {
      projectedMinor: summary.projectedMinor + entry.amountMinor,
      actualMinor: summary.actualMinor + actualMinor,
      outstandingMinor: summary.outstandingMinor + outstandingMinor,
      overdueMinor: summary.overdueMinor + (status === "overdue" ? outstandingMinor : 0),
      balanceMinor: summary.balanceMinor + (isExpense ? -actualMinor : actualMinor),
    };
  }, {
    projectedMinor: 0,
    actualMinor: 0,
    outstandingMinor: 0,
    overdueMinor: 0,
    balanceMinor: 0,
  });
}

function formatSummaryAmount(amountMinor: number, currencyCode: string): string {
  if (amountMinor >= 0) return formatMinorUnits(amountMinor, currencyCode);
  return `−${formatMinorUnits(Math.abs(amountMinor), currencyCode)}`;
}

export function EconomiaResumen({
  entries,
  movementsByEntry = {},
  periodLabel,
  referenceDate,
  loading = false,
  error = null,
  onRetry,
}: EconomiaResumenProps) {
  if (loading) {
    return (
      <section aria-label="Resumen económico" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </section>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <span>{error}</span>
        {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">Reintentar</button>}
      </div>
    );
  }

  const currencyCode = entries[0]?.currencyCode ?? "EUR";
  const values = calculateSummary(entries, movementsByEntry, referenceDate);
  const cards = [
    { label: "Previstos", value: values.projectedMinor, description: "Importe total previsto" },
    { label: "Reales", value: values.actualMinor, description: "Importe liquidado" },
    { label: "Pendiente", value: values.outstandingMinor, description: "Importe por liquidar" },
    { label: "Vencido", value: values.overdueMinor, description: "Pendiente fuera de plazo" },
    { label: "Balance", value: values.balanceMinor, description: "Ingresos reales menos gastos reales" },
  ];

  return (
    <section aria-label="Resumen económico" className="space-y-3">
      <p className="text-sm text-muted-foreground">Período: {periodLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <article key={card.label} className="border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground">{card.label}</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {formatSummaryAmount(card.value, currencyCode)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
