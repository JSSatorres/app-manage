"use client";

import { Badge } from "@/components/ui/badge";
import { formatMinorUnits } from "@/lib/economia";
import type { EconomicExternalStatus, EconomicMovement, EconomicMovementType } from "@/types/economia";

interface HistorialMovimientosProps {
  movements: readonly EconomicMovement[];
  actorNameByMovementId?: Readonly<Record<string, string>>;
}

const movementTypeLabels: Record<EconomicMovementType, string> = {
  settlement: "LiquidaciÃ³n",
  refund: "Reembolso",
  reversal: "ReversiÃ³n",
};

const statusLabels: Record<EconomicExternalStatus, string> = {
  pending: "Pendiente",
  succeeded: "Completado",
  failed: "Fallido",
  cancelled: "Cancelado",
};

function statusVariant(status: EconomicExternalStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  if (status === "cancelled") return "outline";
  return "secondary";
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
}

function stripeMovementDescription(status: EconomicExternalStatus, date: string): string {
  if (status === "succeeded") return `Confirmado por Stripe el ${formatDate(date)}.`;
  if (status === "pending") return "Pendiente de confirmación por Stripe.";
  if (status === "failed") return "Stripe no ha podido completar este movimiento.";
  return "Stripe ha cancelado este movimiento.";
}

export function HistorialMovimientos({ movements, actorNameByMovementId = {} }: HistorialMovimientosProps) {
  const orderedMovements = [...movements].sort((left, right) => {
    const leftDate = left.occurredAt ?? left.createdAt;
    const rightDate = right.occurredAt ?? right.createdAt;
    return leftDate.localeCompare(rightDate) || left.createdAt.localeCompare(right.createdAt);
  });

  if (orderedMovements.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay movimientos registrados manualmente.</p>;
  }

  return (
    <ol aria-label="Historial de movimientos" className="space-y-3">
      {orderedMovements.map((movement) => {
        const actorName = actorNameByMovementId[movement.id] ?? "Usuario del club";
        const movementDate = movement.occurredAt ?? movement.createdAt;
        return (
          <li key={movement.id} className="border-l-2 border-border pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{movementTypeLabels[movement.movementType]}</Badge>
              <Badge variant={statusVariant(movement.externalStatus)}>{statusLabels[movement.externalStatus]}</Badge>
              <span className="font-medium text-foreground">{formatMinorUnits(movement.amountMinor, movement.currencyCode)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {movement.paymentMethod === "stripe"
                ? stripeMovementDescription(movement.externalStatus, movementDate)
                : `Registrado manualmente por ${actorName} el ${formatDate(movementDate)}.`}
            </p>
            {movement.externalReference && <p className="mt-1 text-sm text-muted-foreground">Referencia o motivo: {movement.externalReference}</p>}
          </li>
        );
      })}
    </ol>
  );
}
