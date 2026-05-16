"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MapPin, Building2 } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 h-9">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex flex-col leading-none min-w-0">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <span className="text-sm font-semibold text-foreground truncate max-w-[130px]">{value}</span>
      </div>
    </div>
  );
}

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
      {/* Club (workspace) */}
      {canSwitchWorkspace ? (
        <Select
          value={activeWorkspace.id}
          onValueChange={(id) => {
            const ws = workspaces.find((w) => w.id === id);
            if (ws) setActiveWorkspace(ws);
          }}
        >
          <SelectTrigger className="h-9 min-w-[140px] max-w-[200px]" size="sm">
            <Building2 size={14} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col leading-none text-left min-w-0">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Club</span>
              {/* Nombre explícito para evitar que SelectValue muestre el UUID */}
              <span className="text-sm font-semibold truncate max-w-[130px]">{activeWorkspace.name}</span>
            </div>
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
        <InfoChip
          icon={<Building2 size={14} />}
          label="Club"
          value={activeWorkspace.name}
        />
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
          <SelectTrigger className="h-9 min-w-[140px] max-w-[200px]" size="sm">
            <MapPin size={14} className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col leading-none text-left min-w-0">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Sede</span>
              {/* Nombre explícito para evitar que SelectValue muestre el UUID */}
              <span className="text-sm font-semibold truncate max-w-[130px]">{activeSede.nombre}</span>
            </div>
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
        <InfoChip
          icon={<MapPin size={14} />}
          label="Sede"
          value={activeSede.nombre}
        />
      ) : null}
    </div>
  );
}
