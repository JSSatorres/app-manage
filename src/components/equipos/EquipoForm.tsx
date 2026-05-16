"use client";

import { useEffect, useState } from "react";
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

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [touched, setTouched] = useState(false);

  // Reiniciar campos cada vez que se abre el dialog
  useEffect(() => {
    if (!open) return;
    const nombre = initialValue?.nombre ?? "";
    const categoria = initialValue?.categoria ?? "";
    const sedeId = initialValue?.sedeId ?? "";
    queueMicrotask(() => {
      setNombre(nombre);
      setCategoria(categoria);
      setSedeId(sedeId);
      setTouched(false);
    });
  }, [open, initialValue]);

  const isValid = nombre.trim().length >= 2 && !!sedeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipo-nombre">Nombre</Label>
            <Input
              id="equipo-nombre"
              autoComplete="off"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && nombre.trim().length < 2 && (
              <p className="text-sm text-destructive">El nombre debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipo-categoria">Categoría</Label>
            <Input
              id="equipo-categoria"
              autoComplete="off"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={loading}
              placeholder="Ej: B1, C2"
            />
          </div>

          <div className="space-y-2">
            <Label>Sede</Label>
            <Select
              value={sedeId}
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
            {touched && !sedeId && (
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
                  nombre: nombre.trim(),
                  categoria: categoria.trim(),
                  sedeId,
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
