"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { FormField, FormSection, inputClass } from "@/components/shared/FormField";
import { MultiCheckboxList } from "@/components/shared/MultiCheckboxList";
import { crearInvitacion, type RolInvitacion } from "@/services/invitaciones.service";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import type { SedeOption } from "@/lib/workspaceContext";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
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

interface GeneratedInvite {
  url: string;
  sedeNombres: string[];
}

export function InvitarUsuarioDialog({
  open,
  sedeId,
  onClose,
  onSuccess,
}: InvitarUsuarioDialogProps) {
  const { isSuperAdmin, sedesDisponibles } = useWorkspaceContext();

  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolInvitacion>("Entrenador");
  // Para AdminSede: una sola sede (select simple)
  const [selectedSedeId, setSelectedSedeId] = useState<string>(sedeId);
  // Para Entrenador/Jugador: múltiples sedes
  const [selectedSedeIds, setSelectedSedeIds] = useState<string[]>(sedeId ? [sedeId] : []);
  const [selectedEquipoIds, setSelectedEquipoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const isMultiRole = rol === "Entrenador" || rol === "Jugador";

  const equiposQuery = useEquiposLookup(isMultiRole ? selectedSedeIds : []);

  const sedeOptions = useMemo(
    () => sedesDisponibles.map((s: SedeOption) => ({ id: s.id, label: s.nombre })),
    [sedesDisponibles],
  );

  const equipoOptions = useMemo(
    () => (equiposQuery.data ?? []).map((e) => ({ id: e.id, label: e.nombre })),
    [equiposQuery.data],
  );

  // Limpiar equipos seleccionados cuando cambian las sedes
  useEffect(() => {
    const validIds = (equiposQuery.data ?? []).map((e) => e.id);
    queueMicrotask(() => {
      setSelectedEquipoIds((prev) => prev.filter((id) => validIds.includes(id)));
    });
  }, [equiposQuery.data]);

  const handleClose = () => {
    setEmail("");
    setRol("Entrenador");
    setSelectedSedeId(sedeId);
    setSelectedSedeIds(sedeId ? [sedeId] : []);
    setSelectedEquipoIds([]);
    setErrorMessage(null);
    setGeneratedInvite(null);
    setCopied(false);
    onClose();
  };

  const handleRolChange = (newRol: RolInvitacion) => {
    setRol(newRol);
    setSelectedEquipoIds([]);
    if (newRol === "AdminSede") {
      setSelectedSedeIds([]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!isMultiRole) {
      // AdminSede: una sola sede
      const targetSede = isSuperAdmin ? selectedSedeId : sedeId;
      const { token, error } = await crearInvitacion(targetSede, email, rol);
      setLoading(false);
      if (error || !token) {
        setErrorMessage(error instanceof Error ? error.message : "Error al crear invitación");
        return;
      }
      const sedeName = sedesDisponibles.find((s: SedeOption) => s.id === targetSede)?.nombre ?? "";
      setGeneratedInvite({
        url: `${window.location.origin}/register?invite=${token}`,
        sedeNombres: sedeName ? [sedeName] : [],
      });
    } else {
      // Entrenador/Jugador: una invitación por cada sede seleccionada en BD,
      // pero un solo enlace para el usuario (el match al registrarse es por email).
      const targetSedeIds = selectedSedeIds.length > 0 ? selectedSedeIds : (sedeId ? [sedeId] : []);
      if (!targetSedeIds.length) {
        setErrorMessage("Selecciona al menos una sede.");
        setLoading(false);
        return;
      }
      const sedeNombres: string[] = [];
      let firstToken: string | null = null;
      let lastError: string | null = null;
      for (const sid of targetSedeIds) {
        const { token, error } = await crearInvitacion(sid, email, rol);
        if (error || !token) {
          lastError = error instanceof Error ? error.message : "Error al crear invitación";
          continue;
        }
        if (!firstToken) firstToken = token;
        sedeNombres.push(sedesDisponibles.find((s: SedeOption) => s.id === sid)?.nombre ?? sid);
      }
      setLoading(false);
      if (!firstToken) {
        setErrorMessage(lastError ?? "Error al crear invitaciones");
        return;
      }
      if (lastError) setErrorMessage(`Algunas sedes fallaron: ${lastError}`);
      setGeneratedInvite({
        url: `${window.location.origin}/register?invite=${firstToken}`,
        sedeNombres,
      });
    }

    onSuccess?.();
  };

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canSubmit = (() => {
    if (!email.trim() || loading) return false;
    if (!isMultiRole) return !!selectedSedeId || !!sedeId;
    return selectedSedeIds.length > 0 || !!sedeId;
  })();

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
          {generatedInvite ? (
            <div className="flex flex-col gap-[16px]">
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Copia este enlace y envíaselo al usuario. Al registrarse con este email quedará
                asignado automáticamente como{" "}
                <strong className="text-foreground">{ROLES.find((r) => r.value === rol)?.label}</strong>
                {generatedInvite.sedeNombres.length > 0 && (
                  <>
                    {" "}en{" "}
                    <strong className="text-foreground">
                      {generatedInvite.sedeNombres.join(", ")}
                    </strong>
                  </>
                )}
                . Caduca en 30 días.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedInvite.url}
                  className={inputClass + " text-[12px] font-mono"}
                />
                <button
                  type="button"
                  onClick={() => handleCopy(generatedInvite.url)}
                  className="grid size-[44px] shrink-0 place-items-center rounded-[11px] border border-border bg-secondary transition-colors hover:bg-muted"
                >
                  {copied
                    ? <Check size={16} className="text-primary" />
                    : <Copy size={16} className="text-muted-foreground" />}
                </button>
              </div>
              {errorMessage && (
                <p className="text-[12.5px] text-amber-500">{errorMessage}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-[16px]">
              <FormField label="Email del usuario" required>
                <input
                  className={inputClass}
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>

              <FormField label="Rol">
                <select
                  className={inputClass}
                  value={rol}
                  onChange={(e) => handleRolChange(e.target.value as RolInvitacion)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              {/* Sede: select simple para AdminSede, multiselect para Entrenador/Jugador */}
              {!isMultiRole && sedesDisponibles.length > 0 && (
                <FormField label="Sede destino">
                  <select
                    className={inputClass}
                    value={selectedSedeId}
                    onChange={(e) => { if (e.target.value) setSelectedSedeId(e.target.value); }}
                  >
                    {sedesDisponibles.map((s: SedeOption) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </FormField>
              )}

              {isMultiRole && sedesDisponibles.length > 0 && (
                <>
                  <FormSection label="Sedes" />
                  <MultiCheckboxList
                    options={sedeOptions}
                    value={selectedSedeIds}
                    onChange={setSelectedSedeIds}
                    emptyText="No hay sedes disponibles."
                  />
                </>
              )}

              {isMultiRole && (
                <>
                  <FormSection label="Equipos" />
                  <MultiCheckboxList
                    options={equipoOptions}
                    value={selectedEquipoIds}
                    onChange={setSelectedEquipoIds}
                    disabled={equiposQuery.loading || (isSuperAdmin && selectedSedeIds.length === 0)}
                    emptyText={
                      isSuperAdmin && selectedSedeIds.length === 0
                        ? "Selecciona primero una sede."
                        : "No hay equipos en las sedes seleccionadas."
                    }
                  />
                </>
              )}

              {errorMessage && (
                <p className="text-[12.5px] text-destructive">{errorMessage}</p>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {generatedInvite ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 w-full justify-center"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Cancelar
              </button>
              <div className="flex-1" />
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Generando…" : "Generar enlace"}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
