import { beforeEach, describe, expect, it, vi } from "vitest";

const ACTIVE_WORKSPACE_ID = "ws-active-111";

interface RecordedCall {
  table: string;
  payload?: unknown;
  eqCalls: [string, unknown][];
}

function createSupabaseMock(
  responsesByTable: Record<string, { data: unknown; error: null; count?: number | null }> = {},
) {
  const calls: RecordedCall[] = [];

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, eqCalls: [] };
    calls.push(record);
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      insert: vi.fn((payload: unknown) => {
        record.payload = payload;
        return builder;
      }),
      update: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value]);
        return builder;
      }),
      order: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      single: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown; error: null; count?: number | null }) => unknown) =>
        Promise.resolve(responsesByTable[table] ?? { data: table === "economic_settings" ? null : [], error: null }).then(resolve),
    };
    return builder;
  }

  return {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    calls,
  };
}

function hasWorkspaceScope(calls: RecordedCall[], table: string) {
  return calls
    .filter((call) => call.table === table)
    .some((call) => call.eqCalls.some(([column, value]) => column === "workspace_id" && value === ACTIVE_WORKSPACE_ID));
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("economia.service — tenant scope", () => {
  it("acota settings y categorías al workspace activo", async () => {
    const { from, calls } = createSupabaseMock({
      economic_entries: { data: [], error: null, count: 0 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEconomicSettings, fetchEconomicCategories, fetchEconomicExport, fetchEconomicMovements } = await import("@/services/economia.service");
    await fetchEconomicSettings(ACTIVE_WORKSPACE_ID);
    await fetchEconomicCategories(ACTIVE_WORKSPACE_ID);
    await fetchEconomicMovements(ACTIVE_WORKSPACE_ID);
    await fetchEconomicExport(ACTIVE_WORKSPACE_ID);

    expect(hasWorkspaceScope(calls, "economic_settings")).toBe(true);
    expect(hasWorkspaceScope(calls, "economic_categories")).toBe(true);
    expect(hasWorkspaceScope(calls, "economic_movements")).toBe(true);
    expect(hasWorkspaceScope(calls, "economic_entries")).toBe(true);
  });

  it("acota cada actualización por id y workspace activo", async () => {
    const { from, calls } = createSupabaseMock();
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEconomicSettings, setEconomicCategoryActive } = await import("@/services/economia.service");
    await updateEconomicSettings("settings-1", ACTIVE_WORKSPACE_ID, { currencyCode: "EUR", timezone: "Europe/Madrid" });
    await setEconomicCategoryActive("category-1", ACTIVE_WORKSPACE_ID, false);

    for (const table of ["economic_settings", "economic_categories"]) {
      const call = calls.find((candidate) => candidate.table === table);
      expect(call?.eqCalls).toContainEqual(["workspace_id", ACTIVE_WORKSPACE_ID]);
      expect(call?.eqCalls).toContainEqual(["id", table === "economic_settings" ? "settings-1" : "category-1"]);
    }
  });

  it("rechaza temprano las operaciones sin workspace", async () => {
    const { from } = createSupabaseMock();
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEconomicCategories, fetchEconomicMovements, createEconomicCategory } = await import("@/services/economia.service");
    const read = await fetchEconomicCategories(null);
    const movements = await fetchEconomicMovements(undefined);
    const write = await createEconomicCategory(undefined, { direction: "income", code: "donaciones", name: "Donaciones" });

    expect(read).toMatchObject({ data: null, error: expect.any(Error) });
    expect(movements).toMatchObject({ data: null, error: expect.any(Error) });
    expect(write).toMatchObject({ data: null, error: expect.any(Error) });
    expect(from).not.toHaveBeenCalled();
  });

  it("mantiene workspace_id tanto en las entradas como en los movimientos append-only", async () => {
    const entryRow = {
      id: "entry-1",
      workspace_id: ACTIVE_WORKSPACE_ID,
      entry_type: "player_charge",
      category_id: "category-1",
      player_id: "player-1",
      concept: "Cuota",
      counterparty_name: null,
      amount_minor: 10000,
      currency_code: "EUR",
      issue_date: "2026-09-01",
      due_date: "2026-09-10",
      schedule_id: null,
      period_key: null,
      lifecycle: "open",
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      created_at: "2026-08-08T10:00:00.000Z",
      updated_at: "2026-08-08T10:00:00.000Z",
    };
    const { from, auth, calls } = createSupabaseMock({
      economic_entries: { data: entryRow, error: null },
      economic_movements: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, auth } as never);

    const { cancelEconomicEntry, createEconomicEntry, recordEconomicMovement, updateEconomicEntry } = await import(
      "@/services/economia.service"
    );
    await createEconomicEntry(ACTIVE_WORKSPACE_ID, {
      entryType: "player_charge",
      categoryId: "category-1",
      playerId: "player-1",
      concept: "Cuota",
      amountMinor: 10000,
      currencyCode: "EUR",
      issueDate: "2026-09-01",
      dueDate: "2026-09-10",
    });
    await updateEconomicEntry("entry-1", ACTIVE_WORKSPACE_ID, { concept: "Cuota actualizada" });
    await cancelEconomicEntry("entry-1", ACTIVE_WORKSPACE_ID, "Duplicado");
    await recordEconomicMovement(ACTIVE_WORKSPACE_ID, {
      entryId: "entry-1",
      movementType: "settlement",
      paymentMethod: "cash",
      amountMinor: 10000,
      currencyCode: "EUR",
    });

    expect(calls.filter((call) => call.table === "economic_entries").some((call) => call.payload &&
      (call.payload as { workspace_id?: string }).workspace_id === ACTIVE_WORKSPACE_ID)).toBe(true);
    expect(calls.filter((call) => call.table === "economic_movements").some((call) => call.payload &&
      (call.payload as { workspace_id?: string }).workspace_id === ACTIVE_WORKSPACE_ID)).toBe(true);
    for (const call of calls.filter((call) => call.table === "economic_entries" && !call.payload)) {
      expect(call.eqCalls).toContainEqual(["workspace_id", ACTIVE_WORKSPACE_ID]);
    }
    expect(calls.filter((call) => call.table === "economic_movements" && !call.payload).every((call) =>
      call.eqCalls.some(([column, value]) => column === "workspace_id" && value === ACTIVE_WORKSPACE_ID),
    )).toBe(true);
  });
});
