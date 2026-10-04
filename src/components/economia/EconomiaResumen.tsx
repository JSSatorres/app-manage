"use client";

import { AlertTriangle, CircleCheck, Hourglass, Scale, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";
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
      <section aria-label="Resumen económico" className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-[88px] rounded-xl" />)}
      </section>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <span>{error}</span>
        {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">Reintentar</button>}
      </div>
    );
  }

  const currencyCode = entries[0]?.currencyCode ?? "EUR";
  const values = calculateSummary(entries, movementsByEntry, referenceDate);
  const cards = [
    { label: "Previstos", value: values.projectedMinor, description: "Importe total previsto", icon: Wallet, tone: "bg-primary/10 text-primary" },
    { label: "Reales", value: values.actualMinor, description: "Importe liquidado", icon: CircleCheck, tone: "bg-success/10 text-success" },
    { label: "Pendiente", value: values.outstandingMinor, description: "Importe por liquidar", icon: Hourglass, tone: "bg-warning/10 text-warning" },
    { label: "Vencido", value: values.overdueMinor, description: "Pendiente fuera de plazo", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
    { label: "Balance", value: values.balanceMinor, description: "Ingresos reales menos gastos reales", icon: Scale, tone: "bg-chart-6/12 text-chart-6" },
  ];

  return (
    <section aria-label="Resumen económico" className="space-y-2">
      <p className="text-[12.5px] font-medium text-muted-foreground">Período: {periodLabel}</p>
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            labelAs="h2"
            label={card.label}
            value={formatSummaryAmount(card.value, currencyCode)}
            hint={card.description}
            icon={card.icon}
            tone={card.tone}
            className={card.label === "Balance" ? "col-span-2 lg:col-span-1" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
