"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDocumentoOpenUrl } from "@/services/documentos.service";
import type { Documento } from "@/types/documentos";
import { ExternalLink, Trash2 } from "lucide-react";

interface SesionBloqueResourcePickerProps {
  bloqueOrden: number;
  documentoId: string | null;
  documentos: Documento[];
  disabled?: boolean;
  onChange: (documentoId: string | null) => void;
}

export function SesionBloqueResourcePicker({
  bloqueOrden,
  documentoId,
  documentos,
  disabled = false,
  onChange,
}: SesionBloqueResourcePickerProps) {
  const [openError, setOpenError] = useState<string | null>(null);
  const documento = documentos.find((item) => item.id === documentoId) ?? null;

  async function openResource() {
    if (!documento) return;
    setOpenError(null);
    const { data: url, error } = await getDocumentoOpenUrl(documento);
    if (error || !url) {
      setOpenError(error?.message ?? "No se pudo abrir el recurso.");
      return;
    }
    const resourceWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (resourceWindow) resourceWindow.opener = null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={documentoId ?? "none"}
          onValueChange={(value) => {
            setOpenError(null);
            onChange(value === "none" ? null : value ?? null);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label={`Seleccionar recurso del bloque ${bloqueOrden}`}
            className="min-w-48 flex-1"
          >
            <SelectValue placeholder="Sin recurso asociado">
              {(value) =>
                value === "none"
                  ? "Sin recurso asociado"
                  : documentos.find((item) => item.id === value)?.titulo ?? "Sin recurso asociado"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin recurso asociado</SelectItem>
            {documentos.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {documento && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Abrir recurso del bloque ${bloqueOrden}`}
              onClick={openResource}
              disabled={disabled}
            >
              <ExternalLink />
              Abrir recurso
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Quitar recurso del bloque ${bloqueOrden}`}
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <Trash2 />
              Quitar recurso
            </Button>
          </>
        )}
      </div>
      {openError && <p className="text-sm text-destructive">{openError}</p>}
    </div>
  );
}
