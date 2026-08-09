"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export function WorkspaceSwitcher() {
  const { ready, isSuperAdmin, activeSede, sedesDisponibles, setActiveSede } =
    useWorkspaceContext();

  if (!ready) return null;

  // Solo el SuperAdmin necesita el selector — el resto tiene solo una sede
  if (!isSuperAdmin || sedesDisponibles.length <= 1) {
    return (
      <span className="max-w-[220px] border-l border-border pl-3 text-sm font-medium text-muted-foreground truncate">
        {activeSede?.nombre ?? "Sin sede"}
      </span>
    );
  }

  return (
    <Select
      value={activeSede?.id ?? undefined}
      onValueChange={(id) => {
        const sede = sedesDisponibles.find((s) => s.id === id) ?? null;
        setActiveSede(sede);
      }}
    >
      <SelectTrigger className="h-11 w-[220px] border-l border-border bg-transparent shadow-none focus-visible:ring-2 focus-visible:ring-ring" size="sm">
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
