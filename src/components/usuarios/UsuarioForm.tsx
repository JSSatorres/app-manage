"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { editUsuarioSchema, type EditUsuarioValues } from "@/schemas/usuario.schema";
import type { Usuario } from "@/types/usuarios";

interface UsuarioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Usuario | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: EditUsuarioValues) => Promise<void> | void;
}

const ROL_OPTIONS: { value: EditUsuarioValues["rol"]; label: string }[] = [
  { value: "admin", label: "Admin de sede" },
  { value: "gerente_sede", label: "Gerente de sede" },
  { value: "entrenador", label: "Entrenador" },
  { value: "jugador", label: "Jugador" },
];

function isRolAsignable(value: string): value is EditUsuarioValues["rol"] {
  return ROL_OPTIONS.some((r) => r.value === value);
}

/** Form de edición de usuario (nombre, teléfono, rol en el workspace activo). */
export function UsuarioForm({
  open,
  onOpenChange,
  usuario,
  loading = false,
  errorMessage,
  onSubmit,
}: UsuarioFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUsuarioValues>({
    resolver: zodResolver(editUsuarioSchema),
    defaultValues: { nombre: "", telefono: "", rol: "entrenador" },
  });

  useEffect(() => {
    if (!open || !usuario) return;
    queueMicrotask(() => {
      reset({
        nombre: usuario.nombre ?? "",
        telefono: usuario.telefono ?? "",
        rol: isRolAsignable(usuario.workspaceRol) ? usuario.workspaceRol : "entrenador",
      });
    });
  }, [open, usuario, reset]);

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>Editar usuario</DialogTitle>
            {usuario && <DialogDescription>{usuario.email}</DialogDescription>}
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
            onClick={handleClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit((values) => onSubmit(values))}>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="usuario-nombre">Nombre</Label>
                <Input id="usuario-nombre" disabled={loading} {...register("nombre")} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usuario-telefono">Teléfono</Label>
                <Input id="usuario-telefono" disabled={loading} {...register("telefono")} />
                {errors.telefono && <p className="text-xs text-destructive">{errors.telefono.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usuario-rol">Rol</Label>
                <Controller
                  control={control}
                  name="rol"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                      disabled={loading}
                    >
                      <SelectTrigger id="usuario-rol" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROL_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.rol && <p className="text-xs text-destructive">{errors.rol.message}</p>}
              </div>

              {errorMessage && <p className="text-[12.5px] text-destructive">{errorMessage}</p>}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
