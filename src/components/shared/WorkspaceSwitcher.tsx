"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { getOptionalEnv } from "@/lib/env";

export function WorkspaceSwitcher() {
  const {
    ready,
    memberships,
    activeWorkspaceId,
    setActiveWorkspaceId,
    bootstrapErrorMessage,
    ensureWorkspace,
    canSwitchWorkspace,
  } = useWorkspaceContext();

  if (!ready) return null;

  if (memberships.length === 0) {
    let supabaseHost = "";
    try {
      const url = getOptionalEnv().supabaseUrl;
      supabaseHost = url ? new URL(url).host : "";
    } catch {
      supabaseHost = "";
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sin espacios</span>
        <Button type="button" variant="outline" size="sm" onClick={ensureWorkspace}>
          Crear espacio
        </Button>
        {supabaseHost && (
          <span className="text-sm text-muted-foreground">({supabaseHost})</span>
        )}
        {bootstrapErrorMessage && (
          <span className="max-w-[260px] truncate text-sm text-destructive">
            {bootstrapErrorMessage}
          </span>
        )}
      </div>
    );
  }

  if (memberships.length === 1) {
    return (
      <span className="max-w-[220px] truncate text-sm text-muted-foreground">
        {memberships[0].name}
      </span>
    );
  }

  if (!canSwitchWorkspace) {
    const current =
      memberships.find((m) => m.workspaceId === activeWorkspaceId) ?? memberships[0];
    return (
      <span className="max-w-[220px] truncate text-sm text-muted-foreground">
        {current?.name ?? "Sin espacios"}
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
