"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntradaEconomicaForm, type EconomicPlayerOption } from "@/components/economia/EntradaEconomicaForm";
import type { EconomicCategory, EconomicEntry, EconomicEntryCreateInput } from "@/types/economia";
import type { EconomicEntryUpdateInput } from "@/services/economia.service";

interface EntradaEconomicaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: EconomicEntry | null;
  categories: readonly EconomicCategory[];
  players: readonly EconomicPlayerOption[];
  hasMovements?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  onCreate: (input: EconomicEntryCreateInput) => Promise<unknown> | unknown;
  onUpdate: (id: string, input: EconomicEntryUpdateInput) => Promise<unknown> | unknown;
  onCancel: (id: string, reason: string) => Promise<unknown> | unknown;
}

export function EntradaEconomicaDialog({
  open,
  onOpenChange,
  entry = null,
  categories,
  players,
  hasMovements = false,
  loading = false,
  errorMessage = null,
  onCreate,
  onUpdate,
  onCancel,
}: EntradaEconomicaDialogProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const isEditing = Boolean(entry);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setFeedback(null);
      setCancelOpen(false);
      setCancellationReason("");
      setCancellationError(null);
    }
    onOpenChange(nextOpen);
  }

  async function saveEntry(input: EconomicEntryCreateInput) {
    setFeedback(null);
    if (!entry) {
      const result = await onCreate(input);
      if (result !== null) setFeedback("Entrada creada correctamente.");
      return;
    }

    const updateInput: EconomicEntryUpdateInput = {
      categoryId: input.categoryId,
      playerId: input.playerId,
      concept: input.concept,
      counterpartyName: input.counterpartyName,
      amountMinor: input.amountMinor,
      currencyCode: input.currencyCode,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
    };
    const result = await onUpdate(entry.id, updateInput);
    if (result !== null) setFeedback("Entrada actualizada correctamente.");
  }

  async function confirmCancellation() {
    const reason = cancellationReason.trim();
    if (!reason) {
      setCancellationError("Indica el motivo de la cancelación.");
      return;
    }
    if (!entry) return;

    setCancelling(true);
    setCancellationError(null);
    try {
      const result = await onCancel(entry.id, reason);
      if (result !== null) {
        setFeedback("Entrada cancelada correctamente.");
        setCancelOpen(false);
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <div>
              <DialogTitle>{isEditing ? "Editar entrada económica" : "Nueva entrada económica"}</DialogTitle>
              <DialogDescription>
                {isEditing ? "Actualiza la información permitida de la entrada." : "Registra un cargo, ingreso o gasto manual."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {feedback && <p role="status" className="px-[22px] pt-4 text-sm text-foreground">{feedback}</p>}
          {errorMessage && <p role="alert" className="px-[22px] pt-4 text-sm text-destructive">{errorMessage}</p>}

          <EntradaEconomicaForm
            categories={categories}
            players={players}
            initialValue={entry}
            hasMovements={hasMovements}
            loading={loading}
            submitLabel={isEditing ? "Guardar cambios" : "Crear entrada"}
            onSubmit={saveEntry}
            onCancel={() => handleOpenChange(false)}
          />

          {entry && entry.lifecycle !== "cancelled" && (
            <div className="border-t border-border px-[22px] py-4">
              <Button type="button" variant="destructive" onClick={() => setCancelOpen(true)} disabled={loading || cancelling}>
                Cancelar entrada
              </Button>
            </div>
          )}

          {cancelOpen && (
            <div role="alertdialog" aria-label="Confirmar cancelación" className="border-t border-border px-[22px] py-4">
              <h3 className="font-medium">Cancelar entrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">La entrada permanecerá visible en el histórico como cancelada.</p>
              <label className="mt-4 grid gap-2 text-sm font-medium">
                Motivo de la cancelación
                <Textarea
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  aria-invalid={Boolean(cancellationError)}
                  disabled={cancelling}
                />
              </label>
              {cancellationError && <p role="alert" className="mt-2 text-sm text-destructive">{cancellationError}</p>}
              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Volver</Button>
                <Button type="button" variant="destructive" onClick={confirmCancellation} disabled={cancelling}>
                  Confirmar cancelación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
