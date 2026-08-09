"use client"

import { useEffect, useState, type ReactNode } from "react"
import * as Sentry from "@sentry/nextjs"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DocumentoProviderEmptyState,
  type DocumentoProvider,
} from "./DocumentoProviderEmptyState"
import { DocumentoProviderGuide } from "./DocumentoProviderGuide"

export type DocumentoProviderState =
  | "loading"
  | "error"
  | "empty-setup"
  | "empty-filtered"
  | "data"

export interface DocumentoProviderTab {
  state: DocumentoProviderState
  count?: number
  errorMessage?: string
  onRetry?: () => void
  onClearFilters?: () => void
  children?: ReactNode
}

interface DocumentosProviderTabsProps {
  providers: Record<DocumentoProvider, DocumentoProviderTab>
  canWrite: boolean
  onCreate?: (provider: DocumentoProvider) => void
  initialProvider?: DocumentoProvider
  queryParam?: string
}

const providerTabs: Array<{ provider: DocumentoProvider; label: string }> = [
  { provider: "youtube", label: "YouTube" },
  { provider: "google_drive", label: "Google Drive" },
  { provider: "supabase_storage", label: "Almacenamiento" },
]

function toProvider(value: string | null | undefined): DocumentoProvider | null {
  return providerTabs.some((tab) => tab.provider === value)
    ? (value as DocumentoProvider)
    : null
}

function countLabel(count: number) {
  return `${count} ${count === 1 ? "elemento" : "elementos"}`
}

function ProviderLoadingState({ label }: { label: string }) {
  return (
    <div
      aria-label={`Cargando contenido de ${label}`}
      className="min-h-56 space-y-3 rounded-lg border p-6"
    >
      <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
    </div>
  )
}

export function DocumentosProviderTabs({
  providers,
  canWrite,
  onCreate,
  initialProvider,
  queryParam,
}: DocumentosProviderTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const providerFromUrl = queryParam
    ? toProvider(searchParams?.get(queryParam))
    : null
  const [activeProvider, setActiveProvider] = useState<DocumentoProvider>(
    providerFromUrl ?? initialProvider ?? "youtube",
  )
  const errorProviders = providerTabs
    .filter(({ provider }) => providers[provider].state === "error")
    .map(({ provider }) => provider)
    .join(",")

  useEffect(() => {
    if (!errorProviders) return

    Sentry.captureMessage("document_provider_load_failed", {
      level: "error",
      tags: { provider: errorProviders },
    })
  }, [errorProviders])

  function handleValueChange(value: string | null) {
    const provider = toProvider(value)
    if (!provider) return

    setActiveProvider(provider)
    if (!queryParam) return

    const params = new URLSearchParams(searchParams?.toString())
    params.set(queryParam, provider)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={activeProvider} onValueChange={handleValueChange}>
      <TabsList
        activateOnFocus
        aria-label="Proveedores de documentos"
        className="mb-4 w-full sm:w-fit"
      >
        {providerTabs.map(({ provider, label }) => {
          const count = providers[provider].count ?? 0

          return (
            <TabsTrigger
              key={provider}
              value={provider}
              aria-label={`${label}, ${countLabel(count)}`}
            >
              {label}
              <span aria-hidden="true" className="text-xs text-muted-foreground">
                ({count})
              </span>
            </TabsTrigger>
          )
        })}
      </TabsList>

      {providerTabs.map(({ provider, label }) => {
        const tab = providers[provider]

        return (
          <TabsContent key={provider} value={provider} className="min-h-56">
            {tab.state === "loading" ? <ProviderLoadingState label={label} /> : null}
            {tab.state === "error" ? (
              <section
                role="alert"
                className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 p-6 text-center"
              >
                <p>{tab.errorMessage ?? "No se pudo cargar el contenido."}</p>
                {tab.onRetry ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={tab.onRetry}
                  >
                    Reintentar
                  </button>
                ) : null}
              </section>
            ) : null}
            {tab.state === "empty-setup" || tab.state === "empty-filtered" ? (
              <DocumentoProviderEmptyState
                provider={provider}
                state={tab.state}
                canWrite={canWrite}
                onCreate={onCreate}
                onClearFilters={tab.onClearFilters}
              />
            ) : null}
            {tab.state === "data" ? (
              <div className="space-y-4">
                {tab.children}
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer font-medium">Cómo funciona</summary>
                  <div className="mt-4">
                    <DocumentoProviderGuide provider={provider} />
                  </div>
                </details>
              </div>
            ) : null}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
