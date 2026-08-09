"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/FormField";
import type { EconomicCategory, EconomicEntry, EconomicEntryCreateInput, EconomicEntryType } from "@/types/economia";

export interface EconomicPlayerOption {
  id: string;
  label: string;
}

interface EntradaEconomicaFormFields {
  entryType: EconomicEntryType;
  categoryId: string;
  playerId: string;
  concept: string;
  counterpartyName: string;
  amount: string;
  currencyCode: string;
  issueDate: string;
  dueDate: string;
}

interface EntradaEconomicaFormProps {
  categories: readonly EconomicCategory[];
  players: readonly EconomicPlayerOption[];
  initialValue?: EconomicEntry | null;
  hasMovements?: boolean;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (value: EconomicEntryCreateInput) => Promise<void> | void;
  onCancel?: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function amountToMinor(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:[,.](\d{1,2}))?$/);
  if (!match) return null;

  const whole = Number(match[1]);
  const decimal = Number((match[2] ?? "").padEnd(2, "0"));
  const amountMinor = whole * 100 + decimal;
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}

function amountFromMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function createEntradaEconomicaSchema(categories: readonly EconomicCategory[]) {
  return z.object({
    entryType: z.enum(["player_charge", "income", "expense"]),
    categoryId: z.string(),
    playerId: z.string(),
    concept: z.string().trim().min(1, "El concepto es obligatorio."),
    counterpartyName: z.string(),
    amount: z.string(),
    currencyCode: z.string(),
    issueDate: z.string().min(1, "La fecha de emisión es obligatoria."),
    dueDate: z.string().min(1, "El vencimiento es obligatorio."),
  }).superRefine((value, context) => {
    const category = categories.find((item) => item.id === value.categoryId);
    const expectedDirection = value.entryType === "expense" ? "expense" : "income";
    if (!category || !category.isActive || category.direction !== expectedDirection) {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: expectedDirection === "expense"
          ? "Selecciona una categoría de gasto activa."
          : "Selecciona una categoría de ingreso activa.",
      });
    }
    if (value.entryType === "player_charge" && !value.playerId) {
      context.addIssue({ code: "custom", path: ["playerId"], message: "Selecciona un jugador." });
    }
    if (value.entryType === "expense" && !value.counterpartyName.trim()) {
      context.addIssue({
        code: "custom",
        path: ["counterpartyName"],
        message: "El proveedor o contraparte es obligatorio.",
      });
    }
    if (!amountToMinor(value.amount)) {
      context.addIssue({ code: "custom", path: ["amount"], message: "Indica un importe válido." });
    }
    if (!/^[a-zA-Z]{3}$/.test(value.currencyCode.trim())) {
      context.addIssue({
        code: "custom",
        path: ["currencyCode"],
        message: "Indica una moneda ISO de tres letras.",
      });
    }
    if (value.issueDate && value.dueDate && value.dueDate < value.issueDate) {
      context.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "El vencimiento no puede preceder a la emisión.",
      });
    }
  });
}

export function EntradaEconomicaForm({
  categories,
  players,
  initialValue,
  hasMovements = false,
  loading = false,
  submitLabel = "Guardar entrada",
  onSubmit,
  onCancel,
}: EntradaEconomicaFormProps) {
  const isCancelled = initialValue?.lifecycle === "cancelled";
  const protectedFieldsDisabled = hasMovements || isCancelled;
  const schema = useMemo(() => createEntradaEconomicaSchema(categories), [categories]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntradaEconomicaFormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      entryType: "player_charge",
      categoryId: "",
      playerId: "",
      concept: "",
      counterpartyName: "",
      amount: "",
      currencyCode: "EUR",
      issueDate: today(),
      dueDate: "",
    },
  });
  const entryType = useWatch({ control, name: "entryType" }) ?? "player_charge";

  useEffect(() => {
    reset({
      entryType: initialValue?.entryType ?? "player_charge",
      categoryId: initialValue?.categoryId ?? "",
      playerId: initialValue?.playerId ?? "",
      concept: initialValue?.concept ?? "",
      counterpartyName: initialValue?.counterpartyName ?? "",
      amount: initialValue ? amountFromMinor(initialValue.amountMinor) : "",
      currencyCode: initialValue?.currencyCode ?? "EUR",
      issueDate: initialValue?.issueDate ?? today(),
      dueDate: initialValue?.dueDate ?? "",
    });
  }, [initialValue, reset]);

  const submit = handleSubmit(async (values) => {
    const amountMinor = amountToMinor(values.amount);
    if (!amountMinor) return;
    await onSubmit({
      entryType: values.entryType,
      categoryId: values.categoryId,
      playerId: entryType === "expense" ? null : values.playerId || null,
      concept: values.concept.trim(),
      counterpartyName: entryType === "player_charge" ? null : values.counterpartyName.trim() || null,
      amountMinor,
      currencyCode: values.currencyCode.trim().toUpperCase(),
      issueDate: values.issueDate,
      dueDate: values.dueDate,
    });
  });

  const categoryOptions = categories.filter((category) => {
    const expectedDirection = entryType === "expense" ? "expense" : "income";
    return category.direction === expectedDirection;
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 px-[22px] py-[22px]">
        {hasMovements && (
          <p role="status" className="text-sm text-muted-foreground">
            Hay movimientos registrados: no se pueden cambiar el tipo, importe, moneda ni jugador.
          </p>
        )}
        {isCancelled && (
          <p role="status" className="text-sm text-muted-foreground">Esta entrada está cancelada y se conserva en el histórico.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo" required error={errors.entryType?.message}>
            <select {...register("entryType")} disabled={protectedFieldsDisabled || loading} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="player_charge">Cargo a jugador</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
          </FormField>
          <FormField label="Categoría" required error={errors.categoryId?.message}>
            <select {...register("categoryId")} disabled={loading || isCancelled} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="">Selecciona una categoría</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id} disabled={!category.isActive}>
                  {category.name}{category.isActive ? "" : " (inactiva)"}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {(entryType === "player_charge" || entryType === "income") && (
          <FormField label="Jugador" required={entryType === "player_charge"} error={errors.playerId?.message}>
            <select {...register("playerId")} disabled={protectedFieldsDisabled || loading} className="h-9 w-full border border-input bg-background px-2 text-sm">
              <option value="">{entryType === "income" ? "Sin jugador asociado" : "Selecciona un jugador"}</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.label}</option>)}
            </select>
          </FormField>
        )}

        <FormField label="Concepto" required error={errors.concept?.message}>
          <Input autoComplete="off" disabled={loading || isCancelled} {...register("concept")} />
        </FormField>

        {entryType !== "player_charge" && (
          <FormField label="Proveedor o contraparte" required={entryType === "expense"} error={errors.counterpartyName?.message}>
            <Input autoComplete="off" disabled={loading || isCancelled} {...register("counterpartyName")} />
          </FormField>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Importe" required error={errors.amount?.message}>
            <Input inputMode="decimal" placeholder="0,00" disabled={protectedFieldsDisabled || loading} {...register("amount")} />
          </FormField>
          <FormField label="Moneda" required error={errors.currencyCode?.message}>
            <Input maxLength={3} autoComplete="off" disabled={protectedFieldsDisabled || loading} {...register("currencyCode")} />
          </FormField>
          <FormField label="Fecha de emisión" required error={errors.issueDate?.message}>
            <Input type="date" disabled={loading || isCancelled} {...register("issueDate")} />
          </FormField>
          <FormField label="Vencimiento" required error={errors.dueDate?.message}>
            <Input type="date" disabled={loading || isCancelled} {...register("dueDate")} />
          </FormField>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-[22px] py-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cerrar</Button>}
        <div className="flex-1" />
        {!isCancelled && <Button type="submit" disabled={loading}>{loading ? "Guardando…" : submitLabel}</Button>}
      </div>
    </form>
  );
}
