import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EntrenadorCreateInput, EntrenadorUpdateInput } from "@/types/entrenadores";

/**
 * Contrato: cobertura de create/update/delete de `entrenadores.service.ts` y de
 * la sincronización de las pivotes `entrenador_sedes` / `entrenador_equipos`,
 * más la validación de negocio `workspaceId requerido` en `createEntrenador`.
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
  inCalls: [string, unknown][];
}

function createSupabaseMock(responsesByTable: Record<string, QueryResponse | QueryResponse[]>) {
  const calls: RecordedCall[] = [];
  const callIndexByTable: Record<string, number> = {};

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, method: null, eqCalls: [], inCalls: [] };
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
      in: vi.fn((col: string, val: unknown) => {
        record.inCalls.push([col, val]);
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

const WORKSPACE_ID = "ws-active-111";

const FULL_ROW = {
  id: "entrenador-1",
  nombre: "Carlos",
  apellidos: "Pérez",
  email: "carlos@example.com",
  telefono: "600111222",
  fecha_nacimiento: "1985-03-10",
  titulacion: "UEFA B",
  foto_url: null,
  notas: null,
  user_id: null,
  workspace_id: WORKSPACE_ID,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  entrenador_sedes: [{ sede_id: "sede-1" }],
  entrenador_equipos: [{ equipo_id: "equipo-1" }],
};

const CREATE_INPUT: EntrenadorCreateInput = {
  nombre: "Carlos",
  apellidos: "Pérez",
  email: "carlos@example.com",
  telefono: "600111222",
  fechaNacimiento: "1985-03-10",
  titulacion: "UEFA B",
  notas: null,
  workspaceId: WORKSPACE_ID,
  sedeIds: ["sede-1"],
  equipoIds: ["equipo-1"],
};

describe("entrenadores.service — createEntrenador", () => {
  it("exige workspaceId: si falta, devuelve error sin consultar Supabase", async () => {
    const { from, calls } = createSupabaseMock({});
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEntrenador } = await import("@/services/entrenadores.service");
    const result = await createEntrenador({ ...CREATE_INPUT, workspaceId: "" });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("inserta los campos mapeados a snake_case incluido workspace_id", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: [{ data: { id: "entrenador-1" }, error: null }, { data: FULL_ROW, error: null }],
      entrenador_sedes: { data: null, error: null },
      entrenador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEntrenador } = await import("@/services/entrenadores.service");
    const result = await createEntrenador(CREATE_INPUT);

    const insertCall = callsFor(calls, "entrenadores", "insert")[0];
    expect(insertCall?.payload).toMatchObject({
      nombre: "Carlos",
      apellidos: "Pérez",
      titulacion: "UEFA B",
      fecha_nacimiento: "1985-03-10",
      workspace_id: WORKSPACE_ID,
    });
    expect(result.data).toMatchObject({ id: "entrenador-1", nombre: "Carlos" });
  });

  it("sincroniza entrenador_sedes y entrenador_equipos (borra e inserta) tras crear", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: [{ data: { id: "entrenador-1" }, error: null }, { data: FULL_ROW, error: null }],
      entrenador_sedes: { data: null, error: null },
      entrenador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEntrenador } = await import("@/services/entrenadores.service");
    await createEntrenador(CREATE_INPUT);

    expect(callsFor(calls, "entrenador_sedes", "delete")[0]?.eqCalls).toEqual([
      ["entrenador_id", "entrenador-1"],
    ]);
    expect(callsFor(calls, "entrenador_sedes", "insert")[0]?.payload).toEqual([
      { entrenador_id: "entrenador-1", sede_id: "sede-1" },
    ]);
    expect(callsFor(calls, "entrenador_equipos", "insert")[0]?.payload).toEqual([
      { entrenador_id: "entrenador-1", equipo_id: "equipo-1" },
    ]);
  });

  it("devuelve { data: null, error } sin sincronizar pivotes cuando el insert falla", async () => {
    const dbError = new Error("insert failed");
    const { from, calls } = createSupabaseMock({
      entrenadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEntrenador } = await import("@/services/entrenadores.service");
    const result = await createEntrenador(CREATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(
      calls.some((c) => c.table === "entrenador_sedes" || c.table === "entrenador_equipos"),
    ).toBe(false);
  });

  it("devuelve el error de la pivote sin hacer el fetch final cuando syncPivots falla", async () => {
    const pivotError = new Error("pivot failed");
    const { from, calls } = createSupabaseMock({
      entrenadores: [{ data: { id: "entrenador-1" }, error: null }],
      entrenador_sedes: { data: null, error: pivotError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createEntrenador } = await import("@/services/entrenadores.service");
    const result = await createEntrenador(CREATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(pivotError);
    expect(callsFor(calls, "entrenadores")).toHaveLength(1);
  });
});

describe("entrenadores.service — updateEntrenador", () => {
  const UPDATE_INPUT: EntrenadorUpdateInput = { ...CREATE_INPUT };

  it("actualiza los campos del entrenador (sin sedeIds/equipoIds) filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      entrenador_sedes: { data: null, error: null },
      entrenador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEntrenador } = await import("@/services/entrenadores.service");
    await updateEntrenador("entrenador-1", UPDATE_INPUT);

    const updateCall = callsFor(calls, "entrenadores", "update")[0];
    expect(updateCall?.payload).toMatchObject({ nombre: "Carlos", titulacion: "UEFA B" });
    expect(updateCall?.payload).not.toHaveProperty("sedeIds");
    expect(updateCall?.eqCalls).toEqual([["id", "entrenador-1"]]);
  });

  it("sincroniza las pivotes tras actualizar", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      entrenador_sedes: { data: null, error: null },
      entrenador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEntrenador } = await import("@/services/entrenadores.service");
    await updateEntrenador("entrenador-1", UPDATE_INPUT);

    expect(callsFor(calls, "entrenador_sedes", "insert")).toHaveLength(1);
    expect(callsFor(calls, "entrenador_equipos", "insert")).toHaveLength(1);
  });

  it("no sincroniza pivotes cuando el update falla", async () => {
    const dbError = new Error("update failed");
    const { from, calls } = createSupabaseMock({
      entrenadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateEntrenador } = await import("@/services/entrenadores.service");
    const result = await updateEntrenador("entrenador-1", UPDATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(
      calls.some((c) => c.table === "entrenador_sedes" || c.table === "entrenador_equipos"),
    ).toBe(false);
  });
});

describe("entrenadores.service — deleteEntrenador", () => {
  it("elimina el entrenador filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteEntrenador } = await import("@/services/entrenadores.service");
    const result = await deleteEntrenador("entrenador-1");

    expect(callsFor(calls, "entrenadores", "delete")[0]?.eqCalls).toEqual([["id", "entrenador-1"]]);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("devuelve data: false cuando el delete falla", async () => {
    const dbError = new Error("delete failed");
    const { from } = createSupabaseMock({
      entrenadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteEntrenador } = await import("@/services/entrenadores.service");
    const result = await deleteEntrenador("entrenador-1");

    expect(result.data).toBe(false);
    expect(result.error).toBe(dbError);
  });
});
