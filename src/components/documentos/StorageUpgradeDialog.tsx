"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStorageUpgrades } from "@/hooks/useStorageUpgrades"
import type { StorageUpgradeCatalogItem } from "@/services/storage-usage.service"

interface StorageUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string | null
  upgrades: StorageUpgradeCatalogItem[]
}

function formatGib(bytes: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(bytes / 1_073_741_824)
}

function formatMonthlyPrice(priceMinor: number, currencyCode: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currencyCode,
  }).format(priceMinor / 100)
}

export function StorageUpgradeDialog({
  open,
  onOpenChange,
  workspaceId,
  upgrades,
}: StorageUpgradeDialogProps) {
  const {
    requestUpgrade,
    requestLoading,
    requestErrorMessage,
    confirmationMessage,
  } = useStorageUpgrades(workspaceId)
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const selectedUpgrade =
    upgrades.find((upgrade) => upgrade.id === selectedCatalogItemId) ?? upgrades[0] ?? null

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setRequestMessage(null)
    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    if (!selectedUpgrade) return

    const result = await requestUpgrade({ catalogItemId: selectedUpgrade.id })
    if (result) setRequestMessage(result.message ?? confirmationMessage)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <div>
            <DialogTitle>Ampliar almacenamiento</DialogTitle>
            <DialogDescription>
              Elige la ampliación que quieres solicitar para el espacio privado del club.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La ampliación se activa manualmente tras confirmación.
            </p>
            {upgrades.length > 0 ? (
              <fieldset className="space-y-2" disabled={requestLoading}>
                <legend className="font-medium">Capacidad adicional</legend>
                {upgrades.map((upgrade) => {
                  const inputId = `storage-upgrade-${upgrade.id}`
                  const capacity = `${formatGib(upgrade.capacityBytes)} GiB`
                  const price = `${formatMonthlyPrice(upgrade.monthlyPriceMinor, upgrade.currencyCode)} al mes`

                  return (
                    <label
                      key={upgrade.id}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-center justify-between gap-4 border p-4 has-[:checked]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          id={inputId}
                          type="radio"
                          name="storage-upgrade"
                          value={upgrade.id}
                          checked={selectedUpgrade?.id === upgrade.id}
                          onChange={() => setSelectedCatalogItemId(upgrade.id)}
                        />
                        <span>
                          <span className="block font-medium">{upgrade.name}</span>
                          <span className="block text-sm text-muted-foreground">{capacity}</span>
                        </span>
                      </span>
                      <span className="text-right text-sm font-medium">{price}</span>
                    </label>
                  )
                })}
              </fieldset>
            ) : (
              <p role="status" className="text-sm text-muted-foreground">
                No hay ampliaciones de almacenamiento disponibles actualmente.
              </p>
            )}
            {requestErrorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                No se pudo enviar la solicitud: {requestErrorMessage}
              </p>
            ) : null}
            {requestMessage ? (
              <p role="status" aria-live="polite" className="text-sm text-primary">
                {requestMessage}
              </p>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!selectedUpgrade || requestLoading}
          >
            {requestLoading ? "Enviando solicitud…" : "Solicitar ampliación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
