"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import { calculateOutstandingMinor, formatMinorUnits } from "@/lib/economia";
import type { EconomicEntry, EconomicMovement, EconomicMovementCreateInput } from "@/types/economia";

interface MovimientoEconomicoFormFields {
  movementType: "settlement" | "refund" | "reversal";
  paymentMethod: "cash" | "bank_transfer" | "stripe" | "other";
  amount: string;
  occurredAt: string;
  externalReference: string;
  originalMovementId: string;
}

interface MovimientoEconomicoFormProps {
  entry: EconomicEntry;
  movements: readonly EconomicMovement[];
  loading?: boolean;
  onSubmit: (input: EconomicMovementCreateInput) => Promise<unknown> | unknown;
  onCancel?: () => void;
}

function amountToMinor(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:[,.](\d{1,2}))?$/);
  if (!match) return null;

  const amountMinor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isEligibleOriginal(movement: EconomicMovement, entry: EconomicEntry): boolean {
  return movement.entryId === entry.id
    && movement.workspaceId === entry.workspaceId
    && movement.currencyCode === entry.currencyCode
    && movement.movementType === "settlement"
    && movement.externalStatus === "succeeded";
}

function adjustmentCapacity(originalMovement: EconomicMovement, movements: readonly EconomicMovement[]): number {
  const adjustedMinor = movements
    .filter((movement) => (
      movement.originalMovementId === originalMovement.id
      && movement.externalStatus === "succeeded"
      && (movement.movementType === "refund" || movement.movementType === "reversal")
    ))
    .reduce((total, movement) => total + movement.amountMinor, 0);
  return Math.max(0, originalMovement.amountMinor - adjustedMinor);
}

function createMovimientoSchema(
  outstandingMinor: number,
  eligibleOriginals: readonly EconomicMovement[],
  movements: readonly EconomicMovement[],
  currencyCode: string,
) {
  return z.object({
    movementType: z.enum(["settlement", "refund", "reversal"]),
    paymentMethod: z.enum(["cash", "bank_transfer", "stripe", "other"]),
    amount: z.string(),
    occurredAt: z.string().min(1, "Indica la fecha del movimiento."),
    externalReference: z.string(),
    originalMovementId: z.string(),
  }).superRefine((value, context) => {
    const amountMinor = amountToMinor(value.amount);
    if (!amountMinor) {
      context.addIssue({ code: "custom", path: ["amount"], message: "Indica un importe vÃ¡lido." });
      return;
    }

    if (value.movementType === "settlement") {
      if (amountMinor > outstandingMinor) {
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: `El importe no puede superar ${formatMinorUnits(outstandingMinor, currencyCode)}.`,
        });
      }
      return;
    }

    const originalMovement = eligibleOriginals.find((movement) => movement.id === value.originalMovementId);
    if (!originalMovement) {
      context.addIssue({ code: "custom", path: ["originalMovementId"], message: "Selecciona el movimiento original." });
    } else if (amountMinor > adjustmentCapacity(originalMovement, movements)) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: `El importe no puede superar ${formatMinorUnits(adjustmentCapacity(originalMovement, movements), currencyCode)}.`,
      });
    }

    if (!value.externalReference.trim()) {
      context.addIssue({ code: "custom", path: ["externalReference"], message: "Indica el motivo del ajuste." });
    }
  });
}

export function MovimientoEconomicoForm({
  entry,
  movements,
  loading = false,
  onSubmit,
  onCancel,
}: MovimientoEconomicoFormProps) {
  const entryMovements = useMemo(
    () => movements.filter((movement) => movement.entryId === entry.id && movement.workspaceId === entry.workspaceId && movement.currencyCode === entry.currencyCode),
    [entry.id, entry.workspaceId, entry.currencyCode, movements],
  );
  const outstandingMinor = useMemo(() => calculateOutstandingMinor(entry, entryMovements), [entry, entryMovements]);
  const eligibleOriginals = useMemo(
    () => entryMovements.filter((movement) => isEligibleOriginal(movement, entry)),
    [entry, entryMovements],
  );
  const schema = useMemo(
    () => createMovimientoSchema(outstandingMinor, eligibleOriginals, entryMovements, entry.currencyCode),
    [entry.currencyCode, entryMovements, eligibleOriginals, outstandingMinor],
  );
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MovimientoEconomicoFormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      movementType: "settlement",
      paymentMethod: "cash",
      amount: "",
      occurredAt: today(),
      externalReference: "",
      originalMovementId: "",
    },
  });
  const movementType = useWatch({ control, name: "movementType" }) ?? "settlement";
  const isAdjustment = movementType !== "settlement";
  const submitLabel = isAdjustment ? "Registrar ajuste" : entry.entryType === "expense" ? "Registrar pago" : "Registrar cobro";

  const submit = handleSubmit(async (values) => {
    const amountMinor = amountToMinor(values.amount);
    if (!amountMinor) return;

    await onSubmit({
      entryId: entry.id,
      movementType: values.movementType,
      paymentMethod: values.paymentMethod,
      amountMinor,
      currencyCode: entry.currencyCode,
      ...(values.externalReference.trim() ? { externalReference: values.externalReference.trim() } : {}),
      ...(isAdjustment ? { originalMovementId: values.originalMovementId } : {}),
      occurredAt: values.occurredAt,
    });
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 px-[22px] py-[22px]">
        <p className="text-sm text-muted-foreground">Este movimiento se registrarÃ¡ manualmente; no procede de una confirmaciÃ³n bancaria.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo de movimiento" required error={errors.movementType?.message}>
            <select {...register("movementType")} disabled={loading} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="settlement">LiquidaciÃ³n</option>
              <option value="refund">Reembolso</option>
              <option value="reversal">ReversiÃ³n</option>
            </select>
          </FormField>
          <FormField label="MÃ©todo" required error={errors.paymentMethod?.message}>
            <select {...register("paymentMethod")} disabled={loading} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="cash">Efectivo</option>
              <option value="bank_transfer">Transferencia bancaria</option>
              <option value="stripe">Stripe</option>
              <option value="other">Otro</option>
            </select>
          </FormField>
          <FormField label="Importe" required error={errors.amount?.message}>
            <Input inputMode="decimal" placeholder="0,00" disabled={loading} {...register("amount")} />
          </FormField>
          <FormField label="Moneda">
            <Input value={entry.currencyCode} readOnly aria-readonly="true" />
          </FormField>
          <FormField label="Fecha" required error={errors.occurredAt?.message}>
            <Input type="date" disabled={loading} {...register("occurredAt")} />
          </FormField>
          <FormField label={isAdjustment ? "Motivo" : "Referencia"} required={isAdjustment} error={errors.externalReference?.message}>
            <Input autoComplete="off" disabled={loading} {...register("externalReference")} />
          </FormField>
        </div>

        {isAdjustment && (
          <FormField label="Movimiento original" required error={errors.originalMovementId?.message}>
            <select {...register("originalMovementId")} disabled={loading} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="">Selecciona un movimiento</option>
              {eligibleOriginals.map((movement) => (
                <option key={movement.id} value={movement.id}>
                  {formatMinorUnits(movement.amountMinor, movement.currencyCode)} Â· {movement.occurredAt ?? movement.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-[22px] py-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cerrar</Button>}
        <div className="flex-1" />
        <Button type="submit" disabled={loading || (!isAdjustment && outstandingMinor === 0)}>{loading ? "Guardandoâ€¦" : submitLabel}</Button>
      </div>
    </form>
  );
}
