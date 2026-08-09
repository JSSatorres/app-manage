"use client";

import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardStat, MobileCardRow } from "@/components/shared/MobileCardRow";
import { HistorialMovimientos } from "@/components/economia/HistorialMovimientos";
import { MovimientoEconomicoForm } from "@/components/economia/MovimientoEconomicoForm";
import { StripeCheckoutButton } from "@/components/economia/StripeCheckoutButton";
import { StripeRefundDialog } from "@/components/economia/StripeRefundDialog";
import { calculateOutstandingMinor, deriveEconomicStatus, formatMinorUnits } from "@/lib/economia";
import type { EconomicEntry, EconomicMovement, EconomicMovementCreateInput, EconomicStatus } from "@/types/economia";

interface MovimientosEconomicosTableProps {
  entries: readonly EconomicEntry[];
  movementsByEntry?: Readonly<Record<string, readonly EconomicMovement[]>>;
  playerNameById?: Readonly<Record<string, string>>;
  referenceDate?: Date | string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  hasActiveFilters?: boolean;
  onViewEntry?: (entry: EconomicEntry) => void;
  onRegisterMovement?: (input: EconomicMovementCreateInput) => Promise<unknown> | unknown;
  movementLoading?: boolean;
  movementError?: string | null;
  actorNameByMovementId?: Readonly<Record<string, string>>;
  workspaceId?: string;
  stripeAccountActive?: boolean;
  onStripeRefundRequested?: () => Promise<unknown> | unknown;
}

type EconomicEntryRow = EconomicEntry & {
  playerName: string;
  netMinor: number;
  outstandingMinor: number;
  status: EconomicStatus;
};

const statusLabels: Record<EconomicStatus, string> = {
  pending: "Pendiente",
  overdue: "Vencido",
  partial: "Parcial",
  paid: "Pagado",
  partially_refunded: "Reembolsado parcial",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
}

function statusVariant(status: EconomicStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "overdue") return "destructive";
  if (status === "paid") return "default";
  if (status === "cancelled") return "outline";
  return "secondary";
}

function canGenerateStripeCheckout(
  entry: EconomicEntryRow,
  workspaceId: string | undefined,
  stripeAccountActive: boolean,
): boolean {
  return Boolean(
    workspaceId
    && stripeAccountActive
    && entry.entryType === "player_charge"
    && entry.lifecycle === "open"
    && entry.outstandingMinor > 0,
  );
}

function getRefundableMinor(settlement: EconomicMovement, movements: readonly EconomicMovement[]): number | null {
  if (
    settlement.movementType !== "settlement"
    || settlement.paymentMethod !== "stripe"
    || settlement.externalStatus !== "succeeded"
  ) return null;

  const adjustedMinor = movements
    .filter((movement) => (
      movement.originalMovementId === settlement.id
      && movement.externalStatus === "succeeded"
      && (movement.movementType === "refund" || movement.movementType === "reversal")
    ))
    .reduce((total, movement) => total + movement.amountMinor, 0);
  const refundableMinor = settlement.amountMinor - adjustedMinor;
  return refundableMinor > 0 ? refundableMinor : null;
}

function getRefundableStripeSettlements(movements: readonly EconomicMovement[]) {
  return movements.flatMap((movement) => {
    const maxAmountMinor = getRefundableMinor(movement, movements);
    return maxAmountMinor === null ? [] : [{ settlement: movement, maxAmountMinor }];
  });
}

function renderStripeCheckoutAction(
  entry: EconomicEntryRow,
  workspaceId: string | undefined,
  stripeAccountActive: boolean,
) {
  if (!workspaceId || !canGenerateStripeCheckout(entry, workspaceId, stripeAccountActive)) return null;
  return <StripeCheckoutButton workspaceId={workspaceId} entryId={entry.id} eligible />;
}

export function MovimientosEconomicosTable({
  entries,
  movementsByEntry = {},
  playerNameById = {},
  referenceDate,
  loading = false,
  error = null,
  onRetry,
  hasActiveFilters = false,
  onViewEntry,
  onRegisterMovement,
  movementLoading = false,
  movementError = null,
  actorNameByMovementId,
  workspaceId,
  stripeAccountActive = false,
  onStripeRefundRequested,
}: MovimientosEconomicosTableProps) {
  const [entryForMovement, setEntryForMovement] = useState<EconomicEntry | null>(null);
  const [settlementForRefund, setSettlementForRefund] = useState<EconomicMovement | null>(null);
  const rows = useMemo<EconomicEntryRow[]>(() => entries.map((entry) => {
    const movements = movementsByEntry[entry.id] ?? [];
    const outstandingMinor = entry.lifecycle === "cancelled" ? 0 : calculateOutstandingMinor(entry, movements);
    return {
      ...entry,
      playerName: entry.playerId ? playerNameById[entry.playerId] ?? "Jugador sin identificar" : entry.counterpartyName ?? "Sin jugador",
      netMinor: entry.lifecycle === "cancelled" ? 0 : entry.amountMinor - outstandingMinor,
      outstandingMinor,
      status: deriveEconomicStatus(entry, movements, { referenceDate }),
    };
  }), [entries, movementsByEntry, playerNameById, referenceDate]);
  const hasStripeCheckoutAction = rows.some((row) => canGenerateStripeCheckout(row, workspaceId, stripeAccountActive));
  const hasStripeRefundAction = Boolean(workspaceId) && rows.some((row) => (
    getRefundableStripeSettlements(movementsByEntry[row.id] ?? []).length > 0
  ));

  const columns = useMemo<Column<EconomicEntryRow>[]>(() => {
    const result: Column<EconomicEntryRow>[] = [
      {
        key: "entry",
        header: "Jugador / entrada",
        sortable: true,
        accessor: (row) => `${row.playerName} ${row.concept}`,
        render: (row) => (
          <div className="min-w-40">
            <p className="font-medium text-foreground">{row.playerName}</p>
            <p className="text-sm text-muted-foreground">{row.concept}</p>
          </div>
        ),
      },
      { key: "dueDate", header: "Vencimiento", sortable: true, accessor: (row) => row.dueDate, render: (row) => formatDate(row.dueDate) },
      { key: "total", header: "Total", sortable: true, accessor: (row) => row.amountMinor, render: (row) => formatMinorUnits(row.amountMinor, row.currencyCode) },
      { key: "net", header: "Neto", sortable: true, accessor: (row) => row.netMinor, render: (row) => formatMinorUnits(row.netMinor, row.currencyCode) },
      { key: "outstanding", header: "Pendiente", sortable: true, accessor: (row) => row.outstandingMinor, render: (row) => formatMinorUnits(row.outstandingMinor, row.currencyCode) },
      {
        key: "status",
        header: "Estado",
        sortable: true,
        accessor: (row) => statusLabels[row.status],
        render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabels[row.status]}</Badge>,
      },
    ];

    if (onViewEntry || onRegisterMovement || hasStripeCheckoutAction || hasStripeRefundAction) {
      result.push({
        key: "actions",
        header: "Acciones",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            {onViewEntry && (
              <Button type="button" variant="outline" size="sm" aria-label={`Ver detalle de ${row.concept}`} onClick={() => onViewEntry(row)}>
                Ver detalle
              </Button>
            )}
            {onRegisterMovement && row.lifecycle !== "cancelled" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Registrar ${row.entryType === "expense" ? "pago" : "cobro"} de ${row.concept}`}
                onClick={() => setEntryForMovement(row)}
              >
                Registrar {row.entryType === "expense" ? "pago" : "cobro"}
              </Button>
            )}
            {renderStripeCheckoutAction(row, workspaceId, stripeAccountActive)}
            {workspaceId && getRefundableStripeSettlements(movementsByEntry[row.id] ?? []).map(({ settlement, maxAmountMinor }) => (
              <Button
                key={settlement.id}
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Reembolsar cobro Stripe de ${formatMinorUnits(maxAmountMinor, settlement.currencyCode)}`}
                onClick={() => setSettlementForRefund(settlement)}
              >
                Reembolsar cobro Stripe
              </Button>
            ))}
          </div>
        ),
      });
    }
    return result;
  }, [hasStripeCheckoutAction, hasStripeRefundAction, movementsByEntry, onRegisterMovement, onViewEntry, stripeAccountActive, workspaceId]);

  if (loading) {
    return <div aria-label="Cargando movimientos económicos" className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14" />)}</div>;
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <span>{error}</span>
        {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>}
      </div>
    );
  }

  if (rows.length === 0) {
    return hasActiveFilters ? (
      <EmptyState title="No hay resultados para estos filtros" description="Prueba a cambiar o limpiar los filtros aplicados." />
    ) : (
      <EmptyState title="No hay movimientos económicos todavía" description="Cuando registres cargos, ingresos o gastos aparecerán aquí." />
    );
  }

  return (
    <>
      <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      searchable={false}
      mobileCard={(row) => (
        <MobileCardRow
          icon={ReceiptText}
          title={row.playerName}
          meta={`${row.concept} · Vence ${formatDate(row.dueDate)}`}
          badge={<Badge variant={statusVariant(row.status)}>{statusLabels[row.status]}</Badge>}
          stats={
            <>
              <CardStat icon={ReceiptText}>Total {formatMinorUnits(row.amountMinor, row.currencyCode)}</CardStat>
              <CardStat icon={ReceiptText}>Neto {formatMinorUnits(row.netMinor, row.currencyCode)}</CardStat>
              <CardStat icon={ReceiptText}>Pendiente {formatMinorUnits(row.outstandingMinor, row.currencyCode)}</CardStat>
            </>
          }
          actions={
            (onViewEntry || onRegisterMovement || hasStripeCheckoutAction || hasStripeRefundAction) ? (
              <div className="flex flex-wrap gap-2">
                {onViewEntry && <Button type="button" variant="outline" size="sm" aria-label={`Ver detalle de ${row.concept}`} onClick={() => onViewEntry(row)}>Ver detalle</Button>}
                {onRegisterMovement && row.lifecycle !== "cancelled" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Registrar ${row.entryType === "expense" ? "pago" : "cobro"} de ${row.concept}`}
                    onClick={() => setEntryForMovement(row)}
                  >
                    Registrar {row.entryType === "expense" ? "pago" : "cobro"}
                  </Button>
                )}
                {renderStripeCheckoutAction(row, workspaceId, stripeAccountActive)}
                {workspaceId && getRefundableStripeSettlements(movementsByEntry[row.id] ?? []).map(({ settlement, maxAmountMinor }) => (
                  <Button
                    key={settlement.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Reembolsar cobro Stripe de ${formatMinorUnits(maxAmountMinor, settlement.currencyCode)}`}
                    onClick={() => setSettlementForRefund(settlement)}
                  >
                    Reembolsar cobro Stripe
                  </Button>
                ))}
              </div>
            ) : undefined
          }
        />
      )}
      />
      {entryForMovement && onRegisterMovement && (
        <Dialog open onOpenChange={(open) => { if (!open) setEntryForMovement(null); }}>
          <DialogContent showCloseButton className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div>
                <DialogTitle>Registrar {entryForMovement.entryType === "expense" ? "pago" : "cobro"}</DialogTitle>
                <DialogDescription>
                  {entryForMovement.concept}. El movimiento queda registrado manualmente y no se confirma por banco.
                </DialogDescription>
              </div>
            </DialogHeader>
            {movementError && <p role="alert" className="px-[22px] pt-4 text-sm text-destructive">{movementError}</p>}
            <MovimientoEconomicoForm
              entry={entryForMovement}
              movements={movementsByEntry[entryForMovement.id] ?? []}
              loading={movementLoading}
              onSubmit={async (input) => {
                const movement = await onRegisterMovement(input);
                if (movement !== null) setEntryForMovement(null);
              }}
              onCancel={() => setEntryForMovement(null)}
            />
            <div className="border-t border-border px-[22px] py-4">
              <h3 className="font-medium">Historial de movimientos</h3>
              <div className="mt-3">
                <HistorialMovimientos
                  movements={movementsByEntry[entryForMovement.id] ?? []}
                  actorNameByMovementId={actorNameByMovementId}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {settlementForRefund && workspaceId && (
        <StripeRefundDialog
          key={settlementForRefund.id}
          open
          onOpenChange={(open) => { if (!open) setSettlementForRefund(null); }}
          workspaceId={workspaceId}
          settlementId={settlementForRefund.id}
          maxAmountMinor={getRefundableMinor(
            settlementForRefund,
            movementsByEntry[settlementForRefund.entryId] ?? [],
          ) ?? 0}
          currencyCode={settlementForRefund.currencyCode}
          onRequested={onStripeRefundRequested}
        />
      )}
    </>
  );
}
