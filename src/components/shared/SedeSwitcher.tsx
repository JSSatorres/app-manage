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
  "flex min-h-11 items-center gap-2 border-l border-border px-2 py-1.5",
  "bg-transparent text-foreground shadow-none",
  "transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
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
    <div className="flex min-w-0 items-center gap-1">
      {/* Club (workspace) */}
      {canSwitchWorkspace ? (
        <Select
          value={activeWorkspace.id}
          onValueChange={(id) => {
            const ws = workspaces.find((w) => w.id === id);
            if (ws) setActiveWorkspace(ws);
          }}
        >
          <SelectTrigger className={cn(pillTriggerClass, "hidden sm:flex")}>
            <Building2 size={15} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Club</span>
              <span className="mt-[1px] max-w-[100px] truncate text-[13px] font-semibold">{activeWorkspace.name}</span>
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
        <div className="hidden min-h-11 items-center gap-2 border-l border-border px-2 py-1.5 sm:flex">
          <Building2 size={15} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Club</span>
            <span className="mt-[1px] max-w-[100px] truncate text-[13px] font-semibold">{activeWorkspace.name}</span>
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
              <span className="mt-[1px] max-w-[88px] truncate text-[13px] font-semibold sm:max-w-[120px]">{activeSede.nombre}</span>
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
        <div className="flex min-h-11 min-w-0 items-center gap-2 border-l border-border px-2 py-1.5">
          <MapPin size={15} className="shrink-0 text-muted-foreground" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sede</span>
            <span className="mt-[1px] max-w-[88px] truncate text-[13px] font-semibold sm:max-w-[120px]">{activeSede.nombre}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
