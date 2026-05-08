"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export function SedeSwitcher() {
  const { ready, isSuperAdmin, activeSede, sedesDisponibles, setActiveSede } =
    useWorkspaceContext();

  if (!ready || !activeSede) return null;

  // Rol admin/entrenador/jugador: sede fija, sin selector
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin size={14} className="shrink-0" />
        <span className="max-w-[180px] truncate">{activeSede.nombre}</span>
      </div>
    );
  }

  // Superadmin: desplegable con todas las sedes del workspace
  return (
    <Select
      value={activeSede.id}
      onValueChange={(id) => {
        const sede = sedesDisponibles.find((s) => s.id === id);
        if (sede) setActiveSede(sede);
      }}
    >
      <SelectTrigger className="w-[200px] h-9" size="sm">
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
  );
}
