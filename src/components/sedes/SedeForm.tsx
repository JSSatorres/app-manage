"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Sede } from "@/types/sedes";

interface SedeFormValue {
  nombre: string;
  direccion: string;
}

interface SedeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Sede | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SedeFormValue) => Promise<void> | void;
}

export function SedeForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: SedeFormProps) {
  const defaultValue = useMemo<SedeFormValue>(() => {
    return {
      nombre: initialValue?.nombre ?? "",
      direccion: initialValue?.direccion ?? "",
    };
  }, [initialValue]);

  const [nombre, setNombre] = useState(defaultValue.nombre);
  const [direccion, setDireccion] = useState(defaultValue.direccion);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(defaultValue.nombre);
      setDireccion(defaultValue.direccion);
      setTouched(false);
    });
  }, [open, defaultValue]);

  const isValid = nombre.trim().length >= 2;

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
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && !isValid && (
              <p className="text-sm text-destructive">El nombre debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={loading}
            />
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () =>
                onSubmit({ nombre: nombre.trim(), direccion: direccion.trim() })
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

