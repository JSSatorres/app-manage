export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
}

export interface DriveUploadInput {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface DriveAdapter {
  uploadFile: (input: DriveUploadInput) => Promise<DriveFileMetadata>;
  deleteFile: (id: string) => Promise<void>;
  getFileMetadata: (id: string) => Promise<DriveFileMetadata>;
}

function notImplemented(): never {
  throw new Error("Google Drive adapter no implementado todavía");
}

export const driveAdapter: DriveAdapter = {
  uploadFile: async () => notImplemented(),
  deleteFile: async () => notImplemented(),
  getFileMetadata: async () => notImplemented(),
};

