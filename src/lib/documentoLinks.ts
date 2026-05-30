import type { Documento } from "@/types/documentos";

export type DocumentoPlatform = "youtube" | "vimeo" | "link";

/** Detecta la plataforma de una URL externa para mostrar icono/etiqueta. */
export function detectPlatform(url: string): DocumentoPlatform {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "link";
  }
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("vimeo.com")) return "vimeo";
  return "link";
}

/** Etiqueta legible para la columna "Tipo" de un documento. */
export function documentoTipoLabel(doc: Documento): string {
  if (doc.sourceType === "link") {
    switch (doc.extension) {
      case "youtube":
        return "YouTube";
      case "vimeo":
        return "Vimeo";
      default:
        return "Enlace";
    }
  }
  return doc.extension ? doc.extension.toUpperCase() : "—";
}

/** Valida que una cadena sea una URL http(s) absoluta. */
export function isValidExternalUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
