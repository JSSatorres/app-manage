"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, Download, X, Plus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSesionDocumentos } from "@/hooks/useSesionDocumentos";
import { useDocumentos } from "@/hooks/useDocumentos";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { getDocumentoOpenUrl } from "@/services/documentos.service";
import { documentoTipoLabel } from "@/lib/documentoLinks";
import type { Documento } from "@/types/documentos";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SesionDocumentosPanelProps {
  sesionId: string;
}

export function SesionDocumentosPanel({ sesionId }: SesionDocumentosPanelProps) {
  const { activeSede } = useWorkspaceContext();
  const {
    data: adjuntos,
    loading,
    errorMessage,
    attach,
    detach,
    attachLoading,
  } = useSesionDocumentos(sesionId);

  // Catálogo de documentos disponibles en la sede activa para adjuntar.
  const { data: disponibles } = useDocumentos(activeSede ? [activeSede.id] : []);

  const [open, setOpen] = useState(true);
  const [picking, setPicking] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const adjuntoIds = useMemo(
    () => new Set((adjuntos ?? []).map((d) => d.id)),
    [adjuntos],
  );

  const seleccionables = useMemo(
    () => (disponibles ?? []).filter((d) => !adjuntoIds.has(d.id)),
    [disponibles, adjuntoIds],
  );

  const handleOpen = async (doc: Documento) => {
    setDownloadingId(doc.id);
    setActionError(null);
    const { data: url, error } = await getDocumentoOpenUrl(doc);
    setDownloadingId(null);
    if (error || !url) {
      setActionError(error?.message ?? "No se pudo abrir el documento.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="border border-border/60 rounded-lg">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          Documentos{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({adjuntos?.length ?? 0})
          </span>
        </span>
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {actionError && <p className="text-xs text-destructive">{actionError}</p>}
          {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}

          {loading ? (
            <p className="text-sm text-muted-foreground py-2">Cargando documentos…</p>
          ) : !adjuntos || adjuntos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No hay documentos en esta sesión.
            </p>
          ) : (
            <ul className="space-y-2">
              {adjuntos.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/30"
                >
                  {d.sourceType === "link" ? (
                    <Link2 size={16} className="text-primary shrink-0" />
                  ) : (
                    <FileText size={16} className="text-primary shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[
                        documentoTipoLabel(d),
                        d.sourceType === "link" ? null : formatBytes(d.sizeBytes),
                        d.categoriaDoc,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Ver documento"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                    disabled={
                      downloadingId === d.id ||
                      (d.sourceType === "link" ? !d.externalUrl : !d.storagePath)
                    }
                    onClick={() => void handleOpen(d)}
                  >
                    {d.sourceType === "link" ? <Link2 size={15} /> : <Download size={15} />}
                  </button>
                  <button
                    type="button"
                    title="Quitar de la sesión"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => void detach(d.id)}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!picking ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
              disabled={seleccionables.length === 0}
              onClick={() => setPicking(true)}
            >
              <Plus size={15} />
              {seleccionables.length === 0
                ? "No hay más documentos para adjuntar"
                : "Adjuntar documento"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                defaultValue=""
                disabled={attachLoading}
                onChange={async (e) => {
                  const id = e.target.value;
                  if (!id) return;
                  await attach(id);
                  setPicking(false);
                }}
              >
                <option value="" disabled>
                  Selecciona un documento…
                </option>
                {seleccionables.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo} ({documentoTipoLabel(d)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setPicking(false)}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
