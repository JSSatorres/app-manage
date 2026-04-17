export interface Documento {
  id: string;
  titulo: string;
  categoriaDoc: string | null;
  driveFileId: string | null;
  sedeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentoCreateInput {
  titulo: string;
  categoriaDoc: string | null;
  driveFileId: string | null;
  sedeId: string | null;
}

export type DocumentoUpdateInput = DocumentoCreateInput;

