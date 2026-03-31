"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export function InvitesSection() {
  const { activeWorkspaceId, isWorkspaceAdmin, refresh } = useWorkspaceContext();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isWorkspaceAdmin) return null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="font-semibold">Invitar personas</h2>
      <p className="text-sm text-muted-foreground">
        El invitado debe usar el mismo email que indiques (por ejemplo su cuenta Google).
        Envía el enlace generado.
      </p>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      {link && <p className="break-all text-sm text-muted-foreground">{link}</p>}
      <Button
        type="button"
        disabled={loading || !email.trim() || !activeWorkspaceId}
        onClick={async () => {
          if (!activeWorkspaceId) return;
          setLoading(true);
          setErrorMessage(null);
          setLink(null);
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.rpc("create_workspace_invitation", {
            p_workspace_id: activeWorkspaceId,
            p_email: email.trim(),
            p_role: "member",
          });
          if (error) {
            setLoading(false);
            setErrorMessage(error.message);
            return;
          }
          setLoading(false);
          const token = data as string;
          setLink(
            `${window.location.origin}/join?token=${encodeURIComponent(token)}`,
          );
          void refresh();
        }}
      >
        {loading ? "Generando..." : "Generar enlace de invitación"}
      </Button>
    </div>
  );
}
