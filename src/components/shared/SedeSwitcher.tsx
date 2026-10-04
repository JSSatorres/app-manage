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

const pillBaseClass =
  "flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-foreground shadow-card";

const pillTriggerClass = cn(
  pillBaseClass,
  "transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
  "[&>svg:last-child]:hidden"
);

const pillIconClass = "grid size-6 shrink-0 place-items-center rounded-md";

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
    <div className="flex min-w-0 items-center gap-2">
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
            <span className={cn(pillIconClass, "bg-chart-6/12 text-chart-6")}><Building2 size={14} /></span>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground">Club</span>
              <span className="mt-0.5 max-w-[120px] truncate text-[13px] font-semibold">{activeWorkspace.name}</span>
            </div>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className={cn(pillBaseClass, "hidden sm:flex")}>
          <span className={cn(pillIconClass, "bg-chart-6/12 text-chart-6")}><Building2 size={14} /></span>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground">Club</span>
            <span className="mt-0.5 max-w-[120px] truncate text-[13px] font-semibold">{activeWorkspace.name}</span>
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
            <span className={cn(pillIconClass, "bg-chart-8/12 text-chart-8")}><MapPin size={14} /></span>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground">Sede</span>
              <span className="mt-0.5 max-w-[96px] truncate text-[13px] font-semibold sm:max-w-[140px]">{activeSede.nombre}</span>
            </div>
            <ChevronDown size={14} className="text-muted-foreground shrink-0" />
          </SelectTrigger>
          <SelectContent>
            {sedesDisponibles.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : activeSede ? (
        <div className={cn(pillBaseClass, "min-w-0")}>
          <span className={cn(pillIconClass, "bg-chart-8/12 text-chart-8")}><MapPin size={14} /></span>
          <div className="flex flex-col leading-none min-w-0">
            <span className="text-[10px] font-medium text-muted-foreground">Sede</span>
            <span className="mt-0.5 max-w-[96px] truncate text-[13px] font-semibold sm:max-w-[140px]">{activeSede.nombre}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
