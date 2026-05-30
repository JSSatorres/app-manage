export interface Documento {
  id: string;
  titulo: string;
  categoriaDoc: string | null;
  driveFileId: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  extension: string | null;
  /** Sede "principal" (legacy / owner). La asociación real es many-to-many vía sedeIds. */
  sedeId: string | null;
  /** Sedes asociadas (many-to-many). */
  sedeIds: string[];
  /** Equipos asociados (many-to-many). */
  equipoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentoCreateInput {
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  extension: string | null;
}

export interface DocumentoUpdateInput {
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
}
