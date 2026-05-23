"use client";

import { useEffect, useMemo, useState } from "react";
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
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEntrenadoresLookup } from "@/hooks/useEntrenadoresLookup";
import { useJugadoresLookup } from "@/hooks/useJugadoresLookup";
import type { Equipo, EquipoCreateInput } from "@/types/equipos";

export type EquipoFormValue = Omit<EquipoCreateInput, "workspaceId">;

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
  const [entrenadorIds, setEntrenadorIds] = useState<string[]>([]);
  const [jugadorIds, setJugadorIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  const entrenadoresQuery = useEntrenadoresLookup(sedeId || null);
  const jugadoresQuery = useJugadoresLookup(sedeId || null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(initialValue?.nombre ?? "");
      setCategoria(initialValue?.categoria ?? "");
      setSedeId(initialValue?.sedeId ?? "");
      setEntrenadorIds(initialValue?.entrenadorIds ?? []);
      setJugadorIds(initialValue?.jugadorIds ?? []);
      setTouched(false);
    });
  }, [open, initialValue]);

  // Al cambiar sede, limpiar entrenadores y jugadores que no pertenecen a la nueva sede
  useEffect(() => {
    const entOptions = (entrenadoresQuery.data ?? []).map((e) => e.id);
    const jugOptions = (jugadoresQuery.data ?? []).map((j) => j.id);
    setEntrenadorIds((prev) => prev.filter((id) => entOptions.includes(id)));
    setJugadorIds((prev) => prev.filter((id) => jugOptions.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId]);

  const entrenadorOptions = useMemo(
    () =>
      (entrenadoresQuery.data ?? []).map((e) => ({
        id: e.id,
        label: [e.nombre, e.apellidos].filter(Boolean).join(" "),
      })),
    [entrenadoresQuery.data],
  );

  const jugadorOptions = useMemo(
    () =>
      (jugadoresQuery.data ?? []).map((j) => ({
        id: j.id,
        label: [
          j.dorsal != null ? `#${j.dorsal}` : null,
          j.nombre,
          j.apellidos,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [jugadoresQuery.data],
  );

  const isValid = nombre.trim().length >= 2 && !!sedeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eq-nombre">Nombre *</Label>
            <Input
              id="eq-nombre"
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
            <Label htmlFor="eq-categoria">Categoría</Label>
            <Input
              id="eq-categoria"
              autoComplete="off"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={loading}
              placeholder="Ej: B1, Sub-16, Absoluto..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Sede *</Label>
            <Select
              value={sedeId}
              onValueChange={(v) => {
                setSedeId(String(v ?? ""));
                setTouched(true);
              }}
              disabled={loading || sedesQuery.loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede">
                  {!sedesQuery.loading && sedeId
                    ? ((sedesQuery.data ?? []).find((s) => s.id === sedeId)?.nombre ?? "Selecciona una sede")
                    : undefined}
                </SelectValue>
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

          <div className="space-y-2 md:col-span-2">
            <Label>Entrenadores</Label>
            <MultiCheckboxList
              options={entrenadorOptions}
              value={entrenadorIds}
              onChange={setEntrenadorIds}
              disabled={loading || entrenadoresQuery.loading || !sedeId}
              emptyText={
                sedeId
                  ? "No hay entrenadores en esta sede."
                  : "Selecciona primero una sede para ver sus entrenadores."
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Jugadores</Label>
            <MultiCheckboxList
              options={jugadorOptions}
              value={jugadorIds}
              onChange={setJugadorIds}
              disabled={loading || jugadoresQuery.loading || !sedeId}
              emptyText={
                sedeId
                  ? "No hay jugadores en esta sede."
                  : "Selecciona primero una sede para ver sus jugadores."
              }
            />
          </div>
        </div>

        {sedesQuery.errorMessage && (
          <p className="text-sm text-destructive mt-2">{sedesQuery.errorMessage}</p>
        )}
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
                categoria: categoria.trim() || null,
                sedeId,
                entrenadorIds,
                jugadorIds,
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
