"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { InvitarUsuarioDialog } from "@/components/usuarios/InvitarUsuarioDialog";

export function InvitesSection() {
  const { isAdmin, activeSede } = useWorkspaceContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isAdmin || !activeSede) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Añadir usuarios a la sede</h2>
      <p className="text-sm text-muted-foreground">
        Genera un enlace de invitación para que el usuario acceda con su email y contraseña.
      </p>
      <Button type="button" onClick={() => setDialogOpen(true)}>
        Añadir usuario
      </Button>
      <InvitarUsuarioDialog
        open={dialogOpen}
        sedeId={activeSede.id}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
