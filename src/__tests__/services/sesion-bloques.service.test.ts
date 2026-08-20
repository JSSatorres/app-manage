import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("@/services/sesion-detalle.service", () => ({
  fetchSesionDetalle: vi.fn(),
}));

import { getSupabaseClient } from "@/services/supabase";
import { fetchSesionDetalle } from "@/services/sesion-detalle.service";
import {
  fetchSesionBloques,
  replaceSesionBloques,
} from "@/services/sesion-bloques.service";
import type { SesionBloque } from "@/types/sesion-bloques";

interface QueryResponse {
  data: unknown;
  error: unknown;
}

interface RecordedCall {
  table: string;
  select: string | null;
  eqCalls: [string, unknown][];
  orderCalls: [string, { ascending: boolean } | undefined][];
}

interface RecordedRpcCall {
  name: string;
  args: unknown;
}

function createSupabaseMock(
  responses: Record<string, QueryResponse>,
  rpcResponse: QueryResponse = { data: null, error: null },
) {
  const calls: RecordedCall[] = [];
  const rpcCalls: RecordedRpcCall[] = [];

  function makeBuilder(table: string) {
    const record: RecordedCall = { table, select: null, eqCalls: [], orderCalls: [] };
    calls.push(record);
    const builder: Record<string, unknown> = {
      select: vi.fn((columns: string) => {
        record.select = columns;
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        record.eqCalls.push([column, value]);
        return builder;
      }),
      order: vi.fn((column: string, options?: { ascending: boolean }) => {
        record.orderCalls.push([column, options]);
        return builder;
      }),
      then: (resolve: (response: QueryResponse) => unknown, reject?: (error: unknown) => unknown) =>
        Promise.resolve(responses[table] ?? { data: null, error: null }).then(resolve, reject),
    };
    return builder;
  }

  const rpc = vi.fn((name: string, args: unknown) => {
    rpcCalls.push({ name, args });
    return Promise.resolve(rpcResponse);
  });

  return { from: vi.fn((table: string) => makeBuilder(table)), rpc, calls, rpcCalls };
}

describe("sesion-bloques.service — fetchSesionBloques", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve error cuando no hay cliente", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(null);

    const result = await fetchSesionBloques("sesion-1");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });

  it("lee bloques nuevos ordenados, con joins mínimos y campos camelCase", async () => {
    const { from, calls } = createSupabaseMock({
      sesion_bloques: {
        data: [
          {
            id: "bloque-2",
            sesion_id: "sesion-1",
            titulo: "Final",
            duracion_minutos: 20,
            ejercicio_id: "ejercicio-2",
            documento_id: null,
            orden: 2,
            created_at: "2026-08-08T10:00:00Z",
          },
          {
            id: "bloque-1",
            sesion_id: "sesion-1",
            titulo: "Inicio",
            duracion_minutos: 10,
            ejercicio_id: "ejercicio-1",
            documento_id: "documento-1",
            orden: 1,
            created_at: "2026-08-08T09:00:00Z",
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const result = await fetchSesionBloques("sesion-1");

    expect(result).toEqual({
      data: {
        bloques: [
          {
            id: "bloque-1",
            sesionId: "sesion-1",
            titulo: "Inicio",
            duracionMinutos: 10,
            ejercicioId: "ejercicio-1",
            ejercicioTitulo: null,
            documentoId: "documento-1",
            orden: 1,
            createdAt: "2026-08-08T09:00:00Z",
          },
          {
            id: "bloque-2",
            sesionId: "sesion-1",
            titulo: "Final",
            duracionMinutos: 20,
            ejercicioId: "ejercicio-2",
            ejercicioTitulo: null,
            documentoId: null,
            orden: 2,
            createdAt: "2026-08-08T10:00:00Z",
          },
        ],
        source: "blocks",
        isExecutable: true,
      },
      error: null,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: "sesion_bloques",
      eqCalls: [["sesion_id", "sesion-1"]],
      orderCalls: [["orden", { ascending: true }]],
    });
    expect(calls[0]?.select).toContain("ejercicios(id,titulo)");
    expect(calls[0]?.select).toContain("documentos(id,titulo)");
    expect(calls[0]?.select).not.toBe("*");
  });

  it("expone el título del ejercicio embebido, venga como objeto o como array", async () => {
    const { from } = createSupabaseMock({
      sesion_bloques: {
        data: [
          {
            id: "bloque-1", sesion_id: "sesion-1", titulo: "Inicio", duracion_minutos: 10,
            ejercicio_id: "ejercicio-1", documento_id: null, orden: 1,
            created_at: "2026-08-08T09:00:00Z",
            ejercicios: { id: "ejercicio-1", titulo: "Rondo 4x1 básico" },
          },
          {
            id: "bloque-2", sesion_id: "sesion-1", titulo: "Final", duracion_minutos: 20,
            ejercicio_id: "ejercicio-2", documento_id: null, orden: 2,
            created_at: "2026-08-08T10:00:00Z",
            ejercicios: [{ id: "ejercicio-2", titulo: "Rueda de pases" }],
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const result = await fetchSesionBloques("sesion-1");
    const bloques = (result.data as { bloques: { ejercicioTitulo: string | null }[] }).bloques;

    expect(bloques[0]?.ejercicioTitulo).toBe("Rondo 4x1 básico");
    expect(bloques[1]?.ejercicioTitulo).toBe("Rueda de pases");
  });

  it("mapea un bloque sin ejercicio con notas de texto libre", async () => {
    const { from } = createSupabaseMock({
      sesion_bloques: {
        data: [
          {
            id: "bloque-1",
            sesion_id: "sesion-1",
            titulo: "Charla táctica",
            duracion_minutos: 15,
            ejercicio_id: null,
            documento_id: null,
            notas: "Trabajo individual",
            orden: 1,
            created_at: "2026-08-08T09:00:00Z",
            ejercicios: null,
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    const result = await fetchSesionBloques("sesion-1");
    const bloques = (result.data as { bloques: SesionBloque[] }).bloques;

    expect(bloques[0]).toMatchObject({
      ejercicioId: null,
      ejercicioTitulo: null,
      notas: "Trabajo individual",
    });
  });

  it("importa el detalle legado como borrador cuando no hay bloques nuevos", async () => {
    const { from } = createSupabaseMock({
      sesion_bloques: { data: [], error: null },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);
    vi.mocked(fetchSesionDetalle).mockResolvedValue({
      data: [
        {
          id: "detalle-2",
          ejercicioId: "ejercicio-2",
          orden: 2,
          tiempoEjecucion: 20,
          tiempoDescanso: null,
          varianteAplicada: null,
          titulo: "Final",
          objetivoPrincipal: null,
        },
        {
          id: "detalle-1",
          ejercicioId: "ejercicio-1",
          orden: 1,
          tiempoEjecucion: 10,
          tiempoDescanso: null,
          varianteAplicada: null,
          titulo: "Inicio",
          objetivoPrincipal: null,
        },
      ],
      error: null,
    });

    const result = await fetchSesionBloques("sesion-1");

    expect(result).toEqual({
      data: {
        bloques: [
          {
            id: "detalle-1",
            titulo: "Inicio",
            duracionMinutos: 10,
            ejercicioId: "ejercicio-1",
            documentoId: null,
            notas: null,
            orden: 1,
          },
          {
            id: "detalle-2",
            titulo: "Final",
            duracionMinutos: 20,
            ejercicioId: "ejercicio-2",
            documentoId: null,
            notas: null,
            orden: 2,
          },
        ],
        source: "legacy-draft",
        isExecutable: false,
      },
      error: null,
    });
  });

  it("no consulta ni mezcla detalle legado si ya existen bloques nuevos", async () => {
    const { from } = createSupabaseMock({
      sesion_bloques: {
        data: [
          {
            id: "bloque-1",
            sesion_id: "sesion-1",
            titulo: "Inicio",
            duracion_minutos: 10,
            ejercicio_id: "ejercicio-1",
            documento_id: null,
            orden: 1,
            created_at: "2026-08-08T09:00:00Z",
          },
        ],
        error: null,
      },
    });
    vi.mocked(getSupabaseClient).mockReturnValue({ from } as never);

    await fetchSesionBloques("sesion-1");

    expect(fetchSesionDetalle).not.toHaveBeenCalled();
  });

  it("reemplaza con una única RPC, payload snake_case y retorno ordenado", async () => {
    const { from, rpc, rpcCalls } = createSupabaseMock(
      {},
      {
        data: [
          {
            id: "bloque-2", sesion_id: "sesion-1", titulo: "Final", duracion_minutos: 20,
            ejercicio_id: "ejercicio-2", documento_id: null, orden: 2, created_at: "2026-08-08T10:00:00Z",
          },
          {
            id: "bloque-1", sesion_id: "sesion-1", titulo: "Inicio", duracion_minutos: 10,
            ejercicio_id: "ejercicio-1", documento_id: "documento-1", orden: 1, created_at: "2026-08-08T09:00:00Z",
          },
        ],
        error: null,
      },
    );
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const result = await replaceSesionBloques("sesion-1", [
      { titulo: "Inicio", duracionMinutos: 10, ejercicioId: "ejercicio-1", documentoId: "documento-1", notas: null, orden: 1 },
      { titulo: "Final", duracionMinutos: 20, ejercicioId: "ejercicio-2", documentoId: null, notas: null, orden: 2 },
    ]);

    expect(rpcCalls).toEqual([
      {
        name: "replace_sesion_bloques",
        args: {
          p_sesion_id: "sesion-1",
          p_bloques: [
            { titulo: "Inicio", duracion_minutos: 10, ejercicio_id: "ejercicio-1", documento_id: "documento-1", notas: null, orden: 1 },
            { titulo: "Final", duracion_minutos: 20, ejercicio_id: "ejercicio-2", documento_id: null, notas: null, orden: 2 },
          ],
        },
      },
    ]);
    expect(result).toMatchObject({
      data: [
        { id: "bloque-1", duracionMinutos: 10, orden: 1 },
        { id: "bloque-2", duracionMinutos: 20, orden: 2 },
      ],
      error: null,
    });
  });

  it("devuelve ejercicioTitulo null cuando la relación no viaja en la fila", async () => {
    const { from, rpc } = createSupabaseMock(
      {},
      {
        data: [
          {
            id: "bloque-1", sesion_id: "sesion-1", titulo: "Inicio", duracion_minutos: 10,
            ejercicio_id: "ejercicio-1", documento_id: null, orden: 1,
            created_at: "2026-08-08T09:00:00Z",
          },
        ],
        error: null,
      },
    );
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    const result = await replaceSesionBloques("sesion-1", [
      { titulo: "Inicio", duracionMinutos: 10, ejercicioId: "ejercicio-1", documentoId: null, notas: null, orden: 1 },
    ]);

    expect(result.data?.[0]).toMatchObject({ ejercicioId: "ejercicio-1", ejercicioTitulo: null });
  });

  it("envía notas de texto libre sin ejercicio ni documento en el payload de reemplazo", async () => {
    const { from, rpc, rpcCalls } = createSupabaseMock({}, { data: [], error: null });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    await replaceSesionBloques("sesion-1", [
      { titulo: "Charla táctica", duracionMinutos: 15, ejercicioId: null, documentoId: null, notas: "Solo texto", orden: 1 },
    ]);

    expect(rpcCalls[0]?.args).toMatchObject({
      p_bloques: [
        { ejercicio_id: null, documento_id: null, notas: "Solo texto" },
      ],
    });
  });

  it("propaga el error de la RPC de reemplazo", async () => {
    const rpcError = new Error("No autorizado");
    const { from, rpc } = createSupabaseMock({}, { data: null, error: rpcError });
    vi.mocked(getSupabaseClient).mockReturnValue({ from, rpc } as never);

    await expect(replaceSesionBloques("sesion-1", [])).resolves.toEqual({
      data: null,
      error: rpcError,
    });
  });
});
