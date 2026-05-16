"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Building2 } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";

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
    <div className="flex items-center gap-2">
      {/* Selector de club (workspace) — solo si pertenece a más de uno */}
      {canSwitchWorkspace ? (
        <Select
          value={activeWorkspace.id}
          onValueChange={(id) => {
            const ws = workspaces.find((w) => w.id === id);
            if (ws) setActiveWorkspace(ws);
          }}
        >
          <SelectTrigger className="w-[160px] h-9" size="sm">
            <Building2 size={14} className="shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Club" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 size={14} className="shrink-0" />
          <span className="max-w-[140px] truncate">{activeWorkspace.name}</span>
        </div>
      )}

      {/* Selector de sede — solo si hay más de una en el workspace */}
      {activeSede && canSwitchSede ? (
        <Select
          value={activeSede.id}
          onValueChange={(id) => {
            const sede = sedesDisponibles.find((s) => s.id === id);
            if (sede) setActiveSede(sede);
          }}
        >
          <SelectTrigger className="w-[160px] h-9" size="sm">
            <MapPin size={14} className="shrink-0 text-muted-foreground" />
            <SelectValue placeholder="Sede" />
          </SelectTrigger>
          <SelectContent>
            {sedesDisponibles.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : activeSede ? (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin size={14} className="shrink-0" />
          <span className="max-w-[140px] truncate">{activeSede.nombre}</span>
        </div>
      ) : null}
    </div>
  );
}
