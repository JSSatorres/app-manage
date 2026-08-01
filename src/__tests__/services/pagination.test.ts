import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contrato: los listados `fetch*ByWorkspace` (jugadores, equipos, entrenadores) aceptan
 * un 2º parámetro opcional `{ limit, offset }`. Cuando se pasa, la query llama
 * `.range(offset, offset + limit - 1)` con `select(..., { count: 'exact' })` y el
 * resultado incluye `count`. Sin paginación, el comportamiento es idéntico al actual
 * (no se llama a `.range()`). Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
 * Task 2.4.
 */

const WORKSPACE_ID = "ws-active-111";

type QueryResponse = { data: unknown; error: unknown; count?: number | null };

interface RecordedCall {
  table: string;
  selectArgs: [string, { count?: string } | undefined];
  eqCalls: [string, unknown][];
  rangeCalls: [number, number][];
}

/**
 * Query-builder espía: cada método encadenable devuelve el propio builder
 * (igual que el `PostgrestFilterBuilder` real) y el builder es "thenable"
 * para poder hacer `await supabase.from(x).select(y, opts).eq(...).range(...)`.
 */
function createSupabaseMock(responsesByTable: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = [];

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, selectArgs: ["", undefined], eqCalls: [], rangeCalls: [] };
    calls.push(record);

    const builder: Record<string, unknown> = {
      select: vi.fn((cols: string, opts?: { count?: string }) => {
        record.selectArgs = [cols, opts];
        return builder;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        record.eqCalls.push([col, val]);
        return builder;
      }),
      order: vi.fn(() => builder),
      range: vi.fn((from: number, to: number) => {
        record.rangeCalls.push([from, to]);
        return builder;
      }),
      then: (
        resolve: (v: QueryResponse) => unknown,
        reject?: (e: unknown) => unknown,
      ) =>
        Promise.resolve(responsesByTable[table] ?? { data: [], error: null, count: null }).then(
          resolve,
          reject,
        ),
    };
    return builder;
  }

  const from = vi.fn((table: string) => makeBuilder(table));
  return { from, calls };
}

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("jugadores.service — fetchJugadoresByWorkspace paginación", () => {
  it("sin paginación no llama a .range()", async () => {
    const { from, calls } = createSupabaseMock({ jugadores: { data: [], error: null, count: null } });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchJugadoresByWorkspace } = await import("@/services/jugadores.service");
    await fetchJugadoresByWorkspace(WORKSPACE_ID);

    const call = calls.find((c) => c.table === "jugadores");
    expect(call?.rangeCalls).toEqual([]);
  });

  it("con { limit, offset } llama a .range(offset, offset+limit-1) y devuelve { data, count }", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: { data: [{ id: "j1", nombre: "Ana" }], error: null, count: 42 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchJugadoresByWorkspace } = await import("@/services/jugadores.service");
    const result = await fetchJugadoresByWorkspace(WORKSPACE_ID, { limit: 10, offset: 20 });

    const call = calls.find((c) => c.table === "jugadores");
    expect(call?.rangeCalls).toEqual([[20, 29]]);
    expect(call?.selectArgs[1]).toEqual({ count: "exact" });
    expect(result.count).toBe(42);
    expect(result.data).toHaveLength(1);
  });
});

describe("equipos.service — fetchEquiposByWorkspace paginación", () => {
  it("sin paginación no llama a .range()", async () => {
    const { from, calls } = createSupabaseMock({ equipos: { data: [], error: null, count: null } });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEquiposByWorkspace } = await import("@/services/equipos.service");
    await fetchEquiposByWorkspace(WORKSPACE_ID);

    const call = calls.find((c) => c.table === "equipos");
    expect(call?.rangeCalls).toEqual([]);
  });

  it("con { limit, offset } llama a .range(offset, offset+limit-1) y devuelve { data, count }", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: { data: [{ id: "e1", nombre: "Equipo A" }], error: null, count: 17 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEquiposByWorkspace } = await import("@/services/equipos.service");
    const result = await fetchEquiposByWorkspace(WORKSPACE_ID, { limit: 5, offset: 10 });

    const call = calls.find((c) => c.table === "equipos");
    expect(call?.rangeCalls).toEqual([[10, 14]]);
    expect(result.count).toBe(17);
    expect(result.data).toHaveLength(1);
  });
});

describe("entrenadores.service — fetchEntrenadoresByWorkspace paginación", () => {
  it("sin paginación no llama a .range()", async () => {
    const { from, calls } = createSupabaseMock({ entrenadores: { data: [], error: null, count: null } });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEntrenadoresByWorkspace } = await import("@/services/entrenadores.service");
    await fetchEntrenadoresByWorkspace(WORKSPACE_ID);

    const call = calls.find((c) => c.table === "entrenadores");
    expect(call?.rangeCalls).toEqual([]);
  });

  it("con { limit, offset } llama a .range(offset, offset+limit-1) y devuelve { data, count }", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: { data: [{ id: "t1", nombre: "Carlos" }], error: null, count: 8 },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEntrenadoresByWorkspace } = await import("@/services/entrenadores.service");
    const result = await fetchEntrenadoresByWorkspace(WORKSPACE_ID, { limit: 20, offset: 0 });

    const call = calls.find((c) => c.table === "entrenadores");
    expect(call?.rangeCalls).toEqual([[0, 19]]);
    expect(result.count).toBe(8);
    expect(result.data).toHaveLength(1);
  });
});
