export interface SesionBloque {
  id: string;
  sesionId: string;
  titulo: string;
  duracionMinutos: number;
  ejercicioId: string;
  documentoId: string | null;
  orden: number;
  createdAt: string;
}

export interface SesionBloqueReplaceInput {
  titulo: string;
  duracionMinutos: number;
  ejercicioId: string;
  documentoId: string | null;
  orden: number;
}

export interface SesionBloqueDraft {
  id: string;
  titulo: string;
  duracionMinutos: number | null;
  ejercicioId: string | null;
  documentoId: string | null;
  orden: number;
}

export interface SesionDetalleLegacy {
  id: string;
  ejercicioId: string | null;
  orden: number;
  tiempoEjecucion: number | null;
  titulo: string | null;
}

export interface SesionBloqueSignatureInput {
  id: string;
  orden: number;
  duracionMinutos: number;
}
