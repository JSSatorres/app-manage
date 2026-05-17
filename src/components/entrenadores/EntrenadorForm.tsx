"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import type { Entrenador, EntrenadorCreateInput } from "@/types/entrenadores";

export type EntrenadorFormValue = Omit<EntrenadorCreateInput, "workspaceId">;

interface EntrenadorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Entrenador | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: EntrenadorFormValue) => Promise<void> | void;
}

export function EntrenadorForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: EntrenadorFormProps) {
  const sedesQuery = useSedesLookup();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [titulacion, setTitulacion] = useState("");
  const [notas, setNotas] = useState("");
  const [sedeIds, setSedeIds] = useState<string[]>([]);
  const [equipoIds, setEquipoIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  const equiposQuery = useEquiposLookup(sedeIds);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(initialValue?.nombre ?? "");
      setApellidos(initialValue?.apellidos ?? "");
      setEmail(initialValue?.email ?? "");
      setTelefono(initialValue?.telefono ?? "");
      setFechaNacimiento(initialValue?.fechaNacimiento ?? "");
      setTitulacion(initialValue?.titulacion ?? "");
      setNotas(initialValue?.notas ?? "");
      setSedeIds(initialValue?.sedeIds ?? []);
      setEquipoIds(initialValue?.equipoIds ?? []);
      setTouched(false);
    });
  }, [open, initialValue]);

  const sedeOptions = useMemo(
    () => (sedesQuery.data ?? []).map((s) => ({ id: s.id, label: s.nombre })),
    [sedesQuery.data],
  );
  const equipoOptions = useMemo(
    () => (equiposQuery.data ?? []).map((e) => ({ id: e.id, label: e.nombre })),
    [equiposQuery.data],
  );

  const isValid = nombre.trim().length >= 2 && sedeIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ent-nombre">Nombre *</Label>
            <Input
              id="ent-nombre"
              autoComplete="off"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && nombre.trim().length < 2 && (
              <p className="text-sm text-destructive">Mínimo 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-apellidos">Apellidos</Label>
            <Input
              id="ent-apellidos"
              autoComplete="off"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-email">Email</Label>
            <Input
              id="ent-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-telefono">Teléfono</Label>
            <Input
              id="ent-telefono"
              autoComplete="off"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-fnac">Fecha de nacimiento</Label>
            <Input
              id="ent-fnac"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ent-titulacion">Titulación</Label>
            <Input
              id="ent-titulacion"
              autoComplete="off"
              value={titulacion}
              onChange={(e) => setTitulacion(e.target.value)}
              disabled={loading}
              placeholder="Ej: UEFA B, Monitor..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Sedes *</Label>
            <MultiCheckboxList
              options={sedeOptions}
              value={sedeIds}
              onChange={(next) => {
                setSedeIds(next);
                setTouched(true);
                // limpiar equipos que no pertenecen a las sedes activas
                setEquipoIds((prev) =>
                  prev.filter((eid) => equipoOptions.some((o) => o.id === eid)),
                );
              }}
              disabled={loading || sedesQuery.loading}
            />
            {touched && sedeIds.length === 0 && (
              <p className="text-sm text-destructive">Selecciona al menos una sede.</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Equipos</Label>
            <MultiCheckboxList
              options={equipoOptions}
              value={equipoIds}
              onChange={setEquipoIds}
              disabled={loading || equiposQuery.loading}
              emptyText="Selecciona primero una sede para ver sus equipos."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ent-notas">Notas</Label>
            <Textarea
              id="ent-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        {errorMessage && <p className="text-sm text-destructive mt-2">{errorMessage}</p>}

        <div className="flex justify-end gap-2 mt-4">
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
            onClick={() =>
              onSubmit({
                nombre: nombre.trim(),
                apellidos: apellidos.trim() || null,
                email: email.trim() || null,
                telefono: telefono.trim() || null,
                fechaNacimiento: fechaNacimiento || null,
                titulacion: titulacion.trim() || null,
                notas: notas.trim() || null,
                sedeIds,
                equipoIds,
              })
            }
            disabled={loading || !isValid}
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
