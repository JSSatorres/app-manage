import { beforeEach, describe, expect, it, vi } from "vitest";

const WORKSPACE_ID = "ws-economic-111";

const SETTINGS_ROW = {
  id: "settings-1",
  workspace_id: WORKSPACE_ID,
  currency_code: "EUR",
  timezone: "Europe/Madrid",
  created_at: null,
  updated_at: null,
};

const ACTIVE_CATEGORY_ROW = {
  id: "category-1",
  workspace_id: WORKSPACE_ID,
  direction: "income",
  code: "player_fees",
  name: "Cuotas de jugadores",
  is_predefined: true,
  is_active: true,
  created_at: "2026-08-08T10:00:00.000Z",
  updated_at: "2026-08-08T10:00:00.000Z",
};

const INACTIVE_CATEGORY_ROW = {
  ...ACTIVE_CATEGORY_ROW,
  id: "category-2",
  code: "legacy_income",
  name: "Ingreso histórico",
  is_predefined: false,
  is_active: false,
};

type QueryResponse = { data: unknown; error: unknown; count?: number | null };
type QueryResponses = QueryResponse | QueryResponse[];

interface RecordedCall {
  table: string;
  method: "select" | "insert" | "update" | null;
  payload?: unknown;
  selectFields?: string;
  selectOptions?: unknown;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown[]][];
  rangeCalls: [number, number][];
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponses>) {
  const calls: RecordedCall[] = [];
  const responseIndexes = new Map<string, number>();

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, method: null, eqCalls: [], inCalls: [], rangeCalls: [] };
    calls.push(record);
    const builder: Record<string, unknown> = {
      select: vi.fn((fields: string, options?: unknown) => {
        if (!record.method) record.method = "select";
        record.selectFields = fields;
        record.selectOptions = options;
        return builder;
      }),
      insert: vi.fn((payload: unknown) => {
        record.method = "insert";
        record.payload = payload;
        return builder;
      }),
      update: vi.fn((payload: unknown) => {
        record.method = "update";
        record.payload = payload;
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value]);
        return builder;
      }),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      in: vi.fn((column: string, values: unknown[]) => {
        record.inCalls.push([column, values]);
        return builder;
      }),
      range: vi.fn((from: number, to: number) => {
        record.rangeCalls.push([from, to]);
        return builder;
      }),
      order: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: (resolve: (value: QueryResponse) => unknown, reject?: (reason: unknown) => unknown) => {
        const configured = responsesByTable[table] ?? { data: [], error: null };
        const index = responseIndexes.get(table) ?? 0;
        responseIndexes.set(table, index + 1);
        const response = Array.isArray(configured) ? configured[index] ?? configured.at(-1) : configured;
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    return builder;
  }

  return { from: vi.fn((table: string) => makeBuilder(table)), calls };
}

vi.mock("@/services/supabase", () => ({ getSupabaseClient: vi.fn() }));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("economia.service — settings", () => {
  it("mapea settings con valores seguros y usa una selección explícita", async () => {
    const { from, calls } = createSupabaseMock({
      economic_settings: { data: SETTINGS_ROW, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { ECONOMIC_SETTINGS_SELECT_FIELDS, fetchEconomicSettings } = await import("@/services/economia.service");
    const result = await fetchEconomicSettings(WORKSPACE_ID);

    expect(calls[0]?.selectFields).toBe(ECONOMIC_SETTINGS_SELECT_FIELDS);
    expect(result).toEqual({
      data: {
        id: "settings-1",
        workspaceId: WORKSPACE_ID,
        currencyCode: "EUR",
        timezone: "Europe/Madrid",
        createdAt: "",
        updatedAt: "",
      },
      error: null,
    });
  });
});

describe("economia.service — entradas", () => {
  it("lista movimientos del workspace activo con selección explícita y campos de dominio", async () => {
    const movementRow = {
      id: "movement-1",
      workspace_id: WORKSPACE_ID,
      entry_id: "entry-1",
      movement_type: "settlement",
      payment_method: "cash",
      amount_minor: 4500,
      currency_code: "EUR",
      external_status: "succeeded",
      original_movement_id: null,
      external_reference: null,
      occurred_at: "2026-09-02T10:00:00.000Z",
      created_at: "2026-09-02T10:00:00.000Z",
    };
    const { from, calls } = createSupabaseMock({
      economic_movements: { data: [movementRow], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { ECONOMIC_MOVEMENTS_SELECT_FIELDS, fetchEconomicMovements } = await import("@/services/economia.service");
    const result = await fetchEconomicMovements(WORKSPACE_ID);

    expect(calls[0]?.selectFields).toBe(ECONOMIC_MOVEMENTS_SELECT_FIELDS);
    expect(calls[0]?.eqCalls).toContainEqual(["workspace_id", WORKSPACE_ID]);
    expect(result.data).toEqual([expect.objectContaining({
      id: "movement-1",
      workspaceId: WORKSPACE_ID,
      entryId: "entry-1",
      amountMinor: 4500,
      movementType: "settlement",
    })]);
  });

  it("lista entradas por filtros del periodo, tipo, estado, categoría y jugador", async () => {
    const entryRow = {
      id: "entry-1",
      workspace_id: WORKSPACE_ID,
      entry_type: "player_charge",
      category_id: "category-1",
      player_id: "player-1",
      concept: "Cuota de septiembre",
      counterparty_name: null,
      amount_minor: 4500,
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
    const { from, calls } = createSupabaseMock({
      economic_entries: { data: [entryRow], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { ECONOMIC_ENTRIES_SELECT_FIELDS, fetchEconomicEntries } = await import("@/services/economia.service");
    const result = await fetchEconomicEntries(WORKSPACE_ID, {
      entryType: "player_charge",
      lifecycle: "open",
      categoryId: "category-1",
      playerId: "player-1",
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
    });

    expect(calls[0]?.selectFields).toBe(ECONOMIC_ENTRIES_SELECT_FIELDS);
    expect(calls[0]?.eqCalls).toEqual(
      expect.arrayContaining([
        ["workspace_id", WORKSPACE_ID],
        ["entry_type", "player_charge"],
        ["lifecycle", "open"],
        ["category_id", "category-1"],
        ["player_id", "player-1"],
      ]),
    );
    expect(result.data).toEqual([expect.objectContaining({ id: "entry-1", amountMinor: 4500 })]);
  });

  it("pagina el export completo, confirma los recuentos y deriva el estado con movimientos scoped", async () => {
    const firstEntry = {
      id: "entry-1", workspace_id: WORKSPACE_ID, entry_type: "player_charge", category_id: "category-1",
      player_id: "player-1", concept: "Cuota", counterparty_name: null, amount_minor: 10000, currency_code: "EUR",
      issue_date: "2026-09-01", due_date: "2026-09-15", schedule_id: null, period_key: "2026-09", lifecycle: "open",
      cancellation_reason: null, cancelled_at: null, cancelled_by: null, created_at: "2026-08-01", updated_at: "2026-08-01",
    };
    const secondEntry = { ...firstEntry, id: "entry-2", concept: "Material", entry_type: "expense", player_id: null };
    const movement = {
      id: "movement-1", workspace_id: WORKSPACE_ID, entry_id: "entry-1", movement_type: "settlement",
      payment_method: "cash", amount_minor: 4500, currency_code: "EUR", external_status: "succeeded",
      original_movement_id: null, external_reference: null, occurred_at: "2026-09-02", created_at: "2026-09-02",
    };
    const { from, calls } = createSupabaseMock({
      economic_entries: [
        { data: null, error: null, count: 2 },
        { data: [firstEntry], error: null },
        { data: [secondEntry], error: null },
      ],
      economic_movements: [
        { data: null, error: null, count: 1 },
        { data: [movement], error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEconomicExport } = await import("@/services/economia.service");
    const result = await fetchEconomicExport(WORKSPACE_ID, { status: "partial" }, { pageSize: 1 });

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ totalEntries: 1, sourceEntriesCount: 2, complete: true });
    expect(result.data?.entries).toEqual([expect.objectContaining({ id: "entry-1" })]);
    expect(calls.filter((call) => call.table === "economic_entries").map((call) => call.rangeCalls))
      .toEqual([[], [[0, 0]], [[1, 1]]]);
    expect(calls.filter((call) => call.table === "economic_movements")[0]?.eqCalls)
      .toContainEqual(["workspace_id", WORKSPACE_ID]);
    expect(calls.filter((call) => call.table === "economic_movements")[0]?.inCalls)
      .toContainEqual(["entry_id", ["entry-1", "entry-2"]]);
  });

  it("rechaza el export si una pÃ¡gina no completa el recuento exacto", async () => {
    const { from } = createSupabaseMock({
      economic_entries: [
        { data: null, error: null, count: 2 },
        { data: [{ id: "entry-1" }], error: null },
        { data: [], error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEconomicExport } = await import("@/services/economia.service");
    const result = await fetchEconomicExport(WORKSPACE_ID, {}, { pageSize: 1 });

    expect(result).toMatchObject({ data: null, error: expect.objectContaining({ message: expect.stringMatching(/completed/i) }) });
  });

  it("crea cargos, ingresos y gastos con payload persistible en minor units", async () => {
    const entryRow = {
      id: "entry-1",
      workspace_id: WORKSPACE_ID,
      entry_type: "player_charge",
      category_id: "category-1",
      player_id: "player-1",
      concept: "Cuota de septiembre",
      counterparty_name: null,
      amount_minor: 4500,
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
    const { from, calls } = createSupabaseMock({
      economic_entries: { data: entryRow, error: null, count: 1 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEconomicEntry } = await import("@/services/economia.service");
    await createEconomicEntry(WORKSPACE_ID, {
      entryType: "player_charge",
      categoryId: "category-1",
      playerId: "player-1",
      concept: "Cuota de septiembre",
      amountMinor: 4500,
      currencyCode: "EUR",
      issueDate: "2026-09-01",
      dueDate: "2026-09-10",
    });
    await createEconomicEntry(WORKSPACE_ID, {
      entryType: "income",
      categoryId: "category-1",
      playerId: "player-2",
      concept: "Cuota social",
      amountMinor: 120000,
      currencyCode: "EUR",
      issueDate: "2026-09-01",
      dueDate: "2026-09-01",
    });
    await createEconomicEntry(WORKSPACE_ID, {
      entryType: "expense",
      categoryId: "category-2",
      concept: "Material",
      counterpartyName: "Proveedor deportivo",
      amountMinor: 8999,
      currencyCode: "EUR",
      issueDate: "2026-09-01",
      dueDate: "2026-09-15",
    });
    const invalidExpenseTarget = await createEconomicEntry(WORKSPACE_ID, {
      entryType: "expense",
      categoryId: "category-2",
      playerId: "player-1",
      concept: "Material",
      counterpartyName: "Proveedor deportivo",
      amountMinor: 8999,
      currencyCode: "EUR",
      issueDate: "2026-09-01",
      dueDate: "2026-09-15",
    });

    expect(calls.map((call) => call.payload)).toEqual([
      expect.objectContaining({
        workspace_id: WORKSPACE_ID,
        entry_type: "player_charge",
        player_id: "player-1",
        counterparty_name: null,
        amount_minor: 4500,
        currency_code: "EUR",
      }),
      expect.objectContaining({
        workspace_id: WORKSPACE_ID,
      entry_type: "income",
        player_id: "player-2",
        counterparty_name: null,
        amount_minor: 120000,
      }),
      expect.objectContaining({
        workspace_id: WORKSPACE_ID,
        entry_type: "expense",
        player_id: null,
        counterparty_name: "Proveedor deportivo",
        amount_minor: 8999,
      }),
    ]);
    expect(invalidExpenseTarget.error).toMatchObject({ message: expect.stringMatching(/expense.*player/i) });
  });

  it("bloquea los campos económicos tras un movimiento confirmado y exige motivo de cancelación", async () => {
    const { from, calls } = createSupabaseMock({
      economic_movements: { data: null, error: null, count: 1 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { cancelEconomicEntry, updateEconomicEntry } = await import("@/services/economia.service");
    const updateResult = await updateEconomicEntry("entry-1", WORKSPACE_ID, { amountMinor: 9000 });
    const cancelResult = await cancelEconomicEntry("entry-1", WORKSPACE_ID, "   ");

    expect(updateResult.error).toMatchObject({ message: expect.stringMatching(/confirmed movement/i) });
    expect(cancelResult.error).toMatchObject({ message: expect.stringMatching(/reason/i) });
    expect(calls.some((call) => call.table === "economic_entries" && call.method === "update")).toBe(false);
  });

  it("registra parciales, pago y reembolso sin editar la historia", async () => {
    const entryRow = {
      id: "entry-1",
      workspace_id: WORKSPACE_ID,
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
    const firstSettlement = {
      id: "movement-1",
      workspace_id: WORKSPACE_ID,
      entry_id: "entry-1",
      movement_type: "settlement",
      payment_method: "cash",
      amount_minor: 4000,
      currency_code: "EUR",
      external_status: "succeeded",
      original_movement_id: null,
      external_reference: null,
      occurred_at: "2026-09-02T10:00:00.000Z",
      created_at: "2026-09-02T10:00:00.000Z",
    };
    const secondSettlement = { ...firstSettlement, id: "movement-2", amount_minor: 6000 };
    const refund = {
      ...firstSettlement,
      id: "movement-3",
      movement_type: "refund",
      amount_minor: 2000,
      original_movement_id: "movement-1",
    };
    const { from, calls } = createSupabaseMock({
      economic_entries: [
        { data: entryRow, error: null },
        { data: entryRow, error: null },
        { data: entryRow, error: null },
      ],
      economic_movements: [
        { data: [], error: null },
        { data: firstSettlement, error: null },
        { data: [firstSettlement], error: null },
        { data: secondSettlement, error: null },
        { data: [firstSettlement, secondSettlement], error: null },
        { data: refund, error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deriveEconomicStatus } = await import("@/lib/economia");
    const { recordEconomicAdjustment, recordEconomicMovement } = await import("@/services/economia.service");
    const partial = await recordEconomicMovement(WORKSPACE_ID, {
      entryId: "entry-1",
      movementType: "settlement",
      paymentMethod: "cash",
      amountMinor: 4000,
      currencyCode: "EUR",
    });
    const paid = await recordEconomicMovement(WORKSPACE_ID, {
      entryId: "entry-1",
      movementType: "settlement",
      paymentMethod: "bank_transfer",
      amountMinor: 6000,
      currencyCode: "EUR",
    });
    const partiallyRefunded = await recordEconomicAdjustment(WORKSPACE_ID, {
      entryId: "entry-1",
      movementType: "refund",
      paymentMethod: "bank_transfer",
      amountMinor: 2000,
      currencyCode: "EUR",
      originalMovementId: "movement-1",
    });

    const statusEntry = { lifecycle: "open" as const, amountMinor: 10000, currencyCode: "EUR", dueDate: "2026-09-10" };
    expect(deriveEconomicStatus(statusEntry, [partial.data!], { referenceDate: "2026-09-10" })).toBe("partial");
    expect(deriveEconomicStatus(statusEntry, [partial.data!, paid.data!], { referenceDate: "2026-09-10" })).toBe("paid");
    expect(deriveEconomicStatus(statusEntry, [partial.data!, paid.data!, partiallyRefunded.data!])).toBe("partially_refunded");
    expect(calls.filter((call) => call.table === "economic_movements").map((call) => call.method)).not.toContain("update");
  });
});

describe("economia.service — auditoría", () => {
  it("expone eventos de auditoría como una lectura scoped y no expone edición ni borrado de movimientos", async () => {
    const { from, calls } = createSupabaseMock({
      economic_audit_events: {
        data: [
          {
            id: "audit-1",
            workspace_id: WORKSPACE_ID,
            entity_type: "economic_entries",
            entity_id: "entry-1",
            action: "UPDATE",
            actor_id: "user-1",
            old_data: { lifecycle: "open" },
            new_data: { lifecycle: "cancelled" },
            created_at: "2026-09-10T12:00:00.000Z",
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const service = await import("@/services/economia.service");
    const result = await service.fetchEconomicAuditEvents(WORKSPACE_ID, { entityId: "entry-1" });

    expect(calls[0]?.eqCalls).toEqual(
      expect.arrayContaining([
        ["workspace_id", WORKSPACE_ID],
        ["entity_id", "entry-1"],
      ]),
    );
    expect(result.data).toEqual([
      expect.objectContaining({ actorId: "user-1", action: "UPDATE", newData: { lifecycle: "cancelled" } }),
    ]);
    expect(service).not.toHaveProperty("updateEconomicMovement");
    expect(service).not.toHaveProperty("deleteEconomicMovement");
  });
});

describe("economia.service — categorías", () => {
  it("omite las inactivas de las opciones de alta y las conserva para histórico al solicitarlas", async () => {
    const { from, calls } = createSupabaseMock({
      economic_categories: { data: [ACTIVE_CATEGORY_ROW, INACTIVE_CATEGORY_ROW], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEconomicCategories } = await import("@/services/economia.service");
    await fetchEconomicCategories(WORKSPACE_ID);
    const historicalResult = await fetchEconomicCategories(WORKSPACE_ID, { includeInactive: true });

    expect(calls[0]?.eqCalls).toContainEqual(["is_active", true]);
    expect(calls[1]?.eqCalls).not.toContainEqual(["is_active", true]);
    expect(historicalResult.data).toContainEqual(expect.objectContaining({ id: "category-2", isActive: false }));
  });

  it("crea categorías personalizadas y puede activar, desactivar o archivar sin salir del workspace", async () => {
    const { from, calls } = createSupabaseMock({
      economic_categories: { data: INACTIVE_CATEGORY_ROW, error: null, count: 1 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { archiveEconomicCategory, createEconomicCategory, setEconomicCategoryActive } = await import("@/services/economia.service");
    await createEconomicCategory(WORKSPACE_ID, { direction: "income", code: "donaciones", name: "Donaciones" });
    await setEconomicCategoryActive("category-1", WORKSPACE_ID, false);
    await setEconomicCategoryActive("category-1", WORKSPACE_ID, true);
    await archiveEconomicCategory("category-2", WORKSPACE_ID);

    expect(calls[0]?.payload).toMatchObject({
      workspace_id: WORKSPACE_ID,
      direction: "income",
      code: "donaciones",
      name: "Donaciones",
      is_predefined: false,
      is_active: true,
    });
    for (const call of calls.slice(1)) {
      expect(call.eqCalls).toContainEqual(["workspace_id", WORKSPACE_ID]);
      expect(call.eqCalls).toContainEqual(["id", expect.any(String)]);
    }
    expect(calls.slice(1).map((call) => call.payload)).toEqual([
      { is_active: false },
      { is_active: true },
      { is_active: false },
    ]);
  });

  it("impide cambiar direction o code de una categoría ya usada", async () => {
    const { from, calls } = createSupabaseMock({
      economic_entries: { data: null, error: null, count: 1 },
      economic_schedules: { data: null, error: null, count: 0 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEconomicCategory } = await import("@/services/economia.service");
    const result = await updateEconomicCategory("category-1", WORKSPACE_ID, { code: "fees" });

    expect(result).toMatchObject({ data: null, error: expect.any(Error) });
    expect((result.error as Error).message).toMatch(/Cannot change direction or code/);
    expect(calls.some((call) => call.table === "economic_categories" && call.method === "update")).toBe(false);
  });
});

describe("economia.service — recurrencias", () => {
  const scheduleRow = {
    id: "schedule-1",
    workspace_id: WORKSPACE_ID,
    entry_type: "player_charge",
    category_id: "category-1",
    player_id: "player-1",
    concept: "Cuota mensual",
    counterparty_name: null,
    amount_minor: 4500,
    currency_code: "EUR",
    frequency: "monthly",
    next_due_date: "2026-01-31",
    end_date: null,
    status: "active",
    created_at: "2026-08-08T10:00:00.000Z",
    updated_at: "2026-08-08T10:00:00.000Z",
  };

  it("crea recurrencias semanales, mensuales y anuales con target, fecha y frecuencia válidos", async () => {
    const { from, calls } = createSupabaseMock({
      economic_schedules: { data: scheduleRow, error: null, count: 1 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEconomicSchedule } = await import("@/services/economia.service");
    await createEconomicSchedule(WORKSPACE_ID, {
      entryType: "player_charge",
      categoryId: "category-1",
      playerId: "player-1",
      concept: "Cuota semanal",
      amountMinor: 4500,
      currencyCode: "EUR",
      frequency: "weekly",
      nextDueDate: "2026-08-08",
    });
    await createEconomicSchedule(WORKSPACE_ID, {
      entryType: "income",
      categoryId: "category-1",
      playerId: "player-2",
      concept: "Patrocinio anual",
      amountMinor: 120000,
      currencyCode: "EUR",
      frequency: "yearly",
      nextDueDate: "2026-08-08",
    });
    const invalidTarget = await createEconomicSchedule(WORKSPACE_ID, {
      entryType: "player_charge",
      categoryId: "category-1",
      concept: "Sin jugador",
      amountMinor: 4500,
      currencyCode: "EUR",
      frequency: "monthly",
      nextDueDate: "2026-08-08",
    });
    const invalidFrequency = await createEconomicSchedule(WORKSPACE_ID, {
      entryType: "expense",
      categoryId: "category-1",
      counterpartyName: "Proveedor",
      concept: "Material",
      amountMinor: 4500,
      currencyCode: "EUR",
      frequency: "daily" as never,
      nextDueDate: "2026-08-08",
    });

    expect(calls.filter((call) => call.table === "economic_schedules" && call.method === "insert")).toHaveLength(2);
    expect(calls[0]?.payload).toMatchObject({
      workspace_id: WORKSPACE_ID,
      entry_type: "player_charge",
      player_id: "player-1",
      frequency: "weekly",
      next_due_date: "2026-08-08",
    });
    expect(calls[1]?.payload).toMatchObject({
      workspace_id: WORKSPACE_ID,
      entry_type: "income",
      player_id: "player-2",
      frequency: "yearly",
    });
    expect(invalidTarget.error).toMatchObject({ message: expect.stringMatching(/player/i) });
    expect(invalidFrequency.error).toBeInstanceOf(RangeError);
  });

  it("lista y actualiza recurrencias por estado sin salir del workspace", async () => {
    const { from, calls } = createSupabaseMock({
      economic_schedules: [
        { data: [{ ...scheduleRow, status: "paused" }], error: null },
        { data: { ...scheduleRow, status: "paused" }, error: null, count: 1 },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const service = await import("@/services/economia.service");
    const schedules = await service.fetchEconomicSchedules(WORKSPACE_ID, { status: "paused" });
    const updated = await service.updateEconomicSchedule("schedule-1", WORKSPACE_ID, { status: "paused" });

    expect(schedules.data).toEqual([expect.objectContaining({ id: "schedule-1", status: "paused" })]);
    expect(updated.data).toMatchObject({ id: "schedule-1", status: "paused" });
    expect(calls[0]?.eqCalls).toEqual(expect.arrayContaining([["workspace_id", WORKSPACE_ID], ["status", "paused"]]));
    expect(calls[1]?.eqCalls).toEqual(expect.arrayContaining([["id", "schedule-1"], ["workspace_id", WORKSPACE_ID]]));
    expect(service).not.toHaveProperty("deleteEconomicSchedule");
  });

  it("materializa una sola entrada por período y reutiliza la existente en una segunda generación", async () => {
    const entryRow = {
      id: "entry-schedule-1",
      workspace_id: WORKSPACE_ID,
      entry_type: "player_charge",
      category_id: "category-1",
      player_id: "player-1",
      concept: "Cuota mensual",
      counterparty_name: null,
      amount_minor: 4500,
      currency_code: "EUR",
      issue_date: "2026-01-31",
      due_date: "2026-01-31",
      schedule_id: "schedule-1",
      period_key: "2026-01-31",
      lifecycle: "open",
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      created_at: "2026-01-31T10:00:00.000Z",
      updated_at: "2026-01-31T10:00:00.000Z",
    };
    const { from, calls } = createSupabaseMock({
      economic_schedules: { data: scheduleRow, error: null, count: 1 },
      economic_entries: [
        { data: null, error: null },
        { data: entryRow, error: null, count: 1 },
        { data: entryRow, error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { generateNextEconomicOccurrence } = await import("@/services/economia.service");
    const first = await generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID);
    const second = await generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID);

    expect(first.data).toMatchObject({ id: "entry-schedule-1", periodKey: "2026-01-31" });
    expect(second).toMatchObject({ data: first.data, error: null, reused: true });
    expect(calls.filter((call) => call.table === "economic_entries" && call.method === "insert")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "economic_entries" && call.method === "select").every((call) =>
      call.eqCalls.some((eqCall) => eqCall[0] === "workspace_id" && eqCall[1] === WORKSPACE_ID),
    )).toBe(true);
    expect(calls.filter((call) => call.table === "economic_schedules" && call.method === "update")).toHaveLength(2);
  });

  it("recupera la entrada ganadora cuando la restricción única detecta una generación concurrente", async () => {
    const entryRow = {
      id: "entry-schedule-1",
      workspace_id: WORKSPACE_ID,
      entry_type: "player_charge",
      category_id: "category-1",
      player_id: "player-1",
      concept: "Cuota mensual",
      counterparty_name: null,
      amount_minor: 4500,
      currency_code: "EUR",
      issue_date: "2026-01-31",
      due_date: "2026-01-31",
      schedule_id: "schedule-1",
      period_key: "2026-01-31",
      lifecycle: "open",
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      created_at: "2026-01-31T10:00:00.000Z",
      updated_at: "2026-01-31T10:00:00.000Z",
    };
    const { from, calls } = createSupabaseMock({
      economic_schedules: { data: scheduleRow, error: null, count: 1 },
      economic_entries: [
        { data: null, error: null },
        { data: null, error: { code: "23505", message: "duplicate key" } },
        { data: entryRow, error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { generateNextEconomicOccurrence } = await import("@/services/economia.service");
    const result = await generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID);

    expect(result).toMatchObject({ data: { id: "entry-schedule-1" }, error: null, reused: true });
    expect(calls.filter((call) => call.table === "economic_entries" && call.method === "insert")).toHaveLength(1);
    expect(calls.filter((call) => call.table === "economic_schedules" && call.method === "update")).toHaveLength(1);
  });

  it("no materializa recurrencias pausadas, canceladas o fuera de su fecha de fin", async () => {
    const { from, calls } = createSupabaseMock({
      economic_schedules: [
        { data: { ...scheduleRow, status: "paused" }, error: null },
        { data: { ...scheduleRow, status: "cancelled" }, error: null },
        { data: { ...scheduleRow, next_due_date: "2026-02-01", end_date: "2026-01-31" }, error: null },
      ],
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { generateNextEconomicOccurrence } = await import("@/services/economia.service");
    const results = await Promise.all([
      generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID),
      generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID),
      generateNextEconomicOccurrence("schedule-1", WORKSPACE_ID),
    ]);

    expect(results.every((result) => result.data === null && result.error instanceof Error)).toBe(true);
    expect(calls.some((call) => call.table === "economic_entries" && call.method === "insert")).toBe(false);
    expect(calls.filter((call) => call.table === "economic_schedules").every((call) =>
      call.eqCalls.some((eqCall) => eqCall[0] === "workspace_id" && eqCall[1] === WORKSPACE_ID),
    )).toBe(true);
  });
});
