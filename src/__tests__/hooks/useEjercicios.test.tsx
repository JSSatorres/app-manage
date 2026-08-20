import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEjercicios } from "@/hooks/useEjercicios";
import { syncEjercicioDocumentos } from "@/services/ejercicio-documentos.service";

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
  refetch: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  mutationIndex: 0,
}));

vi.mock("@/hooks/useMutation", () => ({ useMutation: mocks.useMutation }));
vi.mock("@/hooks/useQuery", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/services/ejercicios.service", () => ({
  createEjercicio: vi.fn(),
  updateEjercicio: vi.fn(),
  deleteEjercicio: vi.fn(),
  fetchEjercicios: vi.fn(),
}));
vi.mock("@/services/ejercicio-documentos.service", () => ({
  syncEjercicioDocumentos: vi.fn(),
}));

const created = {
  id: "ejercicio-1",
  titulo: "Rondo",
  objetivoPrincipal: null,
  numeroJugadoresMin: null,
  sedePropietariaId: null,
  esGlobal: false,
  documentoIds: [],
  createdAt: "",
  updatedAt: "",
};

function mutation(mutate: ReturnType<typeof vi.fn>) {
  return {
    mutate,
    loading: false,
    errorMessage: null,
  };
}

describe("useEjercicios", () => {
  beforeEach(() => {
    mocks.createMutate.mockReset();
    mocks.updateMutate.mockReset();
    mocks.deleteMutate.mockReset();
    mocks.refetch.mockReset().mockResolvedValue(undefined);
    mocks.mutationIndex = 0;
    mocks.useMutation.mockReset().mockImplementation(() => {
      const mutations = [
        mutation(mocks.createMutate),
        mutation(mocks.updateMutate),
        mutation(mocks.deleteMutate),
      ];
      const current = mutations[mocks.mutationIndex % mutations.length];
      mocks.mutationIndex += 1;
      return current;
    });
    mocks.useQuery.mockReset().mockReturnValue({
      data: [],
      loading: false,
      errorMessage: null,
      refetch: mocks.refetch,
    });
    vi.mocked(syncEjercicioDocumentos).mockReset();
  });

  it("no sincroniza ni refresca cuando la creación base devuelve null", async () => {
    mocks.createMutate.mockResolvedValue(null);
    const { result } = renderHook(() => useEjercicios("sede-1", "workspace-1"));

    await act(async () => {
      await expect(result.current.createOne({
        titulo: "Rondo",
        objetivoPrincipal: null,
        numeroJugadoresMin: null,
        esGlobal: false,
        sedePropietariaId: null,
        documentoIds: ["documento-1"],
        workspaceId: "workspace-1",
      })).resolves.toBeNull();
    });

    expect(syncEjercicioDocumentos).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it("refresca y devuelve la fila persistida aunque falle la asociación documental", async () => {
    mocks.createMutate.mockResolvedValue(created);
    vi.mocked(syncEjercicioDocumentos).mockResolvedValue({
      data: false,
      error: new Error("RLS INSERT denegado"),
    });
    const { result } = renderHook(() => useEjercicios("sede-1", "workspace-1"));

    await act(async () => {
      await expect(result.current.createOne({
        titulo: "Rondo",
        objetivoPrincipal: null,
        numeroJugadoresMin: null,
        esGlobal: false,
        sedePropietariaId: null,
        documentoIds: ["documento-1"],
        workspaceId: "workspace-1",
      })).resolves.toEqual(created);
    });

    expect(syncEjercicioDocumentos).toHaveBeenCalledWith("ejercicio-1", ["documento-1"]);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.documentosErrorMessage).toContain(
      "El ejercicio se guardó, pero no se pudieron asociar sus documentos",
    );
  });

  it("limpia el error parcial después de una sincronización correcta", async () => {
    mocks.createMutate.mockResolvedValue(created);
    vi.mocked(syncEjercicioDocumentos)
      .mockResolvedValueOnce({ data: false, error: new Error("RLS INSERT denegado") })
      .mockResolvedValueOnce({ data: true, error: null });
    const { result } = renderHook(() => useEjercicios("sede-1", "workspace-1"));
    const input = {
      titulo: "Rondo",
      objetivoPrincipal: null,
      numeroJugadoresMin: null,
      esGlobal: false,
      sedePropietariaId: null,
      documentoIds: ["documento-1"],
      workspaceId: "workspace-1",
    };

    await act(async () => { await result.current.createOne(input); });
    expect(result.current.documentosErrorMessage).not.toBeNull();

    await act(async () => { await result.current.createOne(input); });
    expect(result.current.documentosErrorMessage).toBeNull();
  });
});
