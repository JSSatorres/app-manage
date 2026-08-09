"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, LoaderCircle } from "lucide-react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { normalizeContentAssetLink } from "@/lib/contentAssetLinks"
import { getDocumentStorageOpenUrl } from "@/services/document-storage.service"
import type { ContentAsset } from "@/types/content-assets"

type DocumentoPreviewDialogProps = {
  asset: ContentAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SIGNED_URL_EXPIRATION_MS = 10 * 60 * 1000

function getAssetTitle(asset: ContentAsset) {
  if (asset.provider === "youtube") return "Vídeo de YouTube"
  if (asset.provider === "google_drive") return "Archivo de Google Drive"
  if (asset.provider === "supabase_storage") return "Archivo privado"
  return "Enlace anterior"
}

function getSafeYouTubeEmbedUrl(asset: ContentAsset) {
  if (asset.provider !== "youtube") return null
  const normalized = normalizeContentAssetLink(asset.originalUrl ?? "")
  if (normalized?.provider !== "youtube") return null
  const expected = `https://www.youtube-nocookie.com/embed/${normalized.externalResourceId}`
  return asset.embedUrl === expected ? expected : null
}

function getSafeExternalUrl(asset: ContentAsset) {
  if (asset.provider === "youtube") {
    return /^[A-Za-z0-9_-]{11}$/.test(asset.externalResourceId)
      ? `https://www.youtube.com/watch?v=${asset.externalResourceId}`
      : null
  }
  if (asset.provider === "google_drive") {
    return asset.fileId && /^[A-Za-z0-9_-]{10,}$/.test(asset.fileId)
      ? `https://drive.google.com/file/d/${asset.fileId}/view`
      : null
  }
  if (asset.provider !== "external_legacy" || !asset.originalUrl) return null

  try {
    const url = new URL(asset.originalUrl)
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function getProviderIssue(asset: ContentAsset) {
  if (asset.provider === "google_drive" && asset.status === "unavailable") {
    return "No se puede abrir el archivo con tu sesión actual. Comprueba los permisos de Google Drive o vuelve a iniciar sesión."
  }
  if (asset.provider === "google_drive" && asset.status === "rejected") {
    return "Google Drive rechazó este recurso. Un gestor debe revisar el enlace y sus permisos."
  }
  if (asset.status === "failed") return "El recurso no se pudo preparar. Inténtalo de nuevo más tarde."
  if (asset.status === "pending_validation" || asset.status === "processing") {
    return "El recurso aún se está validando. Vuelve a intentarlo dentro de unos instantes."
  }
  return null
}

export function DocumentoPreviewDialog({
  asset,
  open,
  onOpenChange,
}: DocumentoPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [signedUrlError, setSignedUrlError] = useState<string | null>(null)
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false)
  const signedUrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSignedUrl = useCallback(() => {
    if (signedUrlTimeoutRef.current) {
      clearTimeout(signedUrlTimeoutRef.current)
      signedUrlTimeoutRef.current = null
    }
    setSignedUrl(null)
    setSignedUrlError(null)
  }, [])

  const loadSignedUrl = useCallback(async () => {
    if (!asset || asset.provider !== "supabase_storage") return

    clearSignedUrl()
    setLoadingSignedUrl(true)
    const { data, error } = await getDocumentStorageOpenUrl(asset.storagePath)
    setLoadingSignedUrl(false)
    if (error || !data) {
      setSignedUrlError(error?.message ?? "No se pudo abrir el archivo privado.")
      return
    }
    setSignedUrl(data)
    signedUrlTimeoutRef.current = setTimeout(() => {
      signedUrlTimeoutRef.current = null
      setSignedUrl(null)
      setSignedUrlError("El acceso privado ha caducado. Solicita uno nuevo.")
    }, SIGNED_URL_EXPIRATION_MS)
  }, [asset, clearSignedUrl])

  useEffect(() => {
    if (!open || asset?.provider !== "supabase_storage") return
    queueMicrotask(() => {
      void loadSignedUrl()
    })
  }, [asset?.id, asset?.provider, loadSignedUrl, open])

  useEffect(() => () => {
    if (signedUrlTimeoutRef.current) clearTimeout(signedUrlTimeoutRef.current)
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      clearSignedUrl()
      setLoadingSignedUrl(false)
    }
    onOpenChange(nextOpen)
  }

  if (!asset) return null

  const title = getAssetTitle(asset)
  const youtubeEmbedUrl = getSafeYouTubeEmbedUrl(asset)
  const externalUrl = getSafeExternalUrl(asset)
  const providerIssue = getProviderIssue(asset)
  const externalOpenLabel =
    asset.provider === "youtube"
      ? "Abrir en YouTube"
      : asset.provider === "google_drive"
        ? "Abrir en Google Drive"
        : "Abrir enlace"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>La apertura respeta los permisos del proveedor.</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {providerIssue ? <p role="alert" className="text-sm text-destructive">{providerIssue}</p> : null}
            {asset.provider === "youtube" && youtubeEmbedUrl ? (
              <iframe
                className="aspect-video w-full border"
                src={youtubeEmbedUrl}
                title={`Previsualización de ${title}`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : null}
            {asset.provider === "youtube" && !youtubeEmbedUrl ? (
              <p className="text-sm text-muted-foreground">
                Este vídeo no permite previsualización integrada. Ábrelo en YouTube para comprobar su disponibilidad.
              </p>
            ) : null}
            {asset.provider === "google_drive" ? (
              <p className="text-sm text-muted-foreground">
                Google Drive comprobará tu inicio de sesión y los permisos compartidos por el club. La aplicación no los evita ni proxifica el archivo.
              </p>
            ) : null}
            {asset.provider === "supabase_storage" && loadingSignedUrl ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Preparando acceso privado…
              </p>
            ) : null}
            {asset.provider === "supabase_storage" && signedUrlError ? (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">{signedUrlError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadSignedUrl()}>
                  Reintentar
                </Button>
              </div>
            ) : null}
            {asset.provider === "external_legacy" ? (
              <p className="text-sm text-muted-foreground">
                Este enlace se conserva durante la transición. Verifica el destino antes de continuar.
              </p>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          {asset.provider === "supabase_storage" && signedUrl ? (
            <Button nativeButton={false} render={<a href={signedUrl} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="mr-1 size-4" />
              Abrir archivo
            </Button>
          ) : null}
          {asset.provider !== "supabase_storage" && externalUrl ? (
            <Button nativeButton={false} render={<a href={externalUrl} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="mr-1 size-4" />
              {externalOpenLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
