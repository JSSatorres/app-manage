"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMinorUnits } from "@/lib/economia";
import { useAuth } from "@/hooks/useAuth";

type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

type StripeRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  settlementId: string;
  maxAmountMinor: number;
  currencyCode: string;
  onRequested?: () => Promise<unknown> | unknown;
};

const reasonLabels: Record<RefundReason, string> = {
  requested_by_customer: "Solicitado por la persona pagadora",
  duplicate: "Cobro duplicado",
  fraudulent: "Cobro fraudulento",
};

function getRefundStatus(value: unknown): "processing" | "requested" | null {
  if (!value || typeof value !== "object" || !("status" in value)) return null;
  return value.status === "processing" || value.status === "requested" ? value.status : null;
}

export function StripeRefundDialog({
  open,
  onOpenChange,
  workspaceId,
  settlementId,
  maxAmountMinor,
  currencyCode,
  onRequested,
}: StripeRefundDialogProps) {
  const { session } = useAuth();
  const [amountMinor, setAmountMinor] = useState(maxAmountMinor);
  const [reason, setReason] = useState<RefundReason>("requested_by_customer");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedStatus, setSubmittedStatus] = useState<"processing" | "requested" | null>(null);

  async function submitRefund() {
    if (!session?.access_token) {
      setErrorMessage("Tu sesión ha caducado. Vuelve a iniciar sesión para solicitar el reembolso.");
      return;
    }
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > maxAmountMinor) {
      setErrorMessage("Indica un importe válido que no supere el máximo reembolsable.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/stripe/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspaceId, settlementId, amountMinor, reason }),
      });
      const status = getRefundStatus(await response.json());
      if (!response.ok || !status) throw new Error("refund");
      setSubmittedStatus(status);
      void Promise.resolve().then(() => onRequested?.()).catch(() => undefined);
    } catch {
      setErrorMessage("No se ha podido solicitar el reembolso en Stripe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reembolsar cobro Stripe</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Máximo reembolsable: <span className="font-medium text-foreground">{formatMinorUnits(maxAmountMinor, currencyCode)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            El reembolso se cargará al saldo de la cuenta Stripe del club y se confirmará cuando Stripe lo procese.
          </p>
          <div className="space-y-2">
            <Label htmlFor="stripe-refund-amount">Importe a reembolsar ({currencyCode})</Label>
            <Input
              id="stripe-refund-amount"
              type="number"
              min="1"
              max={maxAmountMinor}
              step="1"
              value={amountMinor}
              onChange={(event) => setAmountMinor(Number(event.target.value))}
              disabled={loading || submittedStatus !== null}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripe-refund-reason">Motivo</Label>
            <select
              id="stripe-refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as RefundReason)}
              disabled={loading || submittedStatus !== null}
              className="h-9 w-full border border-input bg-transparent px-2.5 text-sm"
            >
              {Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {submittedStatus === "processing" && <p role="status" className="text-sm text-muted-foreground">La solicitud de reembolso está en procesamiento.</p>}
          {submittedStatus === "requested" && <p role="status" className="text-sm text-muted-foreground">La solicitud de reembolso se ha registrado y está pendiente de confirmación por Stripe.</p>}
          {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        </DialogBody>
        <DialogFooter showCloseButton>
          <Button type="button" onClick={() => void submitRefund()} disabled={loading || submittedStatus !== null}>
            {loading ? "Solicitando reembolso…" : "Solicitar reembolso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
