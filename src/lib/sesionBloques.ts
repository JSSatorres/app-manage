import type {
  SesionBloqueDraft,
  SesionBloqueSignatureInput,
  SesionDetalleLegacy,
} from "@/types/sesion-bloques";

export function normalizarOrdenBloques<T extends { orden: number }>(bloques: readonly T[]): T[] {
  return bloques.map((bloque, index) => ({ ...bloque, orden: index + 1 }));
}

export function sumarDuracionBloques(
  bloques: readonly { duracionMinutos: number | null }[],
): number {
  return bloques.reduce((total, bloque) => total + (bloque.duracionMinutos ?? 0), 0);
}

export function getBloqueEtiqueta(bloque: { titulo: string | null; orden: number }): string {
  const titulo = bloque.titulo?.trim();
  return titulo ? titulo : `Bloque ${bloque.orden}`;
}

export function mapSesionDetalleToBloquesDraft(
  detalle: readonly SesionDetalleLegacy[],
): SesionBloqueDraft[] {
  return detalle.map((item) => ({
    id: item.id,
    titulo: item.titulo ?? "",
    duracionMinutos: item.tiempoEjecucion,
    ejercicioId: item.ejercicioId,
    documentoId: null,
    notas: null,
    orden: item.orden,
  }));
}

export function getSesionBloquesSignature(
  bloques: readonly SesionBloqueSignatureInput[],
): string {
  return JSON.stringify(bloques.map(({ id, orden, duracionMinutos }) => [id, orden, duracionMinutos]));
}
