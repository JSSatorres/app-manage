"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MapPin, Building2, ChevronDown } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { cn } from "@/lib/utils";

const pillTriggerClass = cn(
  "flex items-center gap-2 rounded-[9px] px-[10px] py-[6px] h-auto",
  "border-0 bg-transparent text-foreground shadow-none",
  "transition-colors hover:bg-secondary focus:ring-0 focus:ring-offset-0",
  "[&>svg:last-child]:hidden"
);

export function SedeSwitcher() {
  const {
    ready,
    activeWorkspace,
    workspaces,
    setActiveWorkspace,
    activeSede,
    sedesDisponibles,
    setActiveSede,
  } = useWorkspaceContext();

  if (!ready || !activeWorkspace) return null;

  const canSwitchWorkspace = workspaces.length > 1;
  const canSwitchSede = sedesDisponibles.length > 1;

  return (
    <div className="flex items-center gap-1">
      {/* Club (workspace) */}
      {canSwitchWorkspace ? (
        <Select
          value={activeWorkspace.id}
          onValueChange={(id) => {
            const ws = workspaces.find((w) => w.id === id);
            if (ws) setActiveWorkspace(ws);
          }}
        >
          <SelectTrigger className={pillTriggerClass}>
            <Building2 size={15} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Club</span>
              <span className="mt-[1px] text-[13px] font-semibold truncate max-w-[120px]">{activeWorkspace.name}</span>
            </div>
            <ChevronDown size={15} className="text-muted-foreground shrink-0" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2 rounded-[9px] px-[10px] py-[6px]">
          <Building2 size={15} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Club</span>
            <span className="mt-[1px] text-[13px] font-semibold truncate max-w-[120px]">{activeWorkspace.name}</span>
          </div>
        </div>
      )}

      {/* Sede */}
      {activeSede && canSwitchSede ? (
        <Select
          value={activeSede.id}
          onValueChange={(id) => {
            const sede = sedesDisponibles.find((s) => s.id === id);
            if (sede) setActiveSede(sede);
          }}
        >
          <SelectTrigger className={pillTriggerClass}>
            <MapPin size={15} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sede</span>
              <span className="mt-[1px] text-[13px] font-semibold truncate max-w-[120px]">{activeSede.nombre}</span>
            </div>
            <ChevronDown size={15} className="text-muted-foreground shrink-0" />
          </SelectTrigger>
          <SelectContent>
            {sedesDisponibles.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : activeSede ? (
        <div className="flex items-center gap-2 rounded-[9px] px-[10px] py-[6px]">
          <MapPin size={15} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sede</span>
            <span className="mt-[1px] text-[13px] font-semibold truncate max-w-[120px]">{activeSede.nombre}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
