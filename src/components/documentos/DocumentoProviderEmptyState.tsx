import { Button } from "@/components/ui/button"
import { DocumentoProviderGuide } from "./DocumentoProviderGuide"

export type DocumentoProvider = "youtube" | "google_drive" | "supabase_storage"

interface DocumentoProviderEmptyStateProps {
  provider: DocumentoProvider
  state: "empty-setup" | "empty-filtered"
  canWrite: boolean
  onCreate?: (provider: DocumentoProvider) => void
  onClearFilters?: () => void
}

const createLabels: Record<DocumentoProvider, string> = {
  youtube: "Añadir vídeo de YouTube",
  google_drive: "Añadir enlace de Google Drive",
  supabase_storage: "Subir archivo",
}

export function DocumentoProviderEmptyState({
  provider,
  state,
  canWrite,
  onCreate,
  onClearFilters,
}: DocumentoProviderEmptyStateProps) {
  if (state === "empty-filtered") {
    return (
      <section
        aria-label="Sin resultados por filtros"
        className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
      >
        <p className="font-medium">No hay contenido con los filtros actuales.</p>
        <p className="text-sm text-muted-foreground">
          Prueba a cambiar la sede o a limpiar los filtros.
        </p>
        {onClearFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </section>
    )
  }

  return (
    <section
      aria-label={`Configurar ${createLabels[provider]}`}
      className="min-h-56 rounded-lg border border-dashed p-6"
    >
      <DocumentoProviderGuide provider={provider} />
      <div className="mt-5">
        {canWrite ? (
          <Button type="button" onClick={() => onCreate?.(provider)}>
            {createLabels[provider]}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aún no hay contenido disponible; contacta con un gestor.
          </p>
        )}
      </div>
    </section>
  )
}
