"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nextOccurrenceDate } from "@/lib/economia";
import type { EconomicCategory, EconomicEntryType, EconomicScheduleCreateInput, EconomicScheduleFrequency } from "@/types/economia";

export interface RecurrenciaPlayerOption {
  id: string;
  label: string;
}

interface RecurrenciaEconomicaFormProps {
  categorias: readonly EconomicCategory[];
  players?: readonly RecurrenciaPlayerOption[];
  currencyCode: string;
  loading?: boolean;
  onSubmit: (input: EconomicScheduleCreateInput) => Promise<unknown> | unknown;
}

function formatDate(date: string): string {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

export function RecurrenciaEconomicaForm({ categorias, players = [], currencyCode, loading = false, onSubmit }: RecurrenciaEconomicaFormProps) {
  const [entryType, setEntryType] = useState<EconomicEntryType>("income");
  const [categoryId, setCategoryId] = useState("");
  const [concept, setConcept] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<EconomicScheduleFrequency>("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => categorias.filter((category) => category.isActive && category.direction === (entryType === "expense" ? "expense" : "income")), [categorias, entryType]);
  const nextPreview = useMemo(() => {
    try {
      return nextDueDate ? nextOccurrenceDate(nextDueDate, frequency) : "";
    } catch {
      return "";
    }
  }, [frequency, nextDueDate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!categoryId || !concept.trim() || !nextDueDate || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setError("Completa categoría, concepto, importe y próximo vencimiento.");
      return;
    }
    if (entryType === "expense" && !counterpartyName.trim()) {
      setError("Indica el proveedor o contraparte del gasto.");
      return;
    }
    if (entryType === "player_charge" && !playerId) {
      setError("Selecciona el jugador al que corresponde el cargo.");
      return;
    }
    if (endDate && endDate < nextDueDate) {
      setError("La fecha de fin no puede preceder al próximo vencimiento.");
      return;
    }
    setError(null);
    await onSubmit({
      entryType,
      categoryId,
      concept: concept.trim(),
      playerId: entryType === "player_charge" ? playerId : null,
      counterpartyName: entryType === "expense" ? counterpartyName.trim() : null,
      amountMinor,
      currencyCode,
      frequency,
      nextDueDate,
      endDate: endDate || null,
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-3 border border-border p-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">Tipo
        <select value={entryType} onChange={(event) => { setEntryType(event.target.value as EconomicEntryType); setCategoryId(""); }} disabled={loading} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="player_charge">Cargo a jugador</option><option value="income">Ingreso</option><option value="expense">Gasto</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Categoría
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={loading} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="">Selecciona una categoría</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Concepto<Input value={concept} onChange={(event) => setConcept(event.target.value)} disabled={loading} /></label>
      <label className="grid gap-1 text-sm font-medium">Importe<Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={loading} /></label>
      {entryType === "player_charge" && <label className="grid gap-1 text-sm font-medium sm:col-span-2">Jugador
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} disabled={loading} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="">Selecciona un jugador</option>{players.map((player) => <option key={player.id} value={player.id}>{player.label}</option>)}
        </select>
      </label>}
      {entryType === "expense" && <label className="grid gap-1 text-sm font-medium sm:col-span-2">Proveedor o contraparte<Input value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} disabled={loading} /></label>}
      <label className="grid gap-1 text-sm font-medium">Frecuencia
        <select aria-label="Frecuencia" value={frequency} onChange={(event) => setFrequency(event.target.value as EconomicScheduleFrequency)} disabled={loading} className="h-9 border border-input bg-background px-2 text-sm">
          <option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="yearly">Anual</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Próximo vencimiento<Input type="date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} disabled={loading} /></label>
      <label className="grid gap-1 text-sm font-medium">Fecha de fin (opcional)<Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} disabled={loading} /></label>
      <p role="status" className="self-end text-sm text-muted-foreground">Siguiente fecha prevista: {formatDate(nextPreview)}</p>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="sm:col-span-2">{loading ? "Guardando…" : "Guardar periodicidad"}</Button>
    </form>
  );
}
