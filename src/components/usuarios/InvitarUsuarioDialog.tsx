"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearInvitacion, type RolInvitacion } from "@/services/invitaciones.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { SedeOption } from "@/lib/workspaceContext";

interface InvitarUsuarioDialogProps {
  open: boolean;
  /** Sede por defecto (la del AdminSede). Si es SuperAdmin se ignora y elige en el dialog. */
  sedeId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ROLES: { value: RolInvitacion; label: string }[] = [
  { value: "AdminSede", label: "Admin de sede" },
  { value: "Entrenador", label: "Entrenador" },
  { value: "Jugador", label: "Jugador" },
];

export function InvitarUsuarioDialog({
  open,
  sedeId,
  onClose,
  onSuccess,
}: InvitarUsuarioDialogProps) {
  const { isSuperAdmin, sedesDisponibles } = useWorkspaceContext();

  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolInvitacion>("Entrenador");
  const [selectedSedeId, setSelectedSedeId] = useState<string>(sedeId);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleClose = () => {
    setEmail("");
    setRol("Entrenador");
    setSelectedSedeId(sedeId);
    setErrorMessage(null);
    setInviteLink(null);
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(null);
    const targetSede = isSuperAdmin ? selectedSedeId : sedeId;
    const { token, error } = await crearInvitacion(targetSede, email, rol);
    setLoading(false);
    if (error || !token) {
      setErrorMessage(error instanceof Error ? error.message : "Error al crear invitación");
      return;
    }
    const link = `${window.location.origin}/register?invite=${token}`;
    setInviteLink(link);
    onSuccess?.();
  };

  const handleCopy = () => {
    if (inviteLink) void navigator.clipboard.writeText(inviteLink);
  };

  const selectedSedeName =
    sedesDisponibles.find((s: SedeOption) => s.id === selectedSedeId)?.nombre ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar usuario a la sede</DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copia este enlace y envíaselo al usuario. Cuando se registre quedará
              asignado automáticamente a <strong>{selectedSedeName}</strong> como{" "}
              <strong>{ROLES.find((r) => r.value === rol)?.label}</strong>.
              Caduca en 30 días.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                Copiar
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {isSuperAdmin && sedesDisponibles.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="invite-sede">Sede destino</Label>
                <Select
                  value={selectedSedeId}
                  onValueChange={(v) => { if (v) setSelectedSedeId(v); }}
                >
                  <SelectTrigger id="invite-sede">
                    <SelectValue placeholder="Selecciona una sede">
                      {selectedSedeId
                        ? (sedesDisponibles.find((s: SedeOption) => s.id === selectedSedeId)?.nombre ?? "Selecciona una sede")
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sedesDisponibles.map((s: SedeOption) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email del usuario</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-rol">Rol</Label>
              <Select value={rol} onValueChange={(v) => setRol(v as RolInvitacion)}>
                <SelectTrigger id="invite-rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={loading || !email.trim() || !selectedSedeId}
                onClick={handleSubmit}
              >
                {loading ? "Generando..." : "Generar enlace"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
