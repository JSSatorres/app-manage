import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EquipoCreateInput, EquipoUpdateInput } from "@/types/equipos";

/**
 * Contrato: cobertura de create/update/delete de `equipos.service.ts` y de la
 * sincronización de las pivotes `entrenador_equipos` / `jugador_equipos`.
 * Complementa (sin duplicar) `tenant-scope.test.ts`, `get-by-id.test.ts` y
 * `pagination.test.ts`. Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
 * Task 4.1.
 */

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  method: "select" | "insert" | "update" | "delete" | null;
  payload?: unknown;
  eqCalls: [string, unknown][];
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponse | QueryResponse[]>) {
  const calls: RecordedCall[] = [];
  const callIndexByTable: Record<string, number> = {};

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, method: null, eqCalls: [] };
    calls.push(record);

    const builder: Record<string, unknown> = {
      select: vi.fn(() => {
        if (!record.method) record.method = "select";
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
      delete: vi.fn(() => {
        record.method = "delete";
        return builder;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        record.eqCalls.push([col, val]);
        return builder;
      }),
      order: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: (
        resolve: (v: QueryResponse) => unknown,
        reject?: (e: unknown) => unknown,
      ) => {
        const configured = responsesByTable[table];
        let response: QueryResponse;
        if (Array.isArray(configured)) {
          const idx = callIndexByTable[table] ?? 0;
          response = configured[Math.min(idx, configured.length - 1)] ?? { data: null, error: null };
          callIndexByTable[table] = idx + 1;
        } else {
          response = configured ?? { data: null, error: null };
        }
        return Promise.resolve(response).then(resolve, reject);
      },
    };
    return builder;
  }

  const from = vi.fn((table: string) => makeBuilder(table));
  return { from, calls };
}

function callsFor(calls: RecordedCall[], table: string, method?: RecordedCall["method"]) {
  return calls.filter((c) => c.table === table && (method ? c.method === method : true));
}

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

const FULL_ROW = {
  id: "equipo-1",
  nombre: "Equipo A",
  categoria: "senior",
  sede_id: "sede-1",
  workspace_id: "ws-active-111",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  entrenador_equipos: [{ entrenador_id: "ent-1" }],
  jugador_equipos: [{ jugador_id: "jug-1" }],
};

const CREATE_INPUT: EquipoCreateInput = {
  nombre: "Equipo A",
  categoria: "senior",
  sedeId: "sede-1",
  workspaceId: "ws-active-111",
  entrenadorIds: ["ent-1"],
  jugadorIds: ["jug-1"],
};

describe("equipos.service — createEquipo", () => {
  it("inserta nombre/categoria/sede_id y devuelve el equipo completo tras crear", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: [{ data: { id: "equipo-1" }, error: null }, { data: FULL_ROW, error: null }],
      entrenador_equipos: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEquipo } = await import("@/services/equipos.service");
    const result = await createEquipo(CREATE_INPUT);

    const insertCall = callsFor(calls, "equipos", "insert")[0];
    expect(insertCall?.payload).toMatchObject({ nombre: "Equipo A", categoria: "senior", sede_id: "sede-1" });
    expect(result.data).toMatchObject({ id: "equipo-1", nombre: "Equipo A" });
  });

  it("sincroniza entrenador_equipos y jugador_equipos (borra e inserta) tras crear", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: [{ data: { id: "equipo-1" }, error: null }, { data: FULL_ROW, error: null }],
      entrenador_equipos: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEquipo } = await import("@/services/equipos.service");
    await createEquipo(CREATE_INPUT);

    expect(callsFor(calls, "entrenador_equipos", "delete")[0]?.eqCalls).toEqual([["equipo_id", "equipo-1"]]);
    expect(callsFor(calls, "entrenador_equipos", "insert")[0]?.payload).toEqual([
      { equipo_id: "equipo-1", entrenador_id: "ent-1" },
    ]);
    expect(callsFor(calls, "jugador_equipos", "delete")[0]?.eqCalls).toEqual([["equipo_id", "equipo-1"]]);
    expect(callsFor(calls, "jugador_equipos", "insert")[0]?.payload).toEqual([
      { equipo_id: "equipo-1", jugador_id: "jug-1" },
    ]);
  });

  it("con listas vacías no inserta filas en las pivotes (solo borra)", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: [{ data: { id: "equipo-1" }, error: null }, { data: FULL_ROW, error: null }],
      entrenador_equipos: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEquipo } = await import("@/services/equipos.service");
    await createEquipo({ ...CREATE_INPUT, entrenadorIds: [], jugadorIds: [] });

    expect(callsFor(calls, "entrenador_equipos", "insert")).toHaveLength(0);
    expect(callsFor(calls, "jugador_equipos", "insert")).toHaveLength(0);
  });

  it("devuelve { data: null, error } sin sincronizar pivotes cuando el insert falla", async () => {
    const dbError = new Error("insert failed");
    const { from, calls } = createSupabaseMock({
      equipos: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEquipo } = await import("@/services/equipos.service");
    const result = await createEquipo(CREATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "entrenador_equipos" || c.table === "jugador_equipos")).toBe(false);
  });
});

describe("equipos.service — updateEquipo", () => {
  const UPDATE_INPUT: EquipoUpdateInput = { ...CREATE_INPUT };

  it("actualiza nombre/categoria/sede_id filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      entrenador_equipos: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEquipo } = await import("@/services/equipos.service");
    await updateEquipo("equipo-1", UPDATE_INPUT);

    const updateCall = callsFor(calls, "equipos", "update")[0];
    expect(updateCall?.payload).toMatchObject({ nombre: "Equipo A", categoria: "senior", sede_id: "sede-1" });
    expect(updateCall?.eqCalls).toEqual([["id", "equipo-1"]]);
  });

  it("sincroniza las pivotes tras actualizar", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      entrenador_equipos: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEquipo } = await import("@/services/equipos.service");
    await updateEquipo("equipo-1", UPDATE_INPUT);

    expect(callsFor(calls, "entrenador_equipos", "insert")).toHaveLength(1);
    expect(callsFor(calls, "jugador_equipos", "insert")).toHaveLength(1);
  });

  it("no sincroniza pivotes cuando el update falla", async () => {
    const dbError = new Error("update failed");
    const { from, calls } = createSupabaseMock({
      equipos: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEquipo } = await import("@/services/equipos.service");
    const result = await updateEquipo("equipo-1", UPDATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "entrenador_equipos" || c.table === "jugador_equipos")).toBe(false);
  });
});

describe("equipos.service — updateEquipoSede", () => {
  it("actualiza únicamente sede_id filtrando por el id del equipo", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEquipoSede } = await import("@/services/equipos.service");
    const result = await updateEquipoSede("equipo-1", "sede-2");

    const updateCall = callsFor(calls, "equipos", "update")[0];
    expect(updateCall?.payload).toMatchObject({ sede_id: "sede-2" });
    expect(updateCall?.eqCalls).toEqual([["id", "equipo-1"]]);
    expect(result.error).toBeNull();
  });
});

describe("equipos.service — deleteEquipo", () => {
  it("elimina el equipo filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteEquipo } = await import("@/services/equipos.service");
    const result = await deleteEquipo("equipo-1");

    expect(callsFor(calls, "equipos", "delete")[0]?.eqCalls).toEqual([["id", "equipo-1"]]);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("devuelve data: false cuando el delete falla", async () => {
    const dbError = new Error("delete failed");
    const { from } = createSupabaseMock({
      equipos: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteEquipo } = await import("@/services/equipos.service");
    const result = await deleteEquipo("equipo-1");

    expect(result.data).toBe(false);
    expect(result.error).toBe(dbError);
  });
});
