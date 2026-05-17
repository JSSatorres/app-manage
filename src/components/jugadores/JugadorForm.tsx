"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import type { Jugador, JugadorCreateInput, PieDominante } from "@/types/jugadores";

export type JugadorFormValue = Omit<JugadorCreateInput, "workspaceId">;

interface JugadorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Jugador | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: JugadorFormValue) => Promise<void> | void;
}

export function JugadorForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: JugadorFormProps) {
  const sedesQuery = useSedesLookup();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [dorsal, setDorsal] = useState<string>("");
  const [posicion, setPosicion] = useState("");
  const [pieDominante, setPieDominante] = useState<PieDominante | "">("");
  const [tutorNombre, setTutorNombre] = useState("");
  const [tutorTelefono, setTutorTelefono] = useState("");
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
      setDorsal(initialValue?.dorsal != null ? String(initialValue.dorsal) : "");
      setPosicion(initialValue?.posicion ?? "");
      setPieDominante((initialValue?.pieDominante ?? "") as PieDominante | "");
      setTutorNombre(initialValue?.tutorNombre ?? "");
      setTutorTelefono(initialValue?.tutorTelefono ?? "");
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
            <Label htmlFor="jug-nombre">Nombre *</Label>
            <Input
              id="jug-nombre"
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
            <Label htmlFor="jug-apellidos">Apellidos</Label>
            <Input
              id="jug-apellidos"
              autoComplete="off"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-email">Email</Label>
            <Input
              id="jug-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-telefono">Teléfono</Label>
            <Input
              id="jug-telefono"
              autoComplete="off"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-fnac">Fecha de nacimiento</Label>
            <Input
              id="jug-fnac"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-dorsal">Dorsal</Label>
            <Input
              id="jug-dorsal"
              type="number"
              min={0}
              max={999}
              value={dorsal}
              onChange={(e) => setDorsal(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-posicion">Posición</Label>
            <Input
              id="jug-posicion"
              autoComplete="off"
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              disabled={loading}
              placeholder="Ej: Delantero, Pívot..."
            />
          </div>

          <div className="space-y-2">
            <Label>Pie dominante</Label>
            <Select
              value={pieDominante || "none"}
              onValueChange={(v) =>
                setPieDominante(v === "none" ? "" : (v as PieDominante))
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="Diestro">Diestro</SelectItem>
                <SelectItem value="Zurdo">Zurdo</SelectItem>
                <SelectItem value="Ambidiestro">Ambidiestro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-tutor">Tutor / Padre</Label>
            <Input
              id="jug-tutor"
              autoComplete="off"
              value={tutorNombre}
              onChange={(e) => setTutorNombre(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jug-tutor-tel">Teléfono tutor</Label>
            <Input
              id="jug-tutor-tel"
              autoComplete="off"
              value={tutorTelefono}
              onChange={(e) => setTutorTelefono(e.target.value)}
              disabled={loading}
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
            <Label htmlFor="jug-notas">Notas</Label>
            <Textarea
              id="jug-notas"
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
                dorsal: dorsal.trim() === "" ? null : Number(dorsal),
                posicion: posicion.trim() || null,
                pieDominante: pieDominante || null,
                notas: notas.trim() || null,
                tutorNombre: tutorNombre.trim() || null,
                tutorTelefono: tutorTelefono.trim() || null,
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
