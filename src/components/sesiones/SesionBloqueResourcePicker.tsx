"use client";

import { useState } from "react";
import Link from "next/link";
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

function getDocumentoOrigen(documento: Documento): string {
  const origen = documento.sourceType === "link" ? "Enlace" : "Archivo";
  return documento.categoriaDoc ? `${documento.categoriaDoc} · ${origen}` : origen;
}

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
      setOpenError(error?.message ?? "No se pudo abrir el documento.");
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
            aria-label={`Seleccionar documento del bloque ${bloqueOrden}`}
            className="min-w-48 flex-1"
          >
            <SelectValue placeholder="Sin documento asociado">
              {(value) =>
                value === "none"
                  ? "Sin documento asociado"
                  : documentos.find((item) => item.id === value)?.titulo ?? "Sin documento asociado"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin documento asociado</SelectItem>
            {documentos.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <span className="flex flex-col">
                  <span>{item.titulo}</span>
                  <span className="text-xs text-muted-foreground">{getDocumentoOrigen(item)}</span>
                </span>
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
              aria-label={`Abrir documento del bloque ${bloqueOrden}`}
              onClick={openResource}
              disabled={disabled}
            >
              <ExternalLink />
              Abrir documento
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Quitar documento del bloque ${bloqueOrden}`}
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <Trash2 />
              Quitar documento
            </Button>
          </>
        )}
      </div>
      {documentos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay documentos disponibles. Añádelos en{" "}
          <Link href="/documentos" className="text-primary underline-offset-4 hover:underline">
            Documentos
          </Link>
          : un enlace de YouTube o Google Drive, o un archivo de tu almacenamiento.
        </p>
      )}
      {openError && <p className="text-sm text-destructive">{openError}</p>}
    </div>
  );
}
