import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SedeCreateInput, SedeUpdateInput } from "@/types/sedes";

/**
 * Contrato: cobertura de create/update/delete de `sedes.service.ts`.
 * Complementa (sin duplicar) `tenant-scope.test.ts` y `get-by-id.test.ts`.
 * Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md Task 4.1.
 */

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  method: "select" | "insert" | "update" | "delete" | null;
  payload?: unknown;
  eqCalls: [string, unknown][];
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = [];

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
      ) =>
        Promise.resolve(responsesByTable[table] ?? { data: null, error: null }).then(resolve, reject),
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

const WORKSPACE_ID = "ws-active-111";

const SEDE_ROW = {
  id: "sede-1",
  nombre: "Sede Norte",
  direccion: "Calle Falsa 123",
  configuracion_visual: {},
  responsable_id: null,
  workspace_id: WORKSPACE_ID,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

describe("sedes.service — createSede", () => {
  it("inserta nombre, direccion, configuracion_visual, responsable_id y workspace_id", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: SEDE_ROW, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const input: SedeCreateInput = {
      nombre: "Sede Norte",
      direccion: "Calle Falsa 123",
      workspaceId: WORKSPACE_ID,
    };
    const { createSede } = await import("@/services/sedes.service");
    const result = await createSede(input);

    const insertCall = callsFor(calls, "sedes", "insert")[0];
    expect(insertCall?.payload).toMatchObject({
      nombre: "Sede Norte",
      direccion: "Calle Falsa 123",
      configuracion_visual: {},
      responsable_id: null,
      workspace_id: WORKSPACE_ID,
    });
    expect(result.data).toMatchObject({ id: "sede-1", nombre: "Sede Norte", workspaceId: WORKSPACE_ID });
    expect(result.error).toBeNull();
  });

  it("devuelve { data: null, error } cuando el insert falla", async () => {
    const dbError = new Error("insert failed");
    const { from } = createSupabaseMock({
      sedes: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSede } = await import("@/services/sedes.service");
    const result = await createSede({ nombre: "X", direccion: null, workspaceId: WORKSPACE_ID });

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
  });

  it("devuelve error de cliente ausente cuando Supabase no está configurado", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);

    const { createSede } = await import("@/services/sedes.service");
    const result = await createSede({ nombre: "X", direccion: null, workspaceId: WORKSPACE_ID });

    expect(result.data).toBeNull();
    expect((result.error as Error).message).toMatch(/Missing/);
  });
});

describe("sedes.service — updateSede", () => {
  it("actualiza solo nombre y direccion filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: { ...SEDE_ROW, nombre: "Sede Sur" }, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const input: SedeUpdateInput = { nombre: "Sede Sur", direccion: "Calle Falsa 123" };
    const { updateSede } = await import("@/services/sedes.service");
    await updateSede("sede-1", input);

    const updateCall = callsFor(calls, "sedes", "update")[0];
    expect(updateCall?.payload).toEqual({ nombre: "Sede Sur", direccion: "Calle Falsa 123" });
    expect(updateCall?.eqCalls).toEqual([["id", "sede-1"]]);
  });

  it("devuelve { data: null, error } cuando el update falla", async () => {
    const dbError = new Error("update failed");
    const { from } = createSupabaseMock({
      sedes: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateSede } = await import("@/services/sedes.service");
    const result = await updateSede("sede-1", { nombre: "X", direccion: null });

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
  });
});

describe("sedes.service — deleteSede", () => {
  it("elimina la sede filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteSede } = await import("@/services/sedes.service");
    const result = await deleteSede("sede-1");

    expect(callsFor(calls, "sedes", "delete")[0]?.eqCalls).toEqual([["id", "sede-1"]]);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("propaga el error de Supabase cuando el delete falla", async () => {
    const dbError = new Error("delete failed");
    const { from } = createSupabaseMock({
      sedes: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteSede } = await import("@/services/sedes.service");
    const result = await deleteSede("sede-1");

    expect(result.error).toBe(dbError);
  });
});
