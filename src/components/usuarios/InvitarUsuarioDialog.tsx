"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { FormField, inputClass } from "@/components/shared/FormField";
import { crearInvitacion, type RolInvitacion } from "@/services/invitaciones.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { SedeOption } from "@/lib/workspaceContext";
import { Copy, Check } from "lucide-react";

interface InvitarUsuarioDialogProps {
  open: boolean;
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
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setEmail("");
    setRol("Entrenador");
    setSelectedSedeId(sedeId);
    setErrorMessage(null);
    setInviteLink(null);
    setCopied(false);
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
    if (inviteLink) {
      void navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedSedeName =
    sedesDisponibles.find((s: SedeOption) => s.id === selectedSedeId)?.nombre ?? "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>Invitar usuario</DialogTitle>
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
            onClick={handleClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        <DialogBody>
          {inviteLink ? (
            <div className="flex flex-col gap-[16px]">
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Copia este enlace y envíaselo al usuario. Cuando se registre quedará
                asignado automáticamente a <strong className="text-foreground">{selectedSedeName}</strong> como{" "}
                <strong className="text-foreground">{ROLES.find((r) => r.value === rol)?.label}</strong>.
                Caduca en 30 días.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className={inputClass + " text-[12px] font-mono"}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="grid size-[44px] shrink-0 place-items-center rounded-[11px] border border-border bg-secondary transition-colors hover:bg-muted"
                >
                  {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-muted-foreground" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[16px]">
              {isSuperAdmin && sedesDisponibles.length > 0 && (
                <FormField label="Sede destino">
                  <select className={inputClass} value={selectedSedeId}
                    onChange={(e) => { if (e.target.value) setSelectedSedeId(e.target.value); }}>
                    {sedesDisponibles.map((s: SedeOption) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField label="Email del usuario" required>
                <input className={inputClass} type="email" placeholder="usuario@ejemplo.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>

              <FormField label="Rol">
                <select className={inputClass} value={rol}
                  onChange={(e) => setRol(e.target.value as RolInvitacion)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              {errorMessage && <p className="text-[12.5px] text-destructive">{errorMessage}</p>}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {inviteLink ? (
            <button type="button" onClick={handleClose}
              className="inline-flex items-center justify-center rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 w-full justify-center">
              Cerrar
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClose}
                className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary">
                Cancelar
              </button>
              <div className="flex-1" />
              <button type="button" disabled={loading || !email.trim() || !selectedSedeId}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Generando…" : "Generar enlace"}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
