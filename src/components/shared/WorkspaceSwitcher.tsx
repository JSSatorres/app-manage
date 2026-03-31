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
  const { ready, memberships, activeWorkspaceId, setActiveWorkspaceId } =
    useWorkspaceContext();

  if (!ready) return null;

  if (memberships.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Sin espacios</span>
    );
  }

  if (memberships.length === 1) {
    return (
      <span className="max-w-[220px] truncate text-sm text-muted-foreground">
        {memberships[0].name}
      </span>
    );
  }

  return (
    <Select
      value={activeWorkspaceId ?? undefined}
      onValueChange={(v) => setActiveWorkspaceId(String(v ?? ""))}
    >
      <SelectTrigger className="w-[220px]" size="sm">
        <SelectValue placeholder="Espacio" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <SelectItem key={m.workspaceId} value={m.workspaceId}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
