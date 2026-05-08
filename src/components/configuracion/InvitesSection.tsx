"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { InvitarUsuarioDialog } from "@/components/usuarios/InvitarUsuarioDialog";

export function InvitesSection() {
  const { isWorkspaceAdmin, activeSede } = useWorkspaceContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!isWorkspaceAdmin || !activeSede) return null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="font-semibold">Añadir usuarios a la sede</h2>
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
