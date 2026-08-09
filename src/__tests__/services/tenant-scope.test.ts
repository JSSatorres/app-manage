import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Contrato: los `fetchAll*`/lookups que exponen datos a nivel de app deben
 * filtrar explícitamente por `workspace_id` en la query a Supabase (defensa
 * en profundidad, no confiar solo en RLS). Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
 * Task 1.1.
 */

const ACTIVE_WORKSPACE_ID = "ws-active-111";
const OTHER_WORKSPACE_ID = "ws-other-222";

const CLONE_SELECTION = {
  equipos: ["equipo-origen-1"],
  entrenadores: ["entrenador-1"],
  jugadores: ["jugador-1"],
  sesiones: ["sesion-origen-1"],
  parametros: ["parametro-origen-1"],
  documentos: ["documento-origen-1"],
};

const CLONE_INPUT = {
  workspaceId: ACTIVE_WORKSPACE_ID,
  sourceSedeId: "sede-origen-1",
  nombre: "Sede destino",
  direccion: null,
  seleccion: CLONE_SELECTION,
};

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown][];
}

type CloneSedeService = (input: unknown) => Promise<{
  data: unknown;
  error: unknown;
}>;

/**
 * Query-builder espía: cada método encadenable devuelve el propio builder
 * (igual que el `PostgrestFilterBuilder` real) y el builder es "thenable"
 * para poder hacer `await supabase.from(x).select(y).eq(...)`.
 */
function createSupabaseMock(responsesByTable: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = [];

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, eqCalls: [], inCalls: [] };
    calls.push(record);

    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
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
      then: (
        resolve: (v: QueryResponse) => unknown,
        reject?: (e: unknown) => unknown,
      ) =>
        Promise.resolve(responsesByTable[table] ?? { data: [], error: null }).then(
          resolve,
          reject,
        ),
    };
    return builder;
  }

  const from = vi.fn((table: string) => makeBuilder(table));
  const rpc = vi.fn();
  return { from, rpc, calls };
}

function eqIncludes(calls: RecordedCall[], table: string, col: string, val: unknown): boolean {
  return calls
    .filter((c) => c.table === table)
    .some((c) => c.eqCalls.some(([c2, v2]) => c2 === col && v2 === val));
}

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "@/services/supabase";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clone_sede migration — omisiones y aislamiento tenant", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260809130000_clone_sede_omissions.sql",
  );

  function readMigration(): string {
    return readFileSync(migrationPath, "utf8");
  }

  it("omite una sesión sin equipo seleccionado junto con sus dependencias", () => {
    const sql = readMigration();

    expect(sql).not.toContain("RAISE EXCEPTION 'session requires its selected team'");
    expect(sql).toContain("v_effective_session_ids uuid[]");
    expect(sql).toMatch(
      /FROM public\.sesiones se\s+WHERE se\.id = ANY\(v_session_ids\)\s+AND se\.equipo_id = ANY\(v_team_ids\)/,
    );
    expect(sql).toContain("FOREACH v_source_session_id IN ARRAY v_effective_session_ids LOOP");
    expect(sql).toContain("sd.sesion_id = ANY(v_effective_session_ids)");
    expect(sql).toContain("se.sesion_id = ANY(v_effective_session_ids)");
    expect(sql.indexOf("INSERT INTO public.sesion_detalle")).toBeGreaterThan(
      sql.indexOf("FOREACH v_source_session_id IN ARRAY v_effective_session_ids LOOP"),
    );
    expect(sql.indexOf("INSERT INTO public.sesion_entrenadores")).toBeGreaterThan(
      sql.indexOf("FOREACH v_source_session_id IN ARRAY v_effective_session_ids LOOP"),
    );
    expect(sql).toContain("'sesion_equipo_no_seleccionado'");
  });

  it("mantiene la asociación sede-persona y crea pivotes solo para equipos clonados", () => {
    const sql = readMigration();
    const trainerSedeInsert = sql.indexOf("INSERT INTO public.entrenador_sedes");
    const playerSedeInsert = sql.indexOf("INSERT INTO public.jugador_sedes");
    const teamLoop = sql.indexOf("FOREACH v_source_team_id IN ARRAY v_team_ids LOOP");
    const trainerTeamInsert = sql.indexOf("INSERT INTO public.entrenador_equipos");
    const playerTeamInsert = sql.indexOf("INSERT INTO public.jugador_equipos");

    expect(trainerSedeInsert).toBeGreaterThan(-1);
    expect(playerSedeInsert).toBeGreaterThan(-1);
    expect(teamLoop).toBeGreaterThan(playerSedeInsert);
    expect(trainerTeamInsert).toBeGreaterThan(teamLoop);
    expect(playerTeamInsert).toBeGreaterThan(teamLoop);
    expect(sql).toContain("ee.equipo_id = v_source_team_id");
    expect(sql).toContain("je.equipo_id = v_source_team_id");
    expect(sql).toContain("'entrenador_equipo_no_seleccionado'");
    expect(sql).toContain("'jugador_equipo_no_seleccionado'");
  });

  it("devuelve un resumen autoritativo de omisiones sin relajar la seguridad ni los grants", () => {
    const sql = readMigration();

    expect(sql).toContain("v_user_id uuid := auth.uid()");
    expect(sql).toContain("workspace_members wm");
    expect(sql).toContain("workspace_id = p_workspace_id");
    expect(sql).toContain("selection IDs must be valid UUIDs");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public, pg_temp");
    expect(sql).toContain("'omisiones'");
    expect(sql).toMatch(/'total',\s*v_omitted_session_count \+ v_omitted_trainer_team_count \+ v_omitted_player_team_count/);
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.clone_sede(uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, service_role;",
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.clone_sede(uuid, uuid, text, text, jsonb) TO authenticated;",
    );
  });
});

describe("equipos.service — fetchEquiposByWorkspace", () => {
  it("filtra por workspace_id en la query a Supabase", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEquiposByWorkspace } = await import("@/services/equipos.service");
    await fetchEquiposByWorkspace(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "equipos", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
  });

  it("ya NO expone un fetchAllEquipos sin scope de workspace", async () => {
    const equiposService = await import("@/services/equipos.service");
    expect("fetchAllEquipos" in equiposService).toBe(false);
  });
});

describe("jugadores.service — fetchJugadoresByWorkspace", () => {
  it("filtra por workspace_id en la query a Supabase", async () => {
    const { from, calls } = createSupabaseMock({
      jugadores: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchJugadoresByWorkspace } = await import("@/services/jugadores.service");
    await fetchJugadoresByWorkspace(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "jugadores", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
  });

  it("ya NO expone un fetchAllJugadores sin scope de workspace", async () => {
    const jugadoresService = await import("@/services/jugadores.service");
    expect("fetchAllJugadores" in jugadoresService).toBe(false);
  });
});

describe("entrenadores.service — fetchEntrenadoresByWorkspace", () => {
  it("filtra por workspace_id en la query a Supabase", async () => {
    const { from, calls } = createSupabaseMock({
      entrenadores: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchEntrenadoresByWorkspace } = await import("@/services/entrenadores.service");
    await fetchEntrenadoresByWorkspace(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "entrenadores", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
  });

  it("ya NO expone un fetchAllEntrenadores sin scope de workspace", async () => {
    const entrenadoresService = await import("@/services/entrenadores.service");
    expect("fetchAllEntrenadores" in entrenadoresService).toBe(false);
  });
});

describe("sedes.service — fetchSedes", () => {
  it("exige workspaceId y filtra por workspace_id en la query", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchSedes } = await import("@/services/sedes.service");
    await fetchSedes(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "sedes", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
  });

  it("no mezcla sedes de otro workspace en la misma llamada", async () => {
    const { from, calls } = createSupabaseMock({ sedes: { data: [], error: null } });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchSedes } = await import("@/services/sedes.service");
    await fetchSedes(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "sedes", "workspace_id", OTHER_WORKSPACE_ID)).toBe(false);
  });
});

describe("usuarios-lookup.service — fetchUsuariosLookup", () => {
  it("exige workspaceId y resuelve los usuarios vía workspace_members (join scoped)", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: [{ user_id: "u1" }], error: null },
      usuarios: { data: [{ id: "u1", email: "a@a.com", nombre: "A" }], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchUsuariosLookup } = await import("@/services/usuarios-lookup.service");
    const result = await fetchUsuariosLookup(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "workspace_members", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
    expect(result.data).toEqual([{ id: "u1", email: "a@a.com", nombre: "A" }]);
  });

  it("no devuelve usuarios de otro workspace sin pasar por el filtro", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: [], error: null },
      usuarios: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchUsuariosLookup } = await import("@/services/usuarios-lookup.service");
    await fetchUsuariosLookup(ACTIVE_WORKSPACE_ID);

    const usuariosCalls = calls.filter((c) => c.table === "usuarios");
    // La tabla usuarios se consulta con .in(id, [...]) resuelto desde workspace_members,
    // nunca con un select sin acotar por membership.
    expect(usuariosCalls.every((c) => c.inCalls.length > 0)).toBe(true);
  });
});

describe("sedes-lookup.service — fetchSedesLookup", () => {
  it("exige workspaceId y filtra por workspace_id en la query", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchSedesLookup } = await import("@/services/sedes-lookup.service");
    await fetchSedesLookup(ACTIVE_WORKSPACE_ID);

    expect(eqIncludes(calls, "sedes", "workspace_id", ACTIVE_WORKSPACE_ID)).toBe(true);
  });
});

describe("sedes.service — cloneSede contract de seguridad", () => {
  it("envía la selección completa a la RPC y conserva sus remapeos, resumen y exclusiones", async () => {
    const cloneResponse = {
      sede: {
        id: "sede-destino-1",
        nombre: "Sede destino",
        direccion: null,
        responsable_id: null,
        configuracion_visual: {},
        workspace_id: ACTIVE_WORKSPACE_ID,
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
    const { from, rpc } = createSupabaseMock({});
    rpc.mockResolvedValue({ data: cloneResponse, error: null });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const { cloneSede } = await import("@/services/sedes.service");
    const result = await cloneSede(CLONE_INPUT);

    expect(rpc).toHaveBeenCalledWith("clone_sede", {
      p_workspace_id: ACTIVE_WORKSPACE_ID,
      p_source_sede_id: "sede-origen-1",
      p_nombre: "Sede destino",
      p_direccion: null,
      p_seleccion: CLONE_SELECTION,
    });
    expect(result).toEqual({ data: cloneResponse, error: null });
    expect(result.data?.mappings).toEqual({
      equipos: { "equipo-origen-1": "equipo-destino-1" },
      sesiones: { "sesion-origen-1": "sesion-destino-1" },
    });
    expect(result.data?.resumen).toMatchObject({
      entrenadores: 1,
      jugadores: 1,
      documentos: 1,
      ejercicios: 0,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("mantiene vacías las categorías excluidas al pedir una clonación parcial", async () => {
    const partialSelection = {
      equipos: ["equipo-origen-1"],
      entrenadores: [],
      jugadores: [],
      sesiones: [],
      parametros: [],
      documentos: [],
    };
    const { from, rpc } = createSupabaseMock({});
    rpc.mockResolvedValue({
      data: {
        sede: {
          id: "sede-destino-parcial",
          nombre: "Sede parcial",
          direccion: null,
          responsable_id: null,
          configuracion_visual: {},
          workspace_id: ACTIVE_WORKSPACE_ID,
        },
        mappings: { equipos: { "equipo-origen-1": "equipo-destino-1" }, sesiones: {} },
        resumen: {
          equipos: 1,
          entrenadores: 0,
          jugadores: 0,
          sesiones: 0,
          parametros: 0,
          documentos: 0,
          ejercicios: 0,
        },
      },
      error: null,
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const { cloneSede } = await import("@/services/sedes.service");
    const result = await cloneSede({ ...CLONE_INPUT, seleccion: partialSelection });

    expect(rpc).toHaveBeenCalledWith(
      "clone_sede",
      expect.objectContaining({ p_seleccion: partialSelection }),
    );
    expect(result.data?.resumen).toEqual({
      equipos: 1,
      entrenadores: 0,
      jugadores: 0,
      sesiones: 0,
      parametros: 0,
      documentos: 0,
      ejercicios: 0,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ["anónimo", "not authenticated", CLONE_INPUT],
    ["rol sin gestión", "not authorized to clone sede", CLONE_INPUT],
    [
      "workspace ajeno",
      "source sede outside workspace",
      { ...CLONE_INPUT, workspaceId: OTHER_WORKSPACE_ID },
    ],
    [
      "ID ajeno a la sede origen",
      "selected team outside source sede",
      { ...CLONE_INPUT, seleccion: { ...CLONE_SELECTION, equipos: ["equipo-ajeno-1"] } },
    ],
    [
      "IDs repetidos",
      "duplicate IDs in equipos",
      { ...CLONE_INPUT, seleccion: { ...CLONE_SELECTION, equipos: ["equipo-origen-1", "equipo-origen-1"] } },
    ],
    [
      "clave desconocida",
      "unknown selection key",
      { ...CLONE_INPUT, seleccion: { ...CLONE_SELECTION, usuarios: ["usuario-legacy-1"] } },
    ],
  ])("propaga el rechazo RPC para %s", async (_caseName, rpcMessage, input) => {
    const { from, rpc } = createSupabaseMock({});
    const rpcError = new Error(rpcMessage);
    rpc.mockResolvedValue({ data: null, error: rpcError });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const sedesService = (await import("@/services/sedes.service")) as {
      cloneSede?: CloneSedeService;
    };

    expect(sedesService.cloneSede).toBeTypeOf("function");

    const result = await sedesService.cloneSede!(input);

    expect(result).toEqual({ data: null, error: rpcError });
    // El cliente no compone inserciones: el error de la RPC debe conservar la
    // transacción atómica del servidor, sin operaciones parciales desde UI.
    expect(from).not.toHaveBeenCalled();
  });
});
