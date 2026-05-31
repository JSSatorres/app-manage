"use client";

import { useEffect, useMemo, useState } from "react";
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
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { FormField, FormSection, inputClass } from "@/components/shared/FormField";
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
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && (
              <DialogDescription>
                {[initialValue.nombre, initialValue.apellidos].filter(Boolean).join(" ")}
              </DialogDescription>
            )}
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        <DialogBody>
          <div className="grid grid-cols-2 gap-x-[14px] gap-y-[16px]">
            <FormSection label="Datos personales" />

            <FormField label="Nombre" required error={touched && nombre.trim().length < 2 ? "Mínimo 2 caracteres." : undefined}>
              <input className={inputClass} autoComplete="off" value={nombre}
                onChange={(e) => { setNombre(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <FormField label="Apellidos">
              <input className={inputClass} autoComplete="off" value={apellidos}
                onChange={(e) => setApellidos(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Email">
              <input className={inputClass} type="email" autoComplete="off" value={email}
                onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Teléfono">
              <input className={inputClass} autoComplete="off" value={telefono}
                onChange={(e) => setTelefono(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Fecha de nacimiento">
              <input className={inputClass} type="date" value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)} disabled={loading} />
            </FormField>

            <FormSection label="Datos deportivos" />

            <FormField label="Dorsal">
              <input className={inputClass} type="number" min={0} max={999} value={dorsal}
                onChange={(e) => setDorsal(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Posición">
              <input className={inputClass} autoComplete="off" value={posicion} placeholder="Ej: Delantero, Pívot..."
                onChange={(e) => setPosicion(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Pie dominante">
              <select className={inputClass} value={pieDominante || "none"}
                onChange={(e) => setPieDominante(e.target.value === "none" ? "" : e.target.value as PieDominante)}
                disabled={loading}>
                <option value="none">—</option>
                <option value="Diestro">Diestro</option>
                <option value="Zurdo">Zurdo</option>
                <option value="Ambidiestro">Ambidiestro</option>
              </select>
            </FormField>

            <FormSection label="Tutor / Padre" />

            <FormField label="Nombre del tutor">
              <input className={inputClass} autoComplete="off" value={tutorNombre}
                onChange={(e) => setTutorNombre(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Teléfono del tutor">
              <input className={inputClass} autoComplete="off" value={tutorTelefono}
                onChange={(e) => setTutorTelefono(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Notas" fullWidth>
              <textarea className={inputClass} value={notas} rows={3}
                onChange={(e) => setNotas(e.target.value)} disabled={loading} />
            </FormField>

            <FormSection label="Sedes" />
            <div className="col-span-2">
              <MultiCheckboxList
                options={sedeOptions} value={sedeIds}
                onChange={(next) => { setSedeIds(next); setTouched(true); setEquipoIds((prev) => prev.filter((eid) => equipoOptions.some((o) => o.id === eid))); }}
                disabled={loading || sedesQuery.loading}
              />
              {touched && sedeIds.length === 0 && (
                <p className="mt-[6px] text-[12px] text-destructive">Selecciona al menos una sede.</p>
              )}
            </div>

            <FormSection label="Equipos" />
            <div className="col-span-2">
              <MultiCheckboxList
                options={equipoOptions} value={equipoIds} onChange={setEquipoIds}
                disabled={loading || equiposQuery.loading}
                emptyText="Selecciona primero una sede para ver sus equipos."
              />
            </div>
          </div>

          {errorMessage && (
            <p className="mt-[14px] text-[12.5px] text-destructive">{errorMessage}</p>
          )}
        </DialogBody>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} disabled={loading}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
            Cancelar
          </button>
          <div className="flex-1" />
          <button type="button" disabled={loading || !isValid}
            onClick={() => onSubmit({
              nombre: nombre.trim(), apellidos: apellidos.trim() || null, email: email.trim() || null,
              telefono: telefono.trim() || null, fechaNacimiento: fechaNacimiento || null,
              dorsal: dorsal.trim() === "" ? null : Number(dorsal), posicion: posicion.trim() || null,
              pieDominante: pieDominante || null, notas: notas.trim() || null,
              tutorNombre: tutorNombre.trim() || null, tutorTelefono: tutorTelefono.trim() || null,
              sedeIds, equipoIds,
            })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
