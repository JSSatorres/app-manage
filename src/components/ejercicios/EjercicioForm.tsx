"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Ejercicio } from "@/types/ejercicios";

interface EjercicioFormValue {
  titulo: string;
  objetivoPrincipal: string;
  numeroJugadoresMin: string;
  esGlobal: boolean;
  sedePropietariaId: string;
}

interface EjercicioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Ejercicio | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EjercicioFormValue) => Promise<void> | void;
}

export function EjercicioForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EjercicioFormProps) {
  const sedesQuery = useSedesLookup();

  const defaultValue = useMemo<EjercicioFormValue>(() => {
    return {
      titulo: initialValue?.titulo ?? "",
      objetivoPrincipal: initialValue?.objetivoPrincipal ?? "",
      numeroJugadoresMin: initialValue?.numeroJugadoresMin != null ? String(initialValue.numeroJugadoresMin) : "",
      esGlobal: initialValue?.esGlobal ?? false,
      sedePropietariaId: initialValue?.sedePropietariaId ?? "",
    };
  }, [initialValue]);

  const [titulo, setTitulo] = useState("");
  const [objetivoPrincipal, setObjetivoPrincipal] = useState("");
  const [numeroJugadoresMin, setNumeroJugadoresMin] = useState("");
  const [esGlobal, setEsGlobal] = useState(false);
  const [sedePropietariaId, setSedePropietariaId] = useState("");
  const [touched, setTouched] = useState(false);

  const currentTitulo = open ? defaultValue.titulo : titulo;
  const currentObjetivoPrincipal = open ? defaultValue.objetivoPrincipal : objetivoPrincipal;
  const currentNumeroJugadoresMin = open ? defaultValue.numeroJugadoresMin : numeroJugadoresMin;
  const currentEsGlobal = open ? defaultValue.esGlobal : esGlobal;
  const currentSedePropietariaId = open ? defaultValue.sedePropietariaId : sedePropietariaId;

  const isValid = currentTitulo.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={currentTitulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && currentTitulo.trim().length < 2 && (
              <p className="text-sm text-destructive">El título debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo principal</Label>
            <Input
              id="objetivo"
              value={currentObjetivoPrincipal}
              onChange={(e) => setObjetivoPrincipal(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jugadores">Nº jugadores (mín.)</Label>
            <Input
              id="jugadores"
              value={currentNumeroJugadoresMin}
              onChange={(e) => setNumeroJugadoresMin(e.target.value)}
              disabled={loading}
              inputMode="numeric"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Global</Label>
              <p className="text-sm text-muted-foreground">Visible para todas las sedes</p>
            </div>
            <Switch
              checked={currentEsGlobal}
              onCheckedChange={(v) => setEsGlobal(!!v)}
              disabled={loading}
            />
          </div>

          {!currentEsGlobal && (
            <div className="space-y-2">
              <Label>Sede propietaria</Label>
              <Select
                value={currentSedePropietariaId}
                onValueChange={(v) => setSedePropietariaId(String(v ?? ""))}
                disabled={loading || sedesQuery.loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sede" />
                </SelectTrigger>
                <SelectContent>
                  {(sedesQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {sedesQuery.errorMessage && (
            <p className="text-sm text-destructive">{sedesQuery.errorMessage}</p>
          )}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () =>
                onSubmit({
                  titulo: currentTitulo.trim(),
                  objetivoPrincipal: currentObjetivoPrincipal.trim(),
                  numeroJugadoresMin: currentNumeroJugadoresMin.trim(),
                  esGlobal: currentEsGlobal,
                  sedePropietariaId: currentSedePropietariaId,
                })
              }
              disabled={loading || !isValid}
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

