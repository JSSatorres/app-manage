import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contrato: CRUD cliente-seguro del dominio Usuarios (Task 2.3, B4).
 *
 * `usuarios` no tiene `workspace_id` propio: la membresía/rol reales viven en
 * `workspace_members` (workspace_id, user_id, role). Por eso:
 * - `fetchUsuarios(workspaceId)` resuelve primero los miembros del workspace y
 *   acota `usuarios` a esos ids (igual que `usuarios-lookup.service.ts`).
 * - `updateUsuario` verifica membresía antes de tocar el perfil (defensa en
 *   profundidad, no confiar solo en RLS — M2 del roadmap).
 * - `updateUsuarioRol` y `deleteUsuario` operan directamente sobre
 *   `workspace_members`, acotados por `workspace_id` + `user_id`: "eliminar" un
 *   usuario aquí significa quitarle el acceso a este workspace, no borrar su
 *   cuenta global de Supabase Auth (eso requiere admin API server-side, fuera
 *   de alcance de un CRUD cliente-seguro).
 */

const WORKSPACE_ID = "ws-active-111";
const OTHER_WORKSPACE_ID = "ws-other-222";

type QueryResponse = { data: unknown; error: unknown };

interface RecordedCall {
  table: string;
  method: "select" | "update" | "delete" | null;
  payload?: unknown;
  eqCalls: [string, unknown][];
  inCalls: [string, unknown][];
}

/**
 * Query-builder espía: cada método encadenable devuelve el propio builder
 * (igual que el `PostgrestFilterBuilder` real) y el builder es "thenable"
 * para poder hacer `await supabase.from(x).select(y).eq(...).maybeSingle()`.
 * Mismo patrón que `get-by-id.test.ts` / `tenant-scope.test.ts`.
 */
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

describe("usuarios.service — fetchUsuarios", () => {
  it("exige workspaceId y resuelve la lista vía workspace_members (scoped)", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: [{ user_id: "u1", role: "entrenador" }], error: null },
      usuarios: {
        data: [
          {
            id: "u1",
            email: "a@a.com",
            nombre: "A",
            rol: "Entrenador",
            telefono: null,
            foto_perfil: null,
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchUsuarios } = await import("@/services/usuarios.service");
    const result = await fetchUsuarios(WORKSPACE_ID);

    expect(eqIncludes(calls, "workspace_members", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "workspace_id", OTHER_WORKSPACE_ID)).toBe(false);
    const usuariosCall = calls.find((c) => c.table === "usuarios");
    expect(
      usuariosCall?.inCalls.some(
        ([col, val]) => col === "id" && Array.isArray(val) && (val as string[]).includes("u1"),
      ),
    ).toBe(true);
    expect(result.data).toMatchObject([{ id: "u1", email: "a@a.com", workspaceRol: "entrenador" }]);
  });

  it("no consulta usuarios si nadie del workspace tiene membresía", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { fetchUsuarios } = await import("@/services/usuarios.service");
    const result = await fetchUsuarios(WORKSPACE_ID);

    expect(calls.some((c) => c.table === "usuarios")).toBe(false);
    expect(result.data).toEqual([]);
  });
});

describe("usuarios.service — updateUsuario", () => {
  it("verifica membresía en el workspace activo antes de actualizar nombre/telefono", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: { user_id: "usr-1", role: "entrenador" }, error: null },
      usuarios: {
        data: {
          id: "usr-1",
          email: "a@a.com",
          nombre: "Nuevo Nombre",
          rol: "Entrenador",
          telefono: "600000000",
          foto_perfil: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-02",
        },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateUsuario } = await import("@/services/usuarios.service");
    const result = await updateUsuario("usr-1", WORKSPACE_ID, {
      nombre: "Nuevo Nombre",
      telefono: "600000000",
    });

    expect(eqIncludes(calls, "workspace_members", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "user_id", "usr-1")).toBe(true);
    expect(eqIncludes(calls, "usuarios", "id", "usr-1")).toBe(true);

    const usuariosUpdateCall = calls.find((c) => c.table === "usuarios" && c.method === "update");
    expect(usuariosUpdateCall?.payload).toMatchObject({
      nombre: "Nuevo Nombre",
      telefono: "600000000",
    });
    expect(result.data).toMatchObject({ id: "usr-1", nombre: "Nuevo Nombre", workspaceRol: "entrenador" });
    expect(result.error).toBeNull();
  });

  it("no actualiza si el usuario no pertenece al workspace activo", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateUsuario } = await import("@/services/usuarios.service");
    const result = await updateUsuario("usr-1", WORKSPACE_ID, { nombre: "X" });

    expect(calls.some((c) => c.table === "usuarios" && c.method === "update")).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("usuarios.service — updateUsuarioRol", () => {
  it("actualiza workspace_members.role acotado por workspace_id + user_id", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: {
        data: { workspace_id: WORKSPACE_ID, user_id: "usr-1", role: "admin" },
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { updateUsuarioRol } = await import("@/services/usuarios.service");
    const result = await updateUsuarioRol(WORKSPACE_ID, "usr-1", "admin");

    const updateCall = calls.find((c) => c.table === "workspace_members" && c.method === "update");
    expect(updateCall?.payload).toMatchObject({ role: "admin" });
    expect(eqIncludes(calls, "workspace_members", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "user_id", "usr-1")).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "workspace_id", OTHER_WORKSPACE_ID)).toBe(false);
    expect(result.data).toMatchObject({ workspaceId: WORKSPACE_ID, userId: "usr-1", rol: "admin" });
  });
});

describe("usuarios.service — deleteUsuario", () => {
  it("elimina la membresía (workspace_members) acotada por workspace_id + user_id", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteUsuario } = await import("@/services/usuarios.service");
    const result = await deleteUsuario(WORKSPACE_ID, "usr-1");

    const deleteCall = calls.find((c) => c.table === "workspace_members" && c.method === "delete");
    expect(deleteCall).toBeTruthy();
    expect(eqIncludes(calls, "workspace_members", "workspace_id", WORKSPACE_ID)).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "user_id", "usr-1")).toBe(true);
    expect(eqIncludes(calls, "workspace_members", "workspace_id", OTHER_WORKSPACE_ID)).toBe(false);
    expect(result.data).toBe(true);
    expect(result.error).toBeNull();
  });

  it("no expone un delete global de la fila usuarios (solo quita la membresía)", async () => {
    const { from, calls } = createSupabaseMock({
      workspace_members: { data: null, error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const { deleteUsuario } = await import("@/services/usuarios.service");
    await deleteUsuario(WORKSPACE_ID, "usr-1");

    expect(calls.some((c) => c.table === "usuarios" && c.method === "delete")).toBe(false);
  });
});
