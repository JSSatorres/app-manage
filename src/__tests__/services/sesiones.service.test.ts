import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SesionCreateInput, SesionUpdateInput } from "@/types/sesiones";

/**
 * Contrato: cobertura de create/update/delete de `sesiones.service.ts` y de la
 * sincronización de la tabla pivote `sesion_entrenadores`. Complementa (sin
 * duplicar) `tenant-scope.test.ts`, `get-by-id.test.ts` y `pagination.test.ts`.
 * Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md Task 4.1.
 */

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  method: "select" | "insert" | "update" | "delete" | null;
  payload?: unknown;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown][];
}

/**
 * Query-builder espía: cada método encadenable devuelve el propio builder
 * (igual que el `PostgrestFilterBuilder` real) y el builder es "thenable".
 * Soporta respuestas secuenciales por tabla (array) cuando la misma tabla se
 * consulta varias veces dentro de una misma función de servicio.
 */
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

const CREATED_ROW = {
  id: "sesion-1",
  fecha: "2026-07-20",
  hora_inicio: "10:00",
  duracion_estimada: 90,
  equipo_id: "equipo-1",
  entrenador_id: "ent-1",
  microciclo: 3,
  periodo_temporada: "Pretemporada",
  objetivo_sesion: "Trabajo táctico",
  observaciones_previas: null,
  feedback_post_entreno: null,
  estado: "Planificada",
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const BASE_INPUT: SesionCreateInput = {
  fecha: "2026-07-20",
  horaInicio: "10:00",
  duracionEstimada: 90,
  equipoId: "equipo-1",
  entrenadorIds: ["ent-1", "ent-2"],
  microciclo: 3,
  periodoTemporada: "Pretemporada",
  objetivoSesion: "Trabajo táctico",
  observacionesPrevias: null,
  estado: "Planificada",
};

describe("sesiones.service — createSesion", () => {
  it("inserta la sesión con los campos mapeados a snake_case y entrenador_id = primer id del array", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: CREATED_ROW, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSesion } = await import("@/services/sesiones.service");
    await createSesion(BASE_INPUT);

    const insertCall = callsFor(calls, "sesiones", "insert")[0];
    expect(insertCall?.payload).toMatchObject({
      fecha: "2026-07-20",
      hora_inicio: "10:00",
      duracion_estimada: 90,
      equipo_id: "equipo-1",
      entrenador_id: "ent-1",
      microciclo: 3,
      periodo_temporada: "Pretemporada",
      objetivo_sesion: "Trabajo táctico",
      observaciones_previas: null,
      estado: "Planificada",
    });
  });

  it("sincroniza sesion_entrenadores: borra la pivote existente e inserta una fila por entrenador", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: CREATED_ROW, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSesion } = await import("@/services/sesiones.service");
    await createSesion(BASE_INPUT);

    const delCall = callsFor(calls, "sesion_entrenadores", "delete")[0];
    expect(delCall?.eqCalls).toEqual([["sesion_id", "sesion-1"]]);

    const insCall = callsFor(calls, "sesion_entrenadores", "insert")[0];
    expect(insCall?.payload).toEqual([
      { sesion_id: "sesion-1", entrenador_id: "ent-1" },
      { sesion_id: "sesion-1", entrenador_id: "ent-2" },
    ]);
  });

  it("con entrenadorIds vacío, entrenador_id es null y no inserta filas en la pivote", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: { ...CREATED_ROW, entrenador_id: null }, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSesion } = await import("@/services/sesiones.service");
    await createSesion({ ...BASE_INPUT, entrenadorIds: [] });

    const insertCall = callsFor(calls, "sesiones", "insert")[0];
    expect(insertCall?.payload).toMatchObject({ entrenador_id: null });
    expect(callsFor(calls, "sesion_entrenadores", "insert")).toHaveLength(0);
    expect(callsFor(calls, "sesion_entrenadores", "delete")).toHaveLength(1);
  });

  it("devuelve { data: null, error } sin sincronizar la pivote cuando el insert falla", async () => {
    const dbError = new Error("insert failed");
    const { from, calls } = createSupabaseMock({
      sesiones: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSesion } = await import("@/services/sesiones.service");
    const result = await createSesion(BASE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "sesion_entrenadores")).toBe(false);
  });

  it("devuelve error de cliente ausente cuando Supabase no está configurado", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);

    const { createSesion } = await import("@/services/sesiones.service");
    const result = await createSesion(BASE_INPUT);

    expect(result.data).toBeNull();
    expect((result.error as Error).message).toMatch(/Missing/);
  });
});

describe("sesiones.service — updateSesion", () => {
  const UPDATE_INPUT: SesionUpdateInput = {
    ...BASE_INPUT,
    feedbackPostEntreno: "Buena intensidad",
  };

  it("actualiza los campos incluido feedback_post_entreno filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: { ...CREATED_ROW, feedback_post_entreno: "Buena intensidad" }, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateSesion } = await import("@/services/sesiones.service");
    await updateSesion("sesion-1", UPDATE_INPUT);

    const updateCall = callsFor(calls, "sesiones", "update")[0];
    expect(updateCall?.payload).toMatchObject({ feedback_post_entreno: "Buena intensidad" });
    expect(updateCall?.eqCalls).toEqual([["id", "sesion-1"]]);
  });

  it("sincroniza la pivote de entrenadores tras actualizar", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: CREATED_ROW, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateSesion } = await import("@/services/sesiones.service");
    await updateSesion("sesion-1", UPDATE_INPUT);

    expect(callsFor(calls, "sesion_entrenadores", "delete")).toHaveLength(1);
    const insCall = callsFor(calls, "sesion_entrenadores", "insert")[0];
    expect(insCall?.payload).toEqual([
      { sesion_id: "sesion-1", entrenador_id: "ent-1" },
      { sesion_id: "sesion-1", entrenador_id: "ent-2" },
    ]);
  });

  it("no sincroniza la pivote cuando el update falla", async () => {
    const dbError = new Error("update failed");
    const { from, calls } = createSupabaseMock({
      sesiones: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateSesion } = await import("@/services/sesiones.service");
    const result = await updateSesion("sesion-1", UPDATE_INPUT);

    expect(result.data).toBeNull();
    expect(result.error).toBe(dbError);
    expect(calls.some((c) => c.table === "sesion_entrenadores")).toBe(false);
  });
});

describe("sesiones.service — deleteSesion", () => {
  it("elimina la sesión filtrando por id", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteSesion } = await import("@/services/sesiones.service");
    const result = await deleteSesion("sesion-1");

    const delCall = callsFor(calls, "sesiones", "delete")[0];
    expect(delCall?.eqCalls).toEqual([["id", "sesion-1"]]);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("propaga el error de Supabase cuando el delete falla", async () => {
    const dbError = new Error("delete failed");
    const { from } = createSupabaseMock({
      sesiones: { data: null, error: dbError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteSesion } = await import("@/services/sesiones.service");
    const result = await deleteSesion("sesion-1");

    expect(result.error).toBe(dbError);
  });
});

describe("sesiones.service — createSesionesBulk", () => {
  it("crea varias sesiones y sincroniza la pivote de cada una respetando el orden de los inputs", async () => {
    const rowsCreated = [
      { ...CREATED_ROW, id: "sesion-1", entrenador_id: "ent-1" },
      { ...CREATED_ROW, id: "sesion-2", entrenador_id: "ent-3" },
    ];
    const { from, calls } = createSupabaseMock({
      sesiones: { data: rowsCreated, error: null },
      sesion_entrenadores: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { createSesionesBulk } = await import("@/services/sesiones.service");
    const inputs: SesionCreateInput[] = [
      BASE_INPUT,
      { ...BASE_INPUT, entrenadorIds: ["ent-3"] },
    ];
    const result = await createSesionesBulk(inputs);

    expect(result.data).toHaveLength(2);
    const insertCalls = callsFor(calls, "sesion_entrenadores", "insert");
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0]?.payload).toEqual([
      { sesion_id: "sesion-1", entrenador_id: "ent-1" },
      { sesion_id: "sesion-1", entrenador_id: "ent-2" },
    ]);
    expect(insertCalls[1]?.payload).toEqual([{ sesion_id: "sesion-2", entrenador_id: "ent-3" }]);
  });
});
