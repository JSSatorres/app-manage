"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentoOpenUrl } from "@/services/documentos.service";
import type { Documento } from "@/types/documentos";

interface SesionBloqueRecursoProps {
  documento: Documento | null;
  bloqueTitulo: string;
}

export function SesionBloqueRecurso({ documento, bloqueTitulo }: SesionBloqueRecursoProps) {
  const [openError, setOpenError] = useState<string | null>(null);

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

  if (!documento) {
    return <p className="text-sm text-muted-foreground">Este bloque no tiene recurso asociado.</p>;
  }

  return (
    <section className="space-y-2" aria-label={`Recurso de ${bloqueTitulo}`}>
      <div>
        <h3 className="font-medium">{documento.titulo}</h3>
        <p className="text-sm text-muted-foreground">
          {[documento.categoriaDoc, documento.mimeType, documento.fileName]
            .filter(Boolean)
            .join(" · ") || "Recurso asociado"}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={openResource}>
        <ExternalLink />
        Abrir recurso
      </Button>
      {openError && (
        <p className="text-sm text-destructive" role="alert">
          {openError}
        </p>
      )}
    </section>
  );
}
