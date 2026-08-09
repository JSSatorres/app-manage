import type {
  SesionBloqueDraft,
  SesionBloqueSignatureInput,
  SesionDetalleLegacy,
} from "@/types/sesion-bloques";

export function normalizarOrdenBloques<T extends { orden: number }>(bloques: readonly T[]): T[] {
  return bloques.map((bloque, index) => ({ ...bloque, orden: index + 1 }));
}

export function sumarDuracionBloques(bloques: readonly { duracionMinutos: number }[]): number {
  return bloques.reduce((total, bloque) => total + bloque.duracionMinutos, 0);
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
    orden: item.orden,
  }));
}

export function getSesionBloquesSignature(
  bloques: readonly SesionBloqueSignatureInput[],
): string {
  return JSON.stringify(bloques.map(({ id, orden, duracionMinutos }) => [id, orden, duracionMinutos]));
}
