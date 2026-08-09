"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecurrenciaEconomicaForm, type RecurrenciaPlayerOption } from "@/components/economia/RecurrenciaEconomicaForm";
import { nextOccurrenceDate } from "@/lib/economia";
import type { EconomicScheduleUpdateInput } from "@/services/economia.service";
import type { EconomicCategory, EconomicEntry, EconomicSchedule, EconomicScheduleCreateInput } from "@/types/economia";

interface RecurrenciasEconomicasProps {
  recurrencias: readonly EconomicSchedule[];
  categorias: readonly EconomicCategory[];
  players?: readonly RecurrenciaPlayerOption[];
  currencyCode: string;
  onCreate: (input: EconomicScheduleCreateInput) => Promise<unknown> | unknown;
  onUpdate: (id: string, input: EconomicScheduleUpdateInput) => Promise<unknown> | unknown;
  onGenerate: (id: string) => Promise<EconomicEntry | null> | EconomicEntry | null;
  onViewGeneratedEntry?: (entry: EconomicEntry) => void;
  loading?: boolean;
  errorMessage?: string | null;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function frequencyLabel(frequency: EconomicSchedule["frequency"]): string {
  return frequency === "weekly" ? "Semanal" : frequency === "monthly" ? "Mensual" : "Anual";
}

export function RecurrenciasEconomicas({
  recurrencias,
  categorias,
  players,
  currencyCode,
  onCreate,
  onUpdate,
  onGenerate,
  onViewGeneratedEntry,
  loading = false,
  errorMessage,
}: RecurrenciasEconomicasProps) {
  const [showForm, setShowForm] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedEntry, setGeneratedEntry] = useState<EconomicEntry | null>(null);
  const [nextDates, setNextDates] = useState<Record<string, string>>({});
  const generateLockRef = useRef<string | null>(null);

  async function createSchedule(input: EconomicScheduleCreateInput) {
    await onCreate(input);
    setShowForm(false);
  }

  async function generateNext(schedule: EconomicSchedule) {
    if (generateLockRef.current) return;
    generateLockRef.current = schedule.id;
    setGeneratingId(schedule.id);
    try {
      const entry = await onGenerate(schedule.id);
      if (!entry) return;
      setGeneratedEntry(entry);
      const upcoming = nextOccurrenceDate(schedule.nextDueDate, schedule.frequency);
      setNextDates((current) => ({ ...current, [schedule.id]: upcoming }));
    } finally {
      generateLockRef.current = null;
      setGeneratingId(null);
    }
  }

  return (
    <section aria-labelledby="recurrencias-economicas-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="recurrencias-economicas-title" className="text-lg font-semibold">Periodicidades</h2>
          <p className="text-sm text-muted-foreground">La generación es manual en este MVP; revisa cada periodicidad antes de crear la entrada.</p>
        </div>
        <Button type="button" onClick={() => setShowForm((current) => !current)} disabled={loading}>{showForm ? "Cerrar formulario" : "Nueva periodicidad"}</Button>
      </div>

      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      {showForm && <RecurrenciaEconomicaForm categorias={categorias} players={players} currencyCode={currencyCode} loading={loading} onSubmit={createSchedule} />}

      {generatedEntry && (
        <p role="status" className="border border-border p-3 text-sm">
          Entrada generada. <a href={`#entrada-${generatedEntry.id}`} onClick={(event) => { event.preventDefault(); onViewGeneratedEntry?.(generatedEntry); }} className="underline underline-offset-4">Ver entrada generada</a>
        </p>
      )}

      {recurrencias.length === 0 ? <p className="text-sm text-muted-foreground">No hay periodicidades configuradas.</p> : (
        <ul className="divide-y divide-border border border-border">
          {recurrencias.map((schedule) => {
            const nextDueDate = nextDates[schedule.id] ?? schedule.nextDueDate;
            const category = categorias.find((item) => item.id === schedule.categoryId);
            const isGenerating = generatingId === schedule.id;
            return (
              <li key={schedule.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{schedule.concept}</h3>
                    <p className="text-sm text-muted-foreground">{category?.name ?? "Categoría archivada"} · {frequencyLabel(schedule.frequency)} · {(schedule.amountMinor / 100).toLocaleString("es-ES", { style: "currency", currency: schedule.currencyCode })}</p>
                    <p className="mt-1 text-sm">Próxima generación: {formatDate(nextDueDate)}</p>
                    {schedule.endDate && <p className="text-sm text-muted-foreground">Finaliza el {formatDate(schedule.endDate)}</p>}
                  </div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">{schedule.status === "active" ? "Activa" : schedule.status === "paused" ? "Pausada" : "Finalizada"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {schedule.status === "active" && <>
                    <Button type="button" size="sm" onClick={() => void generateNext(schedule)} disabled={loading || isGenerating}>{isGenerating ? "Generando…" : `Generar siguiente ${schedule.concept}`}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void onUpdate(schedule.id, { status: "paused" })} disabled={loading || isGenerating}>Pausar {schedule.concept}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void onUpdate(schedule.id, { status: "ended" })} disabled={loading || isGenerating}>Finalizar {schedule.concept}</Button>
                  </>}
                  {schedule.status === "paused" && <>
                    <Button type="button" size="sm" onClick={() => void onUpdate(schedule.id, { status: "active" })} disabled={loading}>Reactivar {schedule.concept}</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void onUpdate(schedule.id, { status: "ended" })} disabled={loading}>Finalizar {schedule.concept}</Button>
                  </>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
