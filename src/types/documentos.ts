/** Origen del documento: archivo en Storage o enlace externo (URL). */
export type DocumentoSourceType = "file" | "link";

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
  /** "file" (archivo en Storage) | "link" (URL externa: YouTube, Vimeo, web…). */
  sourceType: DocumentoSourceType;
  /** URL del recurso externo cuando sourceType === "link". */
  externalUrl: string | null;
  /** Sede "principal" (legacy / owner). La asociación real es many-to-many vía sedeIds. */
  sedeId: string | null;
  /** Sedes asociadas (many-to-many). */
  sedeIds: string[];
  /** Equipos asociados (many-to-many). */
  equipoIds: string[];
  /** Workspace al que pertenece el documento (para globales de club). */
  workspaceId: string | null;
  /** Si true, todos los entrenadores pueden ver este documento. */
  visibleEntrenadores: boolean;
  /** IDs de entrenadores específicos que pueden ver el documento (cuando visibleEntrenadores=false). */
  entrenadorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentoCreateInput {
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
  workspaceId: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  extension: string | null;
  visibleEntrenadores: boolean;
  entrenadorIds: string[];
}

export interface DocumentoUpdateInput {
  titulo: string;
  categoriaDoc: string | null;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
  visibleEntrenadores: boolean;
  entrenadorIds: string[];
  /** Solo para documentos de tipo "link": permite editar la URL externa. */
  externalUrl?: string | null;
}

/** Datos para crear un documento de tipo enlace (sin archivo en Storage). */
export interface DocumentoLinkCreateInput {
  titulo: string;
  categoriaDoc: string | null;
  externalUrl: string;
  sedeId: string | null;
  sedeIds: string[];
  equipoIds: string[];
  workspaceId: string | null;
  visibleEntrenadores: boolean;
  entrenadorIds: string[];
}
