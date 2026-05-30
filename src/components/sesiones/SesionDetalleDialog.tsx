"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Target, MapPin, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSesionDetalle } from "@/hooks/useSesionDetalle";
import { SesionDocumentosPanel } from "./SesionDocumentosPanel";
import type { Sesion } from "@/types/sesiones";
import { ESTADO_SESION } from "@/lib/constants";

interface SesionDetalleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sesion: Sesion | null;
  equipoNombre: string;
  sedeNombre: string;
  entrenadorNombre: string;
  savingNotas: boolean;
  onSaveNotas: (feedbackPostEntreno: string) => Promise<void> | void;
}

const ESTADO_STYLE: Record<string, string> = {
  Realizada: "bg-emerald-100 text-emerald-700",
  Planificada: "bg-blue-100 text-blue-700",
  Borrador: "bg-amber-100 text-amber-700",
  NoRealizada: "bg-rose-100 text-rose-700",
};

export function SesionDetalleDialog({
  open,
  onOpenChange,
  sesion,
  equipoNombre,
  sedeNombre,
  entrenadorNombre,
  savingNotas,
  onSaveNotas,
}: SesionDetalleDialogProps) {
  const { data: ejercicios, loading: ejerciciosLoading } = useSesionDetalle(
    open && sesion ? sesion.id : null,
  );

  const [notas, setNotas] = useState("");
  const [ejerciciosOpen, setEjerciciosOpen] = useState(true);

  useEffect(() => {
    if (!sesion) return;
    const value = sesion.feedbackPostEntreno ?? "";
    queueMicrotask(() => setNotas(value));
  }, [sesion]);

  if (!sesion) return null;

  const estadoLabel =
    sesion.estado === ESTADO_SESION.NO_REALIZADA ? "No realizada" : sesion.estado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Sesión · {equipoNombre}</span>
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-full",
                ESTADO_STYLE[sesion.estado] ?? "bg-gray-100 text-gray-700",
              )}
            >
              {estadoLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Información general */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow icon={<CalendarDays size={14} />} label="Fecha" value={sesion.fecha} />
            <InfoRow
              icon={<Clock size={14} />}
              label="Hora"
              value={sesion.horaInicio ?? "—"}
            />
            <InfoRow icon={<MapPin size={14} />} label="Sede" value={sedeNombre} />
            <InfoRow
              icon={<Target size={14} />}
              label="Entrenador"
              value={entrenadorNombre}
            />
            {sesion.objetivoSesion && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Objetivo</p>
                <p className="text-sm">{sesion.objetivoSesion}</p>
              </div>
            )}
            {sesion.observacionesPrevias && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Observaciones previas</p>
                <p className="text-sm whitespace-pre-wrap">{sesion.observacionesPrevias}</p>
              </div>
            )}
          </div>

          {/* Desplegable ejercicios */}
          <div className="border border-border/60 rounded-lg">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
              onClick={() => setEjerciciosOpen((v) => !v)}
            >
              <span>
                Ejercicios{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({ejercicios?.length ?? 0})
                </span>
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "transition-transform",
                  ejerciciosOpen && "rotate-180",
                )}
              />
            </button>
            {ejerciciosOpen && (
              <div className="px-4 pb-4 pt-1">
                {ejerciciosLoading ? (
                  <p className="text-sm text-muted-foreground py-3">Cargando ejercicios…</p>
                ) : !ejercicios || ejercicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">
                    No hay ejercicios asociados a esta sesión.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {ejercicios.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
                      >
                        <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                          {e.orden}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{e.titulo}</p>
                          {e.objetivoPrincipal && (
                            <p className="text-xs text-muted-foreground">
                              {e.objetivoPrincipal}
                            </p>
                          )}
                          {(e.tiempoEjecucion || e.tiempoDescanso || e.varianteAplicada) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {e.tiempoEjecucion ? `${e.tiempoEjecucion} min ejecución` : ""}
                              {e.tiempoDescanso ? ` · ${e.tiempoDescanso} min descanso` : ""}
                              {e.varianteAplicada ? ` · ${e.varianteAplicada}` : ""}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* Documentos de la sesión */}
          <SesionDocumentosPanel sesionId={sesion.id} />

          {/* Notas del entrenador */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas del entrenador</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Añade notas sobre la sesión, qué funcionó, qué mejorar…"
              rows={4}
              disabled={savingNotas}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={savingNotas}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={() => onSaveNotas(notas)}
              disabled={savingNotas || notas === (sesion.feedbackPostEntreno ?? "")}
            >
              {savingNotas ? "Guardando…" : "Guardar notas"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
