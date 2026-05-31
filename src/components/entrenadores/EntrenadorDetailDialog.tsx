"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogClose,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Phone, Mail, Calendar, Award } from "lucide-react";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import type { Entrenador } from "@/types/entrenadores";

interface EntrenadorDetailDialogProps {
  entrenador: Entrenador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (entrenador: Entrenador) => void;
  onDelete: (entrenador: Entrenador) => void;
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-[11px] border-b border-border last:border-0">
      <p className="w-[120px] shrink-0 text-[12.5px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex-1 flex items-center gap-[6px] text-[14px] text-foreground">
        {icon}
        {value}
      </div>
    </div>
  );
}

function ChipList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) return <span className="text-muted-foreground text-[13px]">{emptyText}</span>;
  return (
    <div className="flex flex-wrap gap-[6px]">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center rounded-[7px] border border-border bg-secondary/60 px-[9px] py-[3px] text-[12.5px] font-medium text-foreground">
          {item}
        </span>
      ))}
    </div>
  );
}

export function EntrenadorDetailDialog({
  entrenador,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EntrenadorDetailDialogProps) {
  const sedesLookup = useSedesLookup();
  const equiposLookup = useEquiposLookup(entrenador?.sedeIds ?? []);

  if (!entrenador) return null;

  const nombreCompleto = [entrenador.nombre, entrenador.apellidos].filter(Boolean).join(" ");
  const sedes = (sedesLookup.data ?? [])
    .filter((s) => entrenador.sedeIds.includes(s.id))
    .map((s) => s.nombre);
  const equipos = (equiposLookup.data ?? [])
    .filter((e) => entrenador.equipoIds.includes(e.id))
    .map((e) => e.nombre);

  const initials = nombreCompleto.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="size-11 shrink-0 rounded-[12px] flex items-center justify-center text-[15px] font-bold"
              style={{ background: "color-mix(in srgb, #f59e0b 13%, var(--card))", color: "color-mix(in srgb, #f59e0b 62%, var(--foreground))" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{nombreCompleto}</DialogTitle>
              {entrenador.titulacion && <DialogDescription>{entrenador.titulacion}</DialogDescription>}
            </div>
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        <DialogBody>
          <div className="divide-y divide-border">
            {entrenador.telefono && (
              <InfoRow label="Teléfono" value={entrenador.telefono} icon={<Phone size={14} className="text-muted-foreground" />} />
            )}
            {entrenador.email && (
              <InfoRow label="Email" value={entrenador.email} icon={<Mail size={14} className="text-muted-foreground" />} />
            )}
            {entrenador.fechaNacimiento && (
              <InfoRow label="Nacimiento" value={entrenador.fechaNacimiento} icon={<Calendar size={14} className="text-muted-foreground" />} />
            )}
            {entrenador.titulacion && (
              <InfoRow label="Titulación" value={entrenador.titulacion} icon={<Award size={14} className="text-muted-foreground" />} />
            )}
            <InfoRow
              label={`Sedes (${sedes.length})`}
              value={<ChipList items={sedes} emptyText="Sin sedes" />}
            />
            <InfoRow
              label={`Equipos (${equipos.length})`}
              value={<ChipList items={equipos} emptyText="Sin equipos asignados" />}
            />
            {entrenador.notas && (
              <InfoRow label="Notas" value={<span className="text-[13px] text-muted-foreground">{entrenador.notas}</span>} />
            )}
          </div>

          <div className="flex items-center gap-[10px] mt-[20px]">
            <button
              type="button"
              onClick={() => { onDelete(entrenador); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] border border-destructive/30 bg-destructive/6 px-4 py-[10px] text-[13.5px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { onEdit(entrenador); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] bg-primary px-5 py-[10px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110"
            >
              <Pencil size={15} />
              Editar entrenador
            </button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
