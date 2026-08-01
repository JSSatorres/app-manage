import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contrato: los `fetchAll*`/lookups que exponen datos a nivel de app deben
 * filtrar explícitamente por `workspace_id` en la query a Supabase (defensa
 * en profundidad, no confiar solo en RLS). Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
 * Task 1.1.
 */

const ACTIVE_WORKSPACE_ID = "ws-active-111";
const OTHER_WORKSPACE_ID = "ws-other-222";

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown][];
}

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
  return { from, calls };
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
