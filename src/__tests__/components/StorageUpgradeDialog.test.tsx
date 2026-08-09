import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StorageUpgradeDialog } from "@/components/documentos/StorageUpgradeDialog"
import type { StorageUpgradeCatalogItem } from "@/services/storage-usage.service"

const storageUpgradeMocks = vi.hoisted(() => ({ useStorageUpgrades: vi.fn() }))

vi.mock("@/hooks/useStorageUpgrades", () => storageUpgradeMocks)

const upgrades: StorageUpgradeCatalogItem[] = [
  {
    id: "7a9a73ea-eac7-4a86-aefa-5769c4950540",
    code: "storage-50-gib",
    name: "Ampliación de 50 GiB",
    capacityBytes: 50 * 1_073_741_824,
    monthlyPriceMinor: 900,
    currencyCode: "EUR",
    sortOrder: 1,
  },
]

describe("StorageUpgradeDialog", () => {
  it("lista el catálogo activo con capacidad y precio mensual accesibles", () => {
    storageUpgradeMocks.useStorageUpgrades.mockReturnValue({
      requestUpgrade: vi.fn(),
      requestLoading: false,
      requestErrorMessage: null,
      confirmationMessage: "Solicitud enviada; la ampliación se activa tras confirmación",
    })

    render(
      <StorageUpgradeDialog
        open
        onOpenChange={vi.fn()}
        workspaceId="workspace-1"
        upgrades={upgrades}
      />,
    )

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Ampliar almacenamiento")
    expect(screen.getByRole("radio", { name: /Ampliación de 50 GiB.*9,00/ })).toBeChecked()
    expect(screen.getByText("La ampliación se activa manualmente tras confirmación.")).toBeInTheDocument()
  })

  it("confirma la solicitud, conserva el foco en el diálogo y comunica la activación manual", async () => {
    const requestUpgrade = vi.fn().mockResolvedValue({
      message: "Solicitud enviada; la ampliación se activa tras confirmación",
    })
    storageUpgradeMocks.useStorageUpgrades.mockReturnValue({
      requestUpgrade,
      requestLoading: false,
      requestErrorMessage: null,
      confirmationMessage: "Solicitud enviada; la ampliación se activa tras confirmación",
    })

    render(
      <StorageUpgradeDialog
        open
        onOpenChange={vi.fn()}
        workspaceId="workspace-1"
        upgrades={upgrades}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Solicitar ampliación" }))

    await waitFor(() =>
      expect(requestUpgrade).toHaveBeenCalledWith({ catalogItemId: upgrades[0].id }),
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Solicitud enviada; la ampliación se activa tras confirmación",
    )
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true)
  })
})
