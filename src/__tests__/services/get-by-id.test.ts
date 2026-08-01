import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contrato: cada servicio de dominio debe exponer un `getXById(id, workspaceId)`
 * que filtre explícitamente por id **y** por workspace en la query a Supabase
 * (defensa en profundidad, no confiar solo en RLS). Mismo criterio que
 * `tenant-scope.test.ts` (Task 1.1). Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md
 * Task 2.1.
 *
 * `usuarios` no tiene `workspace_id` propio: la membresía se resuelve vía
 * `workspace_members`, igual que `usuarios-lookup.service.ts`.
 * `sesiones` no tiene `workspace_id` propio: se deriva del `equipo_id`.
 */

const WORKSPACE_ID = "ws-active-111";
const OTHER_WORKSPACE_ID = "ws-other-222";

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown][];
  orCalls: string[];
}

/**
 * Query-builder espía: cada método encadenable devuelve el propio builder
 * (igual que el `PostgrestFilterBuilder` real) y el builder es "thenable"
 * para poder hacer `await supabase.from(x).select(y).eq(...).maybeSingle()`.
 */
function createSupabaseMock(responsesByTable: Record<string, QueryResponse>) {
  const calls: RecordedCall[] = [];

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, eqCalls: [], inCalls: [], orCalls: [] };
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
      or: vi.fn((expr: string) => {
        record.orCalls.push(expr);
        return builder;
      }),
      order: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: (
        resolve: (v: QueryResponse) => unknown,
        reject?: (e: unknown) => unknown,
      ) =>
        Promise.resolve(responsesByTable[table] ?? { data: null, error: null }).then(
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

describe("sedes.service — getSedeById", () => {
  it("filtra por id y por workspace_id, y devuelve la sede mapeada", async () => {
    const { from, calls } = createSupabaseMock({
      sedes: {
        data: {
          id: "sede-1",
          nombre: "Sede Norte",
          direccion: null,
          configuracion_visual: {},
          responsable_id: null,
          workspace_id: WORKSPACE_ID,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getSedeById } = await import("@/services/sedes.service");
    const result = await getSedeById("sede-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "sedes", "id", "sede-1")).toBe(true);
    expect(eqIncludes(calls, "sedes", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "sedes", "workspace_id", OTHER_WORKSPACE_ID)).toBe(false);
    expect(result.data).toMatchObject({ id: "sede-1", nombre: "Sede Norte", workspaceId: WORKSPACE_ID });
  });
});

describe("equipos.service — getEquipoById", () => {
  it("filtra por id y por workspace_id, y devuelve el equipo mapeado", async () => {
    const { from, calls } = createSupabaseMock({
      equipos: {
        data: {
          id: "equipo-1",
          nombre: "Equipo A",
          categoria: "senior",
          sede_id: "sede-1",
          workspace_id: WORKSPACE_ID,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          entrenador_equipos: [],
          jugador_equipos: [],
        },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getEquipoById } = await import("@/services/equipos.service");
    const result = await getEquipoById("equipo-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "equipos", "id", "equipo-1")).toBe(true);
    expect(eqIncludes(calls, "equipos", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(result.data).toMatchObject({ id: "equipo-1", nombre: "Equipo A" });
  });
});

describe("sesiones.service — getSesionById", () => {
  it("filtra por id y verifica que el equipo de la sesión pertenece al workspace", async () => {
    const { from, calls } = createSupabaseMock({
      sesiones: {
        data: {
          id: "sesion-1",
          fecha: "2026-07-12",
          hora_inicio: "10:00",
          duracion_estimada: 60,
          equipo_id: "equipo-1",
          entrenador_id: "ent-1",
          microciclo: null,
          periodo_temporada: null,
          objetivo_sesion: null,
          observaciones_previas: null,
          feedback_post_entreno: null,
          estado: "planificada",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
      equipos: { data: { id: "equipo-1" }, error: null },
      sesion_entrenadores: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getSesionById } = await import("@/services/sesiones.service");
    const result = await getSesionById("sesion-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "sesiones", "id", "sesion-1")).toBe(true);
    expect(eqIncludes(calls, "equipos", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(result.data).toMatchObject({ id: "sesion-1", equipoId: "equipo-1" });
  });

  it("no devuelve la sesión si el equipo no pertenece al workspace activo", async () => {
    const { from } = createSupabaseMock({
      sesiones: {
        data: {
          id: "sesion-1",
          fecha: "2026-07-12",
          hora_inicio: "10:00",
          duracion_estimada: 60,
          equipo_id: "equipo-de-otro-workspace",
          entrenador_id: "ent-1",
          microciclo: null,
          periodo_temporada: null,
          objetivo_sesion: null,
          observaciones_previas: null,
          feedback_post_entreno: null,
          estado: "planificada",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
      // El equipo no pertenece al workspace activo -> la verificación no encuentra fila.
      equipos: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getSesionById } = await import("@/services/sesiones.service");
    const result = await getSesionById("sesion-1", WORKSPACE_ID);

    expect(result.data).toBeNull();
  });
});

describe("ejercicios.service — getEjercicioById", () => {
  it("filtra por id y por workspace_id, y devuelve el ejercicio mapeado", async () => {
    const { from, calls } = createSupabaseMock({
      ejercicios: {
        data: {
          id: "ejercicio-1",
          titulo: "Rondo",
          objetivo_principal: null,
          numero_jugadores_min: null,
          sede_propietaria_id: null,
          es_global: true,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
      ejercicio_documentos: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getEjercicioById } = await import("@/services/ejercicios.service");
    const result = await getEjercicioById("ejercicio-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "ejercicios", "id", "ejercicio-1")).toBe(true);
    expect(eqIncludes(calls, "ejercicios", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(result.data).toMatchObject({ id: "ejercicio-1", titulo: "Rondo" });
  });
});

describe("documentos.service — getDocumentoById", () => {
  it("filtra por id y por workspace_id (o global), y devuelve el documento mapeado", async () => {
    const { from, calls } = createSupabaseMock({
      documentos: {
        data: {
          id: "doc-1",
          titulo: "Reglamento",
          categoria_doc: null,
          drive_file_id: null,
          storage_path: "sede-1/reglamento.pdf",
          file_name: "reglamento.pdf",
          mime_type: "application/pdf",
          size_bytes: 100,
          extension: "pdf",
          external_url: null,
          source_type: "file",
          sede_id: "sede-1",
          workspace_id: WORKSPACE_ID,
          visible_entrenadores: true,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
      documento_sedes: { data: [], error: null },
      documento_equipos: { data: [], error: null },
      documento_entrenadores: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getDocumentoById } = await import("@/services/documentos.service");
    const result = await getDocumentoById("doc-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "documentos", "id", "doc-1")).toBe(true);
    const docCall = calls.find((c) => c.table === "documentos");
    expect(docCall?.orCalls.some((expr) => expr.includes(WORKSPACE_ID))).toBe(true);
    expect(result.data).toMatchObject({ id: "doc-1", titulo: "Reglamento" });
  });
});

describe("parametros.service — getParametroById", () => {
  it("filtra por id y por workspace_id, y devuelve el parámetro mapeado", async () => {
    const { from, calls } = createSupabaseMock({
      parametros_sistema: {
        data: {
          id: "param-1",
          categoria: "posiciones",
          nombre: "Portero",
          activo: true,
          sede_id: null,
          created_at: "2026-01-01",
        },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getParametroById } = await import("@/services/parametros.service");
    const result = await getParametroById("param-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "parametros_sistema", "id", "param-1")).toBe(true);
    expect(eqIncludes(calls, "parametros_sistema", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(result.data).toMatchObject({ id: "param-1", nombre: "Portero" });
  });
});

describe("usuarios.service — getUsuarioById", () => {
  it("verifica membresía en workspace_members antes de devolver el usuario", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: { user_id: "usr-1" }, error: null },
      usuarios: {
        data: {
          id: "usr-1",
          email: "a@a.com",
          nombre: "A",
          rol: "entrenador",
          telefono: null,
          foto_perfil: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getUsuarioById } = await import("@/services/usuarios.service");
    const result = await getUsuarioById("usr-1", WORKSPACE_ID);

    expect(eqIncludes(calls, "workspace_members", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "user_id", "usr-1")).toBe(true);
    expect(result.data).toMatchObject({ id: "usr-1", email: "a@a.com" });
  });

  it("no devuelve el usuario si no es miembro del workspace activo", async () => {
    const { from } = createSupabaseMock({
      workspace_members: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { getUsuarioById } = await import("@/services/usuarios.service");
    const result = await getUsuarioById("usr-1", WORKSPACE_ID);

    expect(result.data).toBeNull();
  });
});
