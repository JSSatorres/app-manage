import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { StorageUsageCard } from "@/components/documentos/StorageUsageCard"
import type { StorageUsage } from "@/services/storage-usage.service"

const storageUsageMocks = vi.hoisted(() => ({ useStorageUsage: vi.fn() }))

vi.mock("@/hooks/useStorageUsage", () => storageUsageMocks)
vi.mock("@/components/documentos/StorageUpgradeDialog", () => ({
  StorageUpgradeDialog: ({ open }: { open: boolean }) =>
    open ? <p role="dialog">Selector de ampliación</p> : null,
}))

const usage: StorageUsage = {
  workspaceId: "workspace-1",
  usedBytes: 2 * 1_073_741_824,
  reservedBytes: 1 * 1_073_741_824,
  limitBytes: 10 * 1_073_741_824,
  occupiedBytes: 3 * 1_073_741_824,
  realPercent: 30,
  percent: 30,
  state: "ok",
  version: 1,
  updatedAt: "2026-08-09T10:00:00.000Z",
}

function mockUsage(overrides: Partial<typeof usage> = {}) {
  storageUsageMocks.useStorageUsage.mockReturnValue({
    usage: { ...usage, ...overrides },
    upgrades: [],
    loading: false,
    errorMessage: null,
  })
}

describe("StorageUsageCard", () => {
  it("muestra la cuota facturable con usado, reservado y capacidad contratada", () => {
    mockUsage()

    render(
      <StorageUsageCard
        provider="supabase_storage"
        workspaceId="workspace-1"
        canWrite
      />,
    )

    expect(screen.getByText("2 GiB usado + 1 GiB reservado / 10 GiB contratados")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Uso de cuota facturable" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    )
  })

  it("avisa al alcanzar el 80 % y limita la subida al alcanzar o superar la cuota", () => {
    mockUsage({ percent: 80, realPercent: 80, state: "warning" })
    const { rerender } = render(
      <StorageUsageCard
        provider="supabase_storage"
        workspaceId="workspace-1"
        canWrite
      />,
    )

    expect(screen.getByText("Has alcanzado el 80 % de la cuota contratada.")).toBeInTheDocument()

    mockUsage({
      usedBytes: 11 * 1_073_741_824,
      reservedBytes: 0,
      occupiedBytes: 11 * 1_073_741_824,
      percent: 100,
      realPercent: 110,
      state: "limited",
    })
    rerender(
      <StorageUsageCard
        provider="supabase_storage"
        workspaceId="workspace-1"
        canWrite
      />,
    )

    expect(screen.getByText("Has superado la cuota contratada.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Subir archivo" })).toBeDisabled()
    expect(screen.getByText("Tus archivos existentes siguen disponibles para abrirlos o eliminarlos.")).toBeInTheDocument()
  })

  it("ofrece ampliar almacenamiento y muestra un error de carga accionable", () => {
    storageUsageMocks.useStorageUsage.mockReturnValue({
      usage: null,
      upgrades: [],
      loading: false,
      errorMessage: "No se pudo conectar",
    })
    const { rerender } = render(
      <StorageUsageCard
        provider="supabase_storage"
        workspaceId="workspace-1"
        canWrite
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo conectar")

    mockUsage()
    rerender(
      <StorageUsageCard
        provider="supabase_storage"
        workspaceId="workspace-1"
        canWrite
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Ampliar almacenamiento" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("Selector de ampliación")
  })

  it("explica que YouTube y Drive no consumen la cuota facturable", () => {
    mockUsage()

    render(
      <StorageUsageCard
        provider="youtube"
        workspaceId="workspace-1"
        canWrite
      />,
    )

    expect(screen.getByText(/YouTube se gestiona como proveedor externo/)).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
  })
})
