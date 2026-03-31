"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useUsuariosLookup } from "@/hooks/useUsuariosLookup";
import { ESTADO_SESION, PERIODO_TEMPORADA } from "@/lib/constants";
import type { Sesion } from "@/types/sesiones";

interface SesionFormValue {
  fecha: string;
  horaInicio: string;
  duracionEstimada: string;
  equipoId: string;
  entrenadorId: string;
  microciclo: string;
  periodoTemporada: string;
  objetivoSesion: string;
  observacionesPrevias: string;
  estado: string;
}

interface SesionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sedeIds: string[];
  initialValue?: Sesion | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SesionFormValue) => Promise<void> | void;
}

export function SesionForm({
  open,
  onOpenChange,
  title,
  sedeIds,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: SesionFormProps) {
  const equiposQuery = useEquiposLookup(sedeIds);
  const usuariosQuery = useUsuariosLookup();

  const defaultValue = useMemo<SesionFormValue>(() => {
    return {
      fecha: initialValue?.fecha ?? "",
      horaInicio: initialValue?.horaInicio ?? "",
      duracionEstimada:
        initialValue?.duracionEstimada != null ? String(initialValue.duracionEstimada) : "",
      equipoId: initialValue?.equipoId ?? "",
      entrenadorId: initialValue?.entrenadorId ?? "",
      microciclo: initialValue?.microciclo != null ? String(initialValue.microciclo) : "",
      periodoTemporada: initialValue?.periodoTemporada ?? "",
      objetivoSesion: initialValue?.objetivoSesion ?? "",
      observacionesPrevias: initialValue?.observacionesPrevias ?? "",
      estado: initialValue?.estado ?? ESTADO_SESION.BORRADOR,
    };
  }, [initialValue]);

  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [duracionEstimada, setDuracionEstimada] = useState("");
  const [equipoId, setEquipoId] = useState("");
  const [entrenadorId, setEntrenadorId] = useState("");
  const [microciclo, setMicrociclo] = useState("");
  const [periodoTemporada, setPeriodoTemporada] = useState("");
  const [objetivoSesion, setObjetivoSesion] = useState("");
  const [observacionesPrevias, setObservacionesPrevias] = useState("");
  const [estado, setEstado] = useState(defaultValue.estado);
  const [touched, setTouched] = useState(false);

  const current = open
    ? defaultValue
    : {
        fecha,
        horaInicio,
        duracionEstimada,
        equipoId,
        entrenadorId,
        microciclo,
        periodoTemporada,
        objetivoSesion,
        observacionesPrevias,
        estado,
      };

  const isValid = !!current.fecha && !!current.equipoId && !!current.entrenadorId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={current.fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setTouched(true);
                }}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horaInicio">Hora inicio</Label>
              <Input
                id="horaInicio"
                type="time"
                value={current.horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duracion">Duración (min)</Label>
              <Input
                id="duracion"
                inputMode="numeric"
                value={current.duracionEstimada}
                onChange={(e) => setDuracionEstimada(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="microciclo">Microciclo</Label>
              <Input
                id="microciclo"
                inputMode="numeric"
                value={current.microciclo}
                onChange={(e) => setMicrociclo(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Equipo</Label>
            <Select
              value={current.equipoId}
              onValueChange={(v) => {
                setEquipoId(String(v ?? ""));
                setTouched(true);
              }}
              disabled={loading || equiposQuery.loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un equipo" />
              </SelectTrigger>
              <SelectContent>
                {(equiposQuery.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Entrenador</Label>
            <Select
              value={current.entrenadorId}
              onValueChange={(v) => {
                setEntrenadorId(String(v ?? ""));
                setTouched(true);
              }}
              disabled={loading || usuariosQuery.loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un entrenador" />
              </SelectTrigger>
              <SelectContent>
                {(usuariosQuery.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nombre ? `${u.nombre} (${u.email})` : u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select
                value={current.periodoTemporada}
                onValueChange={(v) => setPeriodoTemporada(String(v ?? ""))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin periodo</SelectItem>
                  <SelectItem value={PERIODO_TEMPORADA.PRETEMPORADA}>Pretemporada</SelectItem>
                  <SelectItem value={PERIODO_TEMPORADA.COMPETICION}>Competición</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={current.estado} onValueChange={(v) => setEstado(String(v ?? ""))} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ESTADO_SESION.BORRADOR}>Borrador</SelectItem>
                  <SelectItem value={ESTADO_SESION.PLANIFICADA}>Planificada</SelectItem>
                  <SelectItem value={ESTADO_SESION.REALIZADA}>Realizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivoSesion">Objetivo sesión</Label>
            <Input
              id="objetivoSesion"
              value={current.objetivoSesion}
              onChange={(e) => setObjetivoSesion(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacionesPrevias">Observaciones</Label>
            <Input
              id="observacionesPrevias"
              value={current.observacionesPrevias}
              onChange={(e) => setObservacionesPrevias(e.target.value)}
              disabled={loading}
            />
          </div>

          {touched && !isValid && (
            <p className="text-sm text-destructive">Fecha, equipo y entrenador son obligatorios.</p>
          )}

          {equiposQuery.errorMessage && (
            <p className="text-sm text-destructive">{equiposQuery.errorMessage}</p>
          )}
          {usuariosQuery.errorMessage && (
            <p className="text-sm text-destructive">{usuariosQuery.errorMessage}</p>
          )}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={async () => onSubmit(current)} disabled={loading || !isValid}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

