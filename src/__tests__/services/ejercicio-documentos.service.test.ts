import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncEjercicioDocumentos } from "@/services/ejercicio-documentos.service";
import { getSupabaseClient } from "@/services/supabase";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: vi.fn(),
}));

describe("syncEjercicioDocumentos", () => {
  beforeEach(() => {
    mocks.from.mockReset().mockReturnValue({
      delete: mocks.delete,
      insert: mocks.insert,
    });
    mocks.delete.mockReset().mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReset();
    mocks.insert.mockReset();
    vi.mocked(getSupabaseClient).mockReturnValue({ from: mocks.from } as never);
  });

  it("devuelve el error del borrado y no intenta insertar", async () => {
    const deleteError = new Error("RLS DELETE denegado");
    mocks.eq.mockResolvedValue({ error: deleteError });

    const result = await syncEjercicioDocumentos("ejercicio-1", ["documento-1"]);

    expect(result).toEqual({ data: false, error: deleteError });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("propaga el error de inserción cuando el borrado se completa", async () => {
    const insertError = new Error("RLS INSERT denegado");
    mocks.eq.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: insertError });

    const result = await syncEjercicioDocumentos("ejercicio-1", ["documento-1"]);

    expect(result).toEqual({ data: false, error: insertError });
  });
});
