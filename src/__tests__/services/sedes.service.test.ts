import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CloneSedeInput, SedeCreateInput, SedeUpdateInput } from "@/types/sedes";

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
  inCalls: [string, unknown[]][];
}

type CloneSedeService = (input: unknown) => Promise<{
  data: unknown;
  error: unknown;
}>;

function createSupabaseMock(responsesByTable: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = [];

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
      in: vi.fn((col: string, val: unknown[]) => {
        record.inCalls.push([col, val]);
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
  const rpc = vi.fn();
  return { from, rpc, calls };
}

function callsFor(calls: RecordedCall[], table: string, method?: RecordedCall["method"]) {
  return calls.filter((c) => c.table === table && (method ? c.method === method : true));
}

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/hooks/useMutation", () => ({
  useMutation: hookMocks.useMutation,
}));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: hookMocks.useQuery,
}));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
  hookMocks.useQuery.mockReturnValue({
    data: [],
    count: null,
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  });
  hookMocks.useMutation.mockImplementation((mutationFn) => ({
    mutate: vi.fn(async (input) => {
      const result = await mutationFn(input);
      return result.error ? null : result.data;
    }),
    loading: false,
    errorMessage: null,
    reset: vi.fn(),
  }));
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

const CLONE_INPUT = {
  workspaceId: WORKSPACE_ID,
  sourceSedeId: "sede-origen-1",
  nombre: "Sede Norte clonada",
  direccion: "Avenida del Deporte 10",
  seleccion: {
    equipos: ["equipo-origen-1"],
    entrenadores: ["entrenador-1"],
    jugadores: ["jugador-1"],
    sesiones: ["sesion-origen-1"],
    parametros: ["parametro-origen-1"],
    documentos: ["documento-origen-1"],
  },
} satisfies CloneSedeInput;

const CLONE_RESPONSE = {
  sede: {
    id: "sede-destino-1",
    nombre: "Sede Norte clonada",
    direccion: "Avenida del Deporte 10",
    responsable_id: null,
    configuracion_visual: {},
    workspace_id: WORKSPACE_ID,
  },
  mappings: {
    equipos: { "equipo-origen-1": "equipo-destino-1" },
    sesiones: { "sesion-origen-1": "sesion-destino-1" },
  },
  resumen: {
    equipos: 1,
    entrenadores: 1,
    jugadores: 1,
    sesiones: 1,
    parametros: 1,
    documentos: 1,
    ejercicios: 0,
  },
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

describe("sedes.service — cloneSede", () => {
  it("conserva el receptor del cliente al delegar la RPC en su transporte", async () => {
    const { from } = createSupabaseMock({});
    const transportRpc = vi.fn().mockResolvedValue({ data: CLONE_RESPONSE, error: null });
    const client = {
      from,
      rest: { rpc: transportRpc },
      rpc(functionName: string, args: Record<string, unknown>) {
        return this.rest.rpc(functionName, args);
      },
    };
    vi.mocked(getSupabaseClient).mockReturnValue(client as never);

    const { cloneSede } = await import("@/services/sedes.service");
    const result = await cloneSede(CLONE_INPUT);

    expect(transportRpc).toHaveBeenCalledWith("clone_sede", {
      p_workspace_id: WORKSPACE_ID,
      p_source_sede_id: "sede-origen-1",
      p_nombre: "Sede Norte clonada",
      p_direccion: "Avenida del Deporte 10",
      p_seleccion: CLONE_INPUT.seleccion,
    });
    expect(result).toEqual({ data: CLONE_RESPONSE, error: null });
  });

  it("invoca la RPC atómica con la selección completa y expone su contrato", async () => {
    const { from, rpc } = createSupabaseMock({});
    rpc.mockResolvedValue({ data: CLONE_RESPONSE, error: null });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const sedesService = (await import("@/services/sedes.service")) as {
      cloneSede?: CloneSedeService;
    };

    expect(sedesService.cloneSede).toBeTypeOf("function");

    const result = await sedesService.cloneSede!(CLONE_INPUT);

    expect(rpc).toHaveBeenCalledWith("clone_sede", {
      p_workspace_id: WORKSPACE_ID,
      p_source_sede_id: "sede-origen-1",
      p_nombre: "Sede Norte clonada",
      p_direccion: "Avenida del Deporte 10",
      p_seleccion: CLONE_INPUT.seleccion,
    });
    expect(result).toEqual({ data: CLONE_RESPONSE, error: null });
    expect(result.data).toMatchObject({
      sede: {
        responsable_id: null,
        configuracion_visual: {},
        workspace_id: WORKSPACE_ID,
      },
      mappings: {
        equipos: { "equipo-origen-1": "equipo-destino-1" },
        sesiones: { "sesion-origen-1": "sesion-destino-1" },
      },
      resumen: {
        equipos: 1,
        entrenadores: 1,
        jugadores: 1,
        sesiones: 1,
        parametros: 1,
        documentos: 1,
        ejercicios: 0,
      },
    });
  });

  it("propaga el error de la RPC", async () => {
    const rpcError = new Error("clone failed");
    const { from, rpc } = createSupabaseMock({});
    rpc.mockResolvedValue({ data: null, error: rpcError });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const { cloneSede } = await import("@/services/sedes.service");
    const result = await cloneSede(CLONE_INPUT);

    expect(result).toEqual({ data: null, error: rpcError });
  });
});

describe("sedes.service — fetchCloneableSedeContent", () => {
  it("lee solo el contenido real de la sede origen dentro del workspace", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: SEDE_ROW, error: null },
      equipos: { data: [{ id: "equipo-origen-1", nombre: "Infantil", categoria: "U14" }], error: null },
      entrenador_sedes: { data: [{ entrenador_id: "entrenador-1" }], error: null },
      jugadores: { data: [{ id: "jugador-1", nombre: "Ana", apellidos: "Pérez" }], error: null },
      entrenadores: { data: [{ id: "entrenador-1", nombre: "Luis", apellidos: "Sanz" }], error: null },
      sesiones: { data: [{ id: "sesion-origen-1", equipo_id: "equipo-origen-1", fecha: "2026-08-08" }], error: null },
      sesion_entrenadores: { data: [{ sesion_id: "sesion-origen-1", entrenador_id: "entrenador-1" }], error: null },
      jugador_sedes: { data: [{ jugador_id: "jugador-1" }], error: null },
      parametros_sistema: { data: [{ id: "parametro-origen-1", nombre: "Ataque", categoria: "modelo" }], error: null },
      documento_sedes: { data: [{ documento_id: "documento-origen-1" }], error: null },
      documentos: { data: [{ id: "documento-origen-1", titulo: "Normativa" }], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const sedesService = (await import("@/services/sedes.service")) as {
      fetchCloneableSedeContent?: (workspaceId: string, sourceSedeId: string) => Promise<{
        data: unknown;
        error: unknown;
      }>;
    };

    expect(sedesService.fetchCloneableSedeContent).toBeTypeOf("function");

    const result = await sedesService.fetchCloneableSedeContent!(WORKSPACE_ID, "sede-1");

    expect(callsFor(calls, "sedes", "select")[0]?.eqCalls).toEqual([
      ["id", "sede-1"],
      ["workspace_id", WORKSPACE_ID],
    ]);
    expect(callsFor(calls, "equipos", "select")[0]?.eqCalls).toEqual([
      ["sede_id", "sede-1"],
      ["workspace_id", WORKSPACE_ID],
    ]);
    expect(callsFor(calls, "sesiones", "select")[0]?.inCalls).toEqual([
      ["equipo_id", ["equipo-origen-1"]],
    ]);
    expect(callsFor(calls, "sesion_entrenadores", "select")[0]?.inCalls).toEqual([
      ["sesion_id", ["sesion-origen-1"]],
    ]);
    expect(result).toEqual({
      data: {
        equipos: [{ id: "equipo-origen-1", label: "Infantil", categoria: "U14" }],
        entrenadores: [{ id: "entrenador-1", label: "Luis Sanz" }],
        jugadores: [{ id: "jugador-1", label: "Ana Pérez" }],
        sesiones: [{
          id: "sesion-origen-1",
          label: "2026-08-08",
          equipoId: "equipo-origen-1",
          trainerIds: ["entrenador-1"],
        }],
        entrenadorEquipos: [],
        jugadorEquipos: [],
        parametros: [{ id: "parametro-origen-1", label: "Ataque", categoria: "modelo" }],
        documentos: [{ id: "documento-origen-1", label: "Normativa" }],
      },
      error: null,
    });
  });

  it("detiene la lectura si la sede origen no pertenece al workspace", async () => {
    const sourceError = new Error("source not found");
    const { from, calls } = createSupabaseMock({
      sedes: { data: null, error: sourceError },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchCloneableSedeContent } = await import("@/services/sedes.service");
    const result = await fetchCloneableSedeContent(WORKSPACE_ID, "sede-ajena");

    expect(result).toEqual({ data: null, error: sourceError });
    expect(calls).toHaveLength(1);
  });
});

describe("useSedes — clonación", () => {
  it.each([
    { workspaceId: null, isCloneMode: true, sourceSedeId: "sede-origen-1" },
    { workspaceId: WORKSPACE_ID, isCloneMode: false, sourceSedeId: "sede-origen-1" },
    { workspaceId: WORKSPACE_ID, isCloneMode: true, sourceSedeId: null },
  ])("no solicita contenido sin modo, workspace y sede origen válidos", async (options) => {
    const { from, calls } = createSupabaseMock({});
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { useSedes } = await import("@/hooks/useSedes");
    renderHook(() => useSedes(options.workspaceId, options));

    const cloneContentQuery = hookMocks.useQuery.mock.calls[1]?.[0];
    if (typeof cloneContentQuery !== "function") {
      throw new Error("La query de contenido clonable no se ha registrado");
    }

    await cloneContentQuery();

    expect(calls).toHaveLength(0);
  });

  it("carga el contenido del origen y clona devolviendo su resumen e invalidaciones relacionadas", async () => {
    const { from, rpc, calls } = createSupabaseMock({
      sedes: { data: SEDE_ROW, error: null },
      equipos: { data: [], error: null },
      entrenador_sedes: { data: [], error: null },
      jugador_sedes: { data: [], error: null },
      parametros_sistema: { data: [], error: null },
      documento_sedes: { data: [], error: null },
    });
    rpc.mockResolvedValue({ data: CLONE_RESPONSE, error: null });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const { useSedes } = await import("@/hooks/useSedes");
    const { result } = renderHook(() =>
      useSedes(WORKSPACE_ID, { isCloneMode: true, sourceSedeId: "sede-origen-1" }),
    );

    const cloneContentQuery = hookMocks.useQuery.mock.calls[1]?.[0];
    if (typeof cloneContentQuery !== "function") {
      throw new Error("La query de contenido clonable no se ha registrado");
    }

    await cloneContentQuery();
    const cloned = await result.current.cloneOne(CLONE_INPUT);

    expect(callsFor(calls, "sedes", "select")[0]?.eqCalls).toEqual([
      ["id", "sede-origen-1"],
      ["workspace_id", WORKSPACE_ID],
    ]);
    expect(rpc).toHaveBeenCalledWith("clone_sede", expect.any(Object));
    expect(cloned?.resumen).toEqual(CLONE_RESPONSE.resumen);
    expect(hookMocks.useMutation.mock.calls[3]?.[1]).toMatchObject({
      awaitInvalidation: false,
      invalidateKeys: [
        ["sedes"],
        ["equipos"],
        ["sesiones"],
        ["parametros"],
        ["documentos"],
        ["jugadores"],
        ["entrenadores"],
      ],
    });
  });
});
