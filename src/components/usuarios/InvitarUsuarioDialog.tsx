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

interface GeneratedLink {
  sedeNombre: string;
  url: string;
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
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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
    setGeneratedLinks([]);
    setCopiedIdx(null);
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
      setGeneratedLinks([{ sedeNombre: sedeName, url: `${window.location.origin}/register?invite=${token}` }]);
    } else {
      // Entrenador/Jugador: una invitación por cada sede seleccionada
      const targetSedeIds = selectedSedeIds.length > 0 ? selectedSedeIds : (sedeId ? [sedeId] : []);
      if (!targetSedeIds.length) {
        setErrorMessage("Selecciona al menos una sede.");
        setLoading(false);
        return;
      }
      const results: GeneratedLink[] = [];
      let lastError: string | null = null;
      for (const sid of targetSedeIds) {
        const { token, error } = await crearInvitacion(sid, email, rol);
        if (error || !token) {
          lastError = error instanceof Error ? error.message : "Error al crear invitación";
          continue;
        }
        const sedeName = sedesDisponibles.find((s: SedeOption) => s.id === sid)?.nombre ?? sid;
        results.push({ sedeNombre: sedeName, url: `${window.location.origin}/register?invite=${token}` });
      }
      setLoading(false);
      if (!results.length) {
        setErrorMessage(lastError ?? "Error al crear invitaciones");
        return;
      }
      if (lastError) setErrorMessage(`Algunas sedes fallaron: ${lastError}`);
      setGeneratedLinks(results);
    }

    onSuccess?.();
  };

  const handleCopy = (url: string, idx: number) => {
    void navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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
          {generatedLinks.length > 0 ? (
            <div className="flex flex-col gap-[16px]">
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Copia estos enlaces y envíaselos al usuario. Al registrarse quedará asignado
                automáticamente como{" "}
                <strong className="text-foreground">{ROLES.find((r) => r.value === rol)?.label}</strong>.
                Caducan en 30 días.
              </p>
              {generatedLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col gap-[6px]">
                  <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {link.sedeNombre}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={link.url}
                      className={inputClass + " text-[12px] font-mono"}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(link.url, idx)}
                      className="grid size-[44px] shrink-0 place-items-center rounded-[11px] border border-border bg-secondary transition-colors hover:bg-muted"
                    >
                      {copiedIdx === idx
                        ? <Check size={16} className="text-primary" />
                        : <Copy size={16} className="text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              ))}
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
          {generatedLinks.length > 0 ? (
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
