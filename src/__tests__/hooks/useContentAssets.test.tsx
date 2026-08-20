import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const hookMocks = vi.hoisted(() => ({ useQuery: vi.fn() }))
const serviceMocks = vi.hoisted(() => ({ fetchContentAssets: vi.fn() }))

vi.mock("@/hooks/useQuery", () => ({ useQuery: hookMocks.useQuery }))
vi.mock("@/services/content-assets.service", () => serviceMocks)

beforeEach(() => {
  vi.clearAllMocks()
  hookMocks.useQuery.mockReturnValue({
    data: null,
    count: null,
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  })
})

describe("useContentAssets", () => {
  it("incluye los IDs editoriales en la consulta y en su clave de caché", async () => {
    const { useContentAssets } = await import("@/hooks/useContentAssets")
    renderHook(() =>
      useContentAssets("workspace-1", {
        provider: "supabase_storage",
        sedeId: "sede-1",
        assetIds: ["asset-1"],
      }),
    )

    const [queryFn, queryKey] = hookMocks.useQuery.mock.calls[0] ?? []
    expect(queryKey).toEqual([
      "content-assets",
      "workspace-1",
      "supabase_storage",
      "sede-1",
      null,
      ["asset-1"],
    ])
    if (typeof queryFn !== "function") throw new Error("La consulta no se ha registrado")
    await queryFn()
    expect(serviceMocks.fetchContentAssets).toHaveBeenCalledWith(
      "workspace-1",
      {
        provider: "supabase_storage",
        sedeId: "sede-1",
        assetIds: ["asset-1"],
      },
      undefined,
    )
  })

  it("separa la caché por workspace, proveedor, sede y paginación", async () => {
    const { useContentAssets } = await import("@/hooks/useContentAssets")
    renderHook(() =>
      useContentAssets("workspace-1", {
        provider: "youtube",
        sedeId: "sede-1",
        pagination: { limit: 10, offset: 20 },
      }),
    )

    expect(hookMocks.useQuery.mock.calls[0]?.[1]).toEqual([
      "content-assets",
      "workspace-1",
      "youtube",
      "sede-1",
      { limit: 10, offset: 20 },
    ])
  })

  it("no consulta el servicio sin workspace activo", async () => {
    const { useContentAssets } = await import("@/hooks/useContentAssets")
    renderHook(() => useContentAssets(null, { provider: "youtube" }))

    const queryFn = hookMocks.useQuery.mock.calls[0]?.[0]
    if (typeof queryFn !== "function") throw new Error("La consulta no se ha registrado")
    await queryFn()

    expect(serviceMocks.fetchContentAssets).not.toHaveBeenCalled()
  })
})
