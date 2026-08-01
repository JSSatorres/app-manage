import { describe, it, expect, vi, beforeEach } from "vitest";
import type { JugadorCreateInput, JugadorUpdateInput } from "@/types/jugadores";

/**
 * Contrato: cobertura de create/update/delete de `jugadores.service.ts` y de la
 * sincronización de las pivotes `jugador_sedes` / `jugador_equipos`, más la
 * validación de negocio `workspaceId requerido` en `createJugador`.
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
  id: "jugador-1",
  nombre: "Ana",
  apellidos: "García",
  email: "ana@example.com",
  telefono: null,
  fecha_nacimiento: "2010-05-01",
  dorsal: 7,
  posicion: "Delantero",
  pie_dominante: "Diestro",
  foto_url: null,
  notas: null,
  tutor_nombre: "Luis García",
  tutor_telefono: "600000000",
  user_id: null,
  workspace_id: WORKSPACE_ID,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  jugador_sedes: [{ sede_id: "sede-1" }],
  jugador_equipos: [{ equipo_id: "equipo-1" }],
};

const CREATE_INPUT: JugadorCreateInput = {
  nombre: "Ana",
  apellidos: "García",
  email: "ana@example.com",
  telefono: null,
  fechaNacimiento: "2010-05-01",
  dorsal: 7,
  posicion: "Delantero",
  pieDominante: "Diestro",
  notas: null,
  tutorNombre: "Luis García",
  tutorTelefono: "600000000",
  workspaceId: WORKSPACE_ID,
  sedeIds: ["sede-1"],
  equipoIds: ["equipo-1"],
};

describe("jugadores.service — createJugador", () => {
  it("exige workspaceId: si falta, devuelve error sin consultar Supabase", async () => {
    const { from, calls } = createSupabaseMock({});
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createJugador } = await import("@/services/jugadores.service");
    const result = await createJugador({ ...CREATE_INPUT, workspaceId: "" });

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("inserta los campos mapeados a snake_case incluido workspace_id", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: [{ data: { id: "jugador-1" }, error: null }, { data: FULL_ROW, error: null }],
      jugador_sedes: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createJugador } = await import("@/services/jugadores.service");
    const result = await createJugador(CREATE_INPUT);

    const insertCall = callsFor(calls, "jugadores", "insert")[0];
    expect(insertCall?.payload).toMatchObject({
      nombre: "Ana",
      apellidos: "García",
      fecha_nacimiento: "2010-05-01",
      dorsal: 7,
      pie_dominante: "Diestro",
      tutor_nombre: "Luis García",
      tutor_telefono: "600000000",
      workspace_id: WORKSPACE_ID,
    });
    expect(result.data).toMatchObject({ id: "jugador-1", nombre: "Ana" });
  });

  it("sincroniza jugador_sedes y jugador_equipos (borra e inserta) tras crear", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: [{ data: { id: "jugador-1" }, error: null }, { data: FULL_ROW, error: null }],
      jugador_sedes: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createJugador } = await import("@/services/jugadores.service");
    await createJugador(CREATE_INPUT);

    expect(callsFor(calls, "jugador_sedes", "delete")[0]?.eqCalls).toEqual([["jugador_id", "jugador-1"]]);
    expect(callsFor(calls, "jugador_sedes", "insert")[0]?.payload).toEqual([
      { jugador_id: "jugador-1", sede_id: "sede-1" },
    ]);
    expect(callsFor(calls, "jugador_equipos", "insert")[0]?.payload).toEqual([
      { jugador_id: "jugador-1", equipo_id: "equipo-1" },
    ]);
  });

  it("devuelve { data: null, error } sin sincronizar pivotes cuando el insert falla", async () => {
    const dbError = new Error("insert failed");
    const { from, calls } = createSupabaseMock({
      jugadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createJugador } = await import("@/services/jugadores.service");
    const result = await createJugador(CREATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "jugador_sedes" || c.table === "jugador_equipos")).toBe(false);
  });

  it("devuelve el error de la pivote sin hacer el fetch final cuando syncPivots falla", async () => {
    const pivotError = new Error("pivot failed");
    const { from, calls } = createSupabaseMock({
      jugadores: [{ data: { id: "jugador-1" }, error: null }],
      jugador_sedes: { data: null, error: pivotError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createJugador } = await import("@/services/jugadores.service");
    const result = await createJugador(CREATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(pivotError);
    // Solo la llamada de insert a "jugadores"; no hay un segundo select de "full".
    expect(callsFor(calls, "jugadores")).toHaveLength(1);
  });
});

describe("jugadores.service — updateJugador", () => {
  const UPDATE_INPUT: JugadorUpdateInput = { ...CREATE_INPUT };

  it("actualiza los campos del jugador (sin sedeIds/equipoIds) filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      jugador_sedes: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateJugador } = await import("@/services/jugadores.service");
    await updateJugador("jugador-1", UPDATE_INPUT);

    const updateCall = callsFor(calls, "jugadores", "update")[0];
    expect(updateCall?.payload).toMatchObject({ nombre: "Ana", dorsal: 7 });
    expect(updateCall?.payload).not.toHaveProperty("sedeIds");
    expect(updateCall?.eqCalls).toEqual([["id", "jugador-1"]]);
  });

  it("sincroniza las pivotes tras actualizar", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: [{ data: null, error: null }, { data: FULL_ROW, error: null }],
      jugador_sedes: { data: null, error: null },
      jugador_equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateJugador } = await import("@/services/jugadores.service");
    await updateJugador("jugador-1", UPDATE_INPUT);

    expect(callsFor(calls, "jugador_sedes", "insert")).toHaveLength(1);
    expect(callsFor(calls, "jugador_equipos", "insert")).toHaveLength(1);
  });

  it("no sincroniza pivotes cuando el update falla", async () => {
    const dbError = new Error("update failed");
    const { from, calls } = createSupabaseMock({
      jugadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateJugador } = await import("@/services/jugadores.service");
    const result = await updateJugador("jugador-1", UPDATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "jugador_sedes" || c.table === "jugador_equipos")).toBe(false);
  });
});

describe("jugadores.service — deleteJugador", () => {
  it("elimina el jugador filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteJugador } = await import("@/services/jugadores.service");
    const result = await deleteJugador("jugador-1");

    expect(callsFor(calls, "jugadores", "delete")[0]?.eqCalls).toEqual([["id", "jugador-1"]]);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("devuelve data: false cuando el delete falla", async () => {
    const dbError = new Error("delete failed");
    const { from } = createSupabaseMock({
      jugadores: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteJugador } = await import("@/services/jugadores.service");
    const result = await deleteJugador("jugador-1");

    expect(result.data).toBe(false);
    expect(result.error).toBe(dbError);
  });
});
