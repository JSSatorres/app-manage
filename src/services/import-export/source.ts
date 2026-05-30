/**
 * Obtención del archivo a importar desde distintos orígenes, devolviendo siempre
 * un `ArrayBuffer` listo para `parseWorkbook`.
 *
 * Orígenes soportados:
 *  - Archivo local (`.xlsx`)
 *  - URL pública de Google Sheets (compartida como "cualquiera con el enlace")
 *  - Enlace de Google Drive a un archivo Excel / Google Sheet
 */

/** Extrae el ID de documento de una URL de Google Sheets / Drive. */
export function extractGoogleId(url: string): { id: string; kind: "sheet" | "drive" } | null {
  const trimmed = url.trim();
  // Google Sheets: /spreadsheets/d/<ID>/
  const sheetMatch = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return { id: sheetMatch[1], kind: "sheet" };
  // Google Drive: /file/d/<ID>/  o  open?id=<ID>  o  uc?id=<ID>
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { id: fileMatch[1], kind: "drive" };
  const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return { id: idParam[1], kind: "drive" };
  return null;
}

/** Construye la URL de descarga directa en formato xlsx para un ID de Google. */
export function buildGoogleExportUrl(ref: { id: string; kind: "sheet" | "drive" }): string {
  if (ref.kind === "sheet") {
    return `https://docs.google.com/spreadsheets/d/${ref.id}/export?format=xlsx`;
  }
  // Archivos subidos a Drive: descarga directa
  return `https://drive.google.com/uc?export=download&id=${ref.id}`;
}

/** Lee un `File` local como ArrayBuffer. */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

/** Descarga un Google Sheet / Drive público como ArrayBuffer. */
export async function fetchFromGoogleUrl(url: string): Promise<ArrayBuffer> {
  const ref = extractGoogleId(url);
  if (!ref) {
    throw new Error(
      "Enlace de Google no reconocido. Pega la URL completa de un Google Sheets o de un archivo de Google Drive.",
    );
  }
  const exportUrl = buildGoogleExportUrl(ref);
  const res = await fetch(exportUrl, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      "No se pudo descargar el documento. Asegúrate de que esté compartido como 'cualquiera con el enlace'.",
    );
  }
  const contentType = res.headers.get("content-type") ?? "";
  // Si Google devuelve HTML es que pidió login -> documento no es público.
  if (contentType.includes("text/html")) {
    throw new Error(
      "El documento no es accesible públicamente. Comparte el archivo como 'cualquiera con el enlace' y vuelve a intentarlo.",
    );
  }
  return await res.arrayBuffer();
}
