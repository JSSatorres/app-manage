"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { DocumentoProvider } from "./DocumentoProviderEmptyState"

interface DocumentoUploadMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (provider: DocumentoProvider) => void
}

const uploadMethods: ReadonlyArray<{
  provider: DocumentoProvider
  label: string
}> = [
  { provider: "youtube", label: "YouTube" },
  { provider: "google_drive", label: "Google Drive" },
  { provider: "supabase_storage", label: "Almacenamiento" },
]

export function DocumentoUploadMethodDialog({
  open,
  onOpenChange,
  onSelect,
}: DocumentoUploadMethodDialogProps) {
  function handleSelect(provider: DocumentoProvider) {
    onSelect(provider)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <div>
            <DialogTitle>¿Cómo quieres subir el documento?</DialogTitle>
            <DialogDescription>
              Elige el origen del documento para continuar.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-3 sm:grid-cols-3">
            {uploadMethods.map(({ provider, label }) => (
              <Button
                key={provider}
                type="button"
                variant="outline"
                className="h-auto min-h-20 whitespace-normal"
                onClick={() => handleSelect(provider)}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
