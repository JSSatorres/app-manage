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
import { Pencil, Trash2, Users, UserCog, MapPin, Tag } from "lucide-react";
import { useEntrenadoresLookup } from "@/hooks/useEntrenadoresLookup";
import { useJugadoresLookup } from "@/hooks/useJugadoresLookup";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import type { Equipo } from "@/types/equipos";
import { cn } from "@/lib/utils";

interface EquipoDetailDialogProps {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (equipo: Equipo) => void;
  onDelete: (equipo: Equipo) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-[11px] border-b border-border last:border-0">
      <p className="w-[120px] shrink-0 text-[12.5px] font-semibold text-muted-foreground">{label}</p>
      <div className="flex-1 text-[14px] text-foreground">{value}</div>
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

export function EquipoDetailDialog({
  equipo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EquipoDetailDialogProps) {
  const sedesLookup = useSedesLookup();
  const entrenadoresLookup = useEntrenadoresLookup(equipo?.sedeId ?? null);
  const jugadoresLookup = useJugadoresLookup(equipo?.sedeId ?? null);

  if (!equipo) return null;

  const sedeName = (sedesLookup.data ?? []).find((s) => s.id === equipo.sedeId)?.nombre ?? equipo.sedeId;
  const entrenadores = (entrenadoresLookup.data ?? [])
    .filter((e) => equipo.entrenadorIds.includes(e.id))
    .map((e) => [e.nombre, e.apellidos].filter(Boolean).join(" "));
  const jugadores = (jugadoresLookup.data ?? [])
    .filter((j) => equipo.jugadorIds.includes(j.id))
    .map((j) => [j.dorsal != null ? `#${j.dorsal}` : null, j.nombre, j.apellidos].filter(Boolean).join(" "));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="size-11 shrink-0 rounded-[12px] flex items-center justify-center text-[16px] font-bold"
              style={{ background: "color-mix(in srgb, #3358ff 13%, var(--card))", color: "color-mix(in srgb, #3358ff 62%, var(--foreground))" }}
            >
              {equipo.nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>{equipo.nombre}</DialogTitle>
              {equipo.categoria && <DialogDescription>{equipo.categoria}</DialogDescription>}
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
            <InfoRow label="Sede" value={
              <span className="flex items-center gap-[6px]"><MapPin size={14} className="text-muted-foreground shrink-0" />{sedeName}</span>
            } />
            {equipo.categoria && (
              <InfoRow label="Categoría" value={
                <span className="flex items-center gap-[6px]"><Tag size={14} className="text-muted-foreground shrink-0" />{equipo.categoria}</span>
              } />
            )}
            <InfoRow
              label={`Entrenadores (${entrenadores.length})`}
              value={<ChipList items={entrenadores} emptyText="Sin entrenadores asignados" />}
            />
            <InfoRow
              label={`Jugadores (${jugadores.length})`}
              value={<ChipList items={jugadores} emptyText="Sin jugadores asignados" />}
            />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-[10px] mt-[20px]">
            <button
              type="button"
              onClick={() => { onDelete(equipo); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] border border-destructive/30 bg-destructive/6 px-4 py-[10px] text-[13.5px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => { onEdit(equipo); onOpenChange(false); }}
              className="inline-flex items-center gap-[7px] rounded-[10px] bg-primary px-5 py-[10px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110"
            >
              <Pencil size={15} />
              Editar equipo
            </button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
