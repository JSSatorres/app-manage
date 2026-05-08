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
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Equipo } from "@/types/equipos";

interface EquipoFormValue {
  nombre: string;
  categoria: string;
  sedeId: string;
}

interface EquipoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Equipo | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EquipoFormValue) => Promise<void> | void;
}

export function EquipoForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EquipoFormProps) {
  const sedesQuery = useSedesLookup();

  const defaultValue = useMemo<EquipoFormValue>(() => {
    return {
      nombre: initialValue?.nombre ?? "",
      categoria: initialValue?.categoria ?? "",
      sedeId: initialValue?.sedeId ?? "",
    };
  }, [initialValue]);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [touched, setTouched] = useState(false);
  const currentNombre = open ? defaultValue.nombre : nombre;
  const currentCategoria = open ? defaultValue.categoria : categoria;
  const currentSedeId = open ? defaultValue.sedeId : sedeId;

  const isValid = currentNombre.trim().length >= 2 && !!currentSedeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={currentNombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && currentNombre.trim().length < 2 && (
              <p className="text-sm text-destructive">El nombre debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Input
              id="categoria"
              value={currentCategoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={loading}
              placeholder="Ej: B1, C2"
            />
          </div>

          <div className="space-y-2">
            <Label>Sede</Label>
            <Select
              value={currentSedeId}
              onValueChange={(v) => {
                setSedeId(String(v ?? ""));
                setTouched(true);
              }}
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
            {touched && !currentSedeId && (
              <p className="text-sm text-destructive">Selecciona una sede.</p>
            )}
          </div>

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
                  nombre: currentNombre.trim(),
                  categoria: currentCategoria.trim(),
                  sedeId: currentSedeId,
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

