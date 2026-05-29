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
import { Pencil, Trash2, Phone, Mail, Calendar, Hash } from "lucide-react";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import type { Jugador } from "@/types/jugadores";

interface JugadorDetailDialogProps {
  jugador: Jugador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (jugador: Jugador) => void;
  onDelete: (jugador: Jugador) => void;
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

export function JugadorDetailDialog({
  jugador,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: JugadorDetailDialogProps) {
  const sedesLookup = useSedesLookup();
  const equiposLookup = useEquiposLookup(jugador?.sedeIds ?? []);

  if (!jugador) return null;

  const nombreCompleto = [jugador.nombre, jugador.apellidos].filter(Boolean).join(" ");
  const sedes = (sedesLookup.data ?? [])
    .filter((s) => jugador.sedeIds.includes(s.id))
    .map((s) => s.nombre);
  const equipos = (equiposLookup.data ?? [])
    .filter((e) => jugador.equipoIds.includes(e.id))
    .map((e) => e.nombre);

  const initials = nombreCompleto.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="size-11 shrink-0 rounded-[12px] flex items-center justify-center text-[15px] font-bold"
              style={{ background: "color-mix(in srgb, #10b981 13%, var(--card))", color: "color-mix(in srgb, #10b981 62%, var(--foreground))" }}
            >
              {jugador.dorsal != null ? `#${jugador.dorsal}` : initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{nombreCompleto}</DialogTitle>
              {jugador.posicion && <DialogDescription>{jugador.posicion}</DialogDescription>}
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
            {jugador.dorsal != null && (
              <InfoRow label="Dorsal" value={`#${jugador.dorsal}`} icon={<Hash size={14} className="text-muted-foreground" />} />
            )}
            {jugador.posicion && (
              <InfoRow label="Posición" value={jugador.posicion} />
            )}
            {jugador.pieDominante && (
              <InfoRow label="Pie dominante" value={jugador.pieDominante} />
            )}
            {jugador.telefono && (
              <InfoRow label="Teléfono" value={jugador.telefono} icon={<Phone size={14} className="text-muted-foreground" />} />
            )}
            {jugador.email && (
              <InfoRow label="Email" value={jugador.email} icon={<Mail size={14} className="text-muted-foreground" />} />
            )}
            {jugador.fechaNacimiento && (
              <InfoRow label="Nacimiento" value={jugador.fechaNacimiento} icon={<Calendar size={14} className="text-muted-foreground" />} />
            )}
            {(jugador.tutorNombre || jugador.tutorTelefono) && (
              <InfoRow label="Tutor" value={[jugador.tutorNombre, jugador.tutorTelefono].filter(Boolean).join(" · ")} />
            )}
            <InfoRow
              label={`Sedes (${sedes.length})`}
              value={<ChipList items={sedes} emptyText="Sin sedes" />}
            />
            <InfoRow
              label={`Equipos (${equipos.length})`}
              value={<ChipList items={equipos} emptyText="Sin equipos asignados" />}
            />
            {jugador.notas && (
              <InfoRow label="Notas" value={<span className="text-[13px] text-muted-foreground">{jugador.notas}</span>} />
            )}
          </div>

          <div className="flex items-center gap-[10px] mt-[20px]">
            <button
              type="button"
              onClick={() => { onDelete(jugador); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] border border-destructive/30 bg-destructive/6 px-4 py-[10px] text-[13.5px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { onEdit(jugador); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] bg-primary px-5 py-[10px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110"
            >
              <Pencil size={15} />
              Editar jugador
            </button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
