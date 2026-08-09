import { getSupabaseClient } from "@/services/supabase"

const DOCUMENTOS_BUCKET = "documentos"
const OPEN_URL_EXPIRATION_SECONDS = 10 * 60

export const MAX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024

export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
])

export class DocumentStorageError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "DocumentStorageError"
  }
}

interface ReservedUpload {
  asset_id: string
  storage_path: string
  expires_at: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "")
}

function createStorageError(code: string, message: string) {
  return new DocumentStorageError(code, message)
}

function mapRpcError(error: unknown, fallbackCode: string, fallbackMessage: string) {
  const message = getErrorMessage(error)
  if (message.includes("QUOTA_EXCEEDED")) {
    return createStorageError(
      "DOCUMENT_STORAGE_QUOTA_EXCEEDED",
      "No hay espacio disponible para subir este documento.",
    )
  }
  if (message.includes("UPLOAD_RESERVATION_EXPIRED")) {
    return createStorageError(
      "DOCUMENT_UPLOAD_RESERVATION_EXPIRED",
      "La reserva de subida ha caducado. Inténtalo de nuevo.",
    )
  }
  return createStorageError(fallbackCode, fallbackMessage)
}

function validateFile(file: File) {
  if (file.size <= 0) {
    return createStorageError(
      "DOCUMENT_FILE_EMPTY",
      "El archivo no puede estar vacío.",
    )
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return createStorageError(
      "DOCUMENT_FILE_TOO_LARGE",
      "El archivo supera el tamaño máximo permitido de 100 MB.",
    )
  }
  if (!DOCUMENT_MIME_TYPES.has(file.type.toLowerCase())) {
    return createStorageError(
      "DOCUMENT_MIME_TYPE_NOT_ALLOWED",
      "El tipo de archivo no está permitido.",
    )
  }
  return null
}

async function markAssetForDeletion(
  assetId: string,
  storagePath: string,
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      data: false,
      error: createStorageError(
        "DOCUMENT_STORAGE_CLIENT_UNAVAILABLE",
        "No se puede conectar con el almacenamiento de documentos.",
      ),
    }
  }

  const { error: markError } = await supabase.rpc(
    "mark_document_asset_deleting",
    { p_asset_id: assetId },
  )
  if (markError) {
    return {
      data: false,
      error: mapRpcError(
        markError,
        "DOCUMENT_STORAGE_DELETE_MARK_FAILED",
        "No se pudo preparar la eliminación del documento.",
      ),
    }
  }

  const { error: removeError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .remove([storagePath])
  if (removeError) {
    return {
      data: false,
      error: createStorageError(
        "DOCUMENT_STORAGE_DELETE_FAILED",
        "No se pudo eliminar el archivo. La eliminación se puede reintentar.",
      ),
    }
  }

  const { error: completeError } = await supabase.rpc(
    "complete_document_asset_delete",
    { p_asset_id: assetId },
  )
  if (completeError) {
    return {
      data: false,
      error: mapRpcError(
        completeError,
        "DOCUMENT_STORAGE_DELETE_COMPLETE_FAILED",
        "El archivo se eliminó, pero no se pudo completar su registro. Reinténtalo.",
      ),
    }
  }

  return { data: true, error: null }
}

export async function deleteDocumentStorageAsset(input: {
  assetId: string
  storagePath: string
}) {
  return markAssetForDeletion(input.assetId, input.storagePath)
}

export async function uploadDocumentFile(input: {
  documentoId: string
  file: File
}) {
  const validationError = validateFile(input.file)
  if (validationError) return { data: null, error: validationError }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      data: null,
      error: createStorageError(
        "DOCUMENT_STORAGE_CLIENT_UNAVAILABLE",
        "No se puede conectar con el almacenamiento de documentos.",
      ),
    }
  }

  const { data: reservationRows, error: reservationError } = await supabase.rpc(
    "reserve_document_upload",
    {
      p_documento_id: input.documentoId,
      p_size_bytes: input.file.size,
      p_mime_type: input.file.type.toLowerCase(),
    },
  )
  if (reservationError) {
    return {
      data: null,
      error: mapRpcError(
        reservationError,
        "DOCUMENT_STORAGE_RESERVATION_FAILED",
        "No se pudo reservar espacio para el documento.",
      ),
    }
  }

  const reservation = reservationRows?.[0] as ReservedUpload | undefined
  if (!reservation?.asset_id || !reservation.storage_path || !reservation.expires_at) {
    return {
      data: null,
      error: createStorageError(
        "DOCUMENT_STORAGE_RESERVATION_INVALID",
        "La reserva de almacenamiento no es válida.",
      ),
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(reservation.storage_path, input.file, {
      upsert: false,
      contentType: input.file.type.toLowerCase(),
    })
  if (uploadError) {
    await supabase.rpc("cancel_document_upload", { p_asset_id: reservation.asset_id })
    await markAssetForDeletion(reservation.asset_id, reservation.storage_path)
    return {
      data: null,
      error: createStorageError(
        "DOCUMENT_UPLOAD_FAILED",
        "No se pudo subir el archivo. Inténtalo de nuevo.",
      ),
    }
  }

  const { error: completeError } = await supabase.rpc("complete_document_upload", {
    p_asset_id: reservation.asset_id,
  })
  if (completeError) {
    await supabase.rpc("cancel_document_upload", { p_asset_id: reservation.asset_id })
    await markAssetForDeletion(reservation.asset_id, reservation.storage_path)
    return {
      data: null,
      error: mapRpcError(
        completeError,
        "DOCUMENT_UPLOAD_COMPLETE_FAILED",
        "No se pudo validar el archivo subido. Inténtalo de nuevo.",
      ),
    }
  }

  return {
    data: {
      assetId: reservation.asset_id,
      storagePath: reservation.storage_path,
    },
    error: null,
  }
}

export async function getDocumentStorageOpenUrl(storagePath: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      data: null,
      error: createStorageError(
        "DOCUMENT_STORAGE_CLIENT_UNAVAILABLE",
        "No se puede conectar con el almacenamiento de documentos.",
      ),
    }
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(storagePath, OPEN_URL_EXPIRATION_SECONDS)
  return { data: data?.signedUrl ?? null, error }
}
