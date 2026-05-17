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
      <span className="max-w-[220px] truncate text-sm text-muted-foreground">
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
      <SelectTrigger className="w-[220px]" size="sm">
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
