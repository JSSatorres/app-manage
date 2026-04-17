"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ParametroSistema } from "@/types/parametros";

interface ParametroFormValue {
  nombre: string;
  activo: boolean;
}

interface ParametroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: ParametroSistema | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: ParametroFormValue) => Promise<void> | void;
}

export function ParametroForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: ParametroFormProps) {
  const defaultValue = useMemo<ParametroFormValue>(() => {
    return {
      nombre: initialValue?.nombre ?? "",
      activo: initialValue?.activo ?? true,
    };
  }, [initialValue]);

  const [nombre, setNombre] = useState(defaultValue.nombre);
  const [activo, setActivo] = useState(defaultValue.activo);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(defaultValue.nombre);
      setActivo(defaultValue.activo);
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
              placeholder="Ej: Material"
              disabled={loading}
            />
            {touched && !isValid && (
              <p className="text-sm text-destructive">El nombre debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Activo</p>
              <p className="text-xs text-muted-foreground">Disponible en formularios y filtros</p>
            </div>
            <Switch checked={activo} onCheckedChange={setActivo} disabled={loading} />
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () => onSubmit({ nombre: nombre.trim(), activo })}
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

