import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EconomicFilters } from "@/types/economia";

const hookMocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  archiveEconomicCategory: vi.fn(),
  cancelEconomicEntry: vi.fn(),
  createEconomicCategory: vi.fn(),
  createEconomicEntry: vi.fn(),
  createEconomicSchedule: vi.fn(),
  fetchEconomicCategories: vi.fn(),
  fetchEconomicExport: vi.fn(),
  fetchEconomicEntries: vi.fn(),
  fetchEconomicMovements: vi.fn(),
  fetchEconomicSchedules: vi.fn(),
  fetchEconomicSettings: vi.fn(),
  generateNextEconomicOccurrence: vi.fn(),
  recordEconomicAdjustment: vi.fn(),
  recordEconomicMovement: vi.fn(),
  setEconomicCategoryActive: vi.fn(),
  updateEconomicCategory: vi.fn(),
  updateEconomicEntry: vi.fn(),
  updateEconomicSchedule: vi.fn(),
  updateEconomicSettings: vi.fn(),
}));

vi.mock("@/hooks/useMutation", () => ({ useMutation: hookMocks.useMutation }));
vi.mock("@/hooks/useQuery", () => ({ useQuery: hookMocks.useQuery }));
vi.mock("@/services/economia.service", () => serviceMocks);

beforeEach(() => {
  vi.clearAllMocks();
  hookMocks.useQuery.mockReturnValue({
    data: [],
    count: null,
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  });
  hookMocks.useMutation.mockReturnValue({
    mutate: vi.fn(),
    loading: false,
    errorMessage: null,
    reset: vi.fn(),
  });
});

describe("economicKeys", () => {
  const workspaceId = "workspace-1";
  const filters: EconomicFilters = {
    categoryId: "categoria-1",
    fromDate: "2026-08-01",
    toDate: "2026-08-31",
  };

  it("separa resumen, entradas, categorías y recurrencias por workspace y filtros", async () => {
    const { economicKeys } = await import("@/hooks/queryKeys");

    expect(economicKeys.summary.list(workspaceId, filters)).toEqual([
      "economia",
      "summary",
      workspaceId,
      filters,
    ]);
    expect(economicKeys.entries.list(workspaceId, filters)).toEqual([
      "economia",
      "entries",
      workspaceId,
      filters,
    ]);
    expect(economicKeys.movements.list(workspaceId)).toEqual([
      "economia",
      "movements",
      workspaceId,
    ]);
    expect(economicKeys.categories.list(workspaceId, true)).toEqual([
      "economia",
      "categories",
      workspaceId,
      true,
    ]);
    expect(economicKeys.schedules.list(workspaceId, "active")).toEqual([
      "economia",
      "schedules",
      workspaceId,
      "active",
    ]);
  });
});

describe("useEconomia", () => {
  it("no consulta el servicio cuando falta el workspace activo", async () => {
    const { useEconomia } = await import("@/hooks/useEconomia");
    renderHook(() => useEconomia(null));

    const queryFunctions = hookMocks.useQuery.mock.calls.map(([queryFn]) => queryFn);
    await Promise.all(queryFunctions.map((queryFn) => queryFn()));

    expect(serviceMocks.fetchEconomicSettings).not.toHaveBeenCalled();
    expect(serviceMocks.fetchEconomicCategories).not.toHaveBeenCalled();
    expect(serviceMocks.fetchEconomicSchedules).not.toHaveBeenCalled();
    expect(serviceMocks.fetchEconomicEntries).not.toHaveBeenCalled();
    expect(serviceMocks.fetchEconomicMovements).not.toHaveBeenCalled();
  });

  it("expone movimientos scoped y reintenta todas las consultas económicas", async () => {
    const refetch = vi.fn();
    const settlement = {
      id: "movement-1",
      workspaceId: "workspace-1",
      entryId: "entry-1",
      movementType: "settlement",
      paymentMethod: "cash",
      amountMinor: 5000,
      currencyCode: "EUR",
      externalStatus: "succeeded",
      originalMovementId: null,
      externalReference: null,
      occurredAt: null,
      createdAt: "2026-08-09T10:00:00.000Z",
    };
    hookMocks.useQuery.mockReturnValue({
      data: [settlement],
      count: null,
      loading: false,
      errorMessage: null,
      refetch,
    });

    const { useEconomia } = await import("@/hooks/useEconomia");
    const { result } = renderHook(() => useEconomia("workspace-1"));

    expect(result.current.movimientos).toEqual([settlement]);
    await result.current.refetchEconomia();
    expect(refetch).toHaveBeenCalledTimes(5);
  });

  it("expone la accion de exportacion con su loader sin almacenar datos remotos en Zustand", async () => {
    const exportMutation = vi.fn().mockResolvedValue({ totalEntries: 1, complete: true });
    hookMocks.useMutation.mockImplementation(() => ({
      mutate: exportMutation,
      loading: false,
      errorMessage: null,
      reset: vi.fn(),
    }));
    const { useEconomia } = await import("@/hooks/useEconomia");
    const { result } = renderHook(() => useEconomia("workspace-1"));

    await result.current.exportarEconomia({ period: "2026-09", status: "partial" });

    expect(exportMutation).toHaveBeenCalledWith({ period: "2026-09", status: "partial" });
    expect(result.current.exportando).toBe(false);
  });

  it("invalida resumen y la familia de entradas al actualizar una entrada", async () => {
    const { useEconomia } = await import("@/hooks/useEconomia");
    const filters: EconomicFilters = { lifecycle: "open", playerId: "jugador-1" };
    renderHook(() => useEconomia("workspace-1", { filtros: filters }));

    const updateEntryMutation = hookMocks.useMutation.mock.calls[9];

    expect(updateEntryMutation?.[1]).toMatchObject({
      invalidateKeys: [
        ["economia", "summary", "workspace-1"],
        ["economia", "entries", "workspace-1"],
      ],
    });
    expect(hookMocks.useQuery.mock.calls[3]?.[1]).toEqual([
      "economia",
      "entries",
      "workspace-1",
      filters,
    ]);
  });
});
