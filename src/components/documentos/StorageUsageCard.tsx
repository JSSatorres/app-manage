"use client"

import { useState } from "react"
import { HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStorageUsage } from "@/hooks/useStorageUsage"
import { StorageUpgradeDialog } from "./StorageUpgradeDialog"

type StorageProvider = "youtube" | "google_drive" | "supabase_storage"

interface StorageUsageCardProps {
  provider: StorageProvider
  workspaceId: string | null
  canWrite: boolean
  onUpload?: () => void
}

function formatGib(bytes: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(bytes / 1_073_741_824)
}

function getProviderMessage(provider: Exclude<StorageProvider, "supabase_storage">) {
  return provider === "youtube"
    ? "YouTube se gestiona como proveedor externo. Sus vídeos no consumen la cuota de almacenamiento facturable."
    : "Google Drive se gestiona como proveedor externo. Sus archivos no consumen la cuota de almacenamiento facturable."
}

function getUsageMessage(state: "ok" | "warning" | "limited", realPercent: number | null) {
  if (state === "warning") return "Has alcanzado el 80 % de la cuota contratada."
  if (state === "limited" && realPercent !== null && realPercent > 100) {
    return "Has superado la cuota contratada."
  }
  if (state === "limited") return "Has alcanzado el límite de la cuota contratada."
  return "La cuota de almacenamiento está disponible."
}

export function StorageUsageCard({
  provider,
  workspaceId,
  canWrite,
  onUpload,
}: StorageUsageCardProps) {
  const { usage, upgrades, loading, errorMessage } = useStorageUsage(workspaceId)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)

  if (provider !== "supabase_storage") {
    return (
      <section aria-label="Almacenamiento externo" className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">{getProviderMessage(provider)}</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section aria-label="Cuota de almacenamiento" className="rounded-xl border border-border bg-card p-4 shadow-card">
        <p role="status" className="text-sm text-muted-foreground">Cargando cuota de almacenamiento…</p>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section aria-label="Cuota de almacenamiento" className="rounded-xl border border-border bg-card p-4 shadow-card">
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar la cuota de almacenamiento: {errorMessage}
        </p>
      </section>
    )
  }

  if (!usage) return null

  const isLimited = usage.state === "limited"
  const summary = `${formatGib(usage.usedBytes)} GiB usado + ${formatGib(usage.reservedBytes)} GiB reservado / ${formatGib(usage.limitBytes)} GiB contratados`
  const roundedPercent = Math.round(usage.percent)

  return (
    <section aria-labelledby="storage-usage-title" className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-20">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <HardDrive className="size-[18px]" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h2 id="storage-usage-title" className="text-[14.5px] font-semibold">Cuota de almacenamiento</h2>
          <p className="text-[12.5px] text-muted-foreground">{summary}</p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Uso de cuota facturable"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={roundedPercent}
        aria-valuetext={`${usage.realPercent === null ? "Sin límite definido" : `${formatGib(usage.occupiedBytes)} GiB ocupados, ${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(usage.realPercent)} % de cuota`}`}
        className="h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={isLimited ? "h-full rounded-full bg-destructive" : usage.state === "warning" ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-gradient-to-r from-chart-1 to-chart-6"}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      <p className={isLimited ? "text-[13px] text-destructive" : "text-[13px] text-muted-foreground"}>
        {getUsageMessage(usage.state, usage.realPercent)}
      </p>
      {isLimited ? (
        <p className="text-sm text-muted-foreground">
          Tus archivos existentes siguen disponibles para abrirlos o eliminarlos.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        {canWrite ? (
          <Button type="button" onClick={onUpload} disabled={isLimited}>
            Subir archivo
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setUpgradeDialogOpen(true)}>
          Ampliar almacenamiento
        </Button>
      </div>
      <StorageUpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        workspaceId={workspaceId}
        upgrades={upgrades}
      />
    </section>
  )
}
