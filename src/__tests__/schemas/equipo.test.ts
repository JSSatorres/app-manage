import { describe, it, expect } from "vitest";
import { createEquipoSchema, updateEquipoSchema } from "@/schemas/equipo.schema";

/**
 * Cobertura de src/schemas/equipo.schema.ts (Task 4.2).
 * Cross-check: src/services/equipos.service.ts (createEquipo hace
 * insert({ nombre, categoria, sede_id }) + syncPivots(entrenadorIds, jugadorIds))
 * y src/components/equipos/EquipoForm.tsx (usa createEquipoSchema tal cual).
 *
 * Nota (sin arreglar, solo reportado): `EquipoCreateInput`/`EquipoUpdateInput`
 * (src/types/equipos.ts) declaran `workspaceId: string` como requerido, pero
 * `createEquipoSchema` no tiene ese campo y `createEquipo`/`updateEquipo` tampoco
 * lo insertan/actualizan en la tabla `equipos`. No es un bug funcional (el schema
 * sí valida exactamente lo que el servicio inserta), pero el tipo de dominio y el
 * schema no coinciden campo a campo.
 */

const SEDE_ID = "11111111-1111-4111-8111-111111111111";
const ENTRENADOR_ID = "22222222-2222-4222-8222-222222222222";
const JUGADOR_ID = "33333333-3333-4333-8333-333333333333";

describe("createEquipoSchema · alineado con lo que inserta createEquipo + syncPivots", () => {
  const validInput = {
    nombre: "Alevín A",
    categoria: "Alevín",
    sedeId: SEDE_ID,
    entrenadorIds: [ENTRENADOR_ID],
    jugadorIds: [JUGADOR_ID],
  };

  it("acepta la forma completa (nombre, categoria, sedeId, entrenadorIds, jugadorIds)", () => {
    expect(createEquipoSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta categoria nula y listas vacías por defecto", () => {
    const result = createEquipoSchema.safeParse({
      nombre: "Infantil B",
      categoria: null,
      sedeId: SEDE_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entrenadorIds).toEqual([]);
      expect(result.data.jugadorIds).toEqual([]);
    }
  });

  it("rechaza si falta el nombre (mín. 2 caracteres)", () => {
    const withoutNombre = {
      categoria: validInput.categoria,
      sedeId: validInput.sedeId,
      entrenadorIds: validInput.entrenadorIds,
      jugadorIds: validInput.jugadorIds,
    };
    expect(createEquipoSchema.safeParse(withoutNombre).success).toBe(false);
  });

  it("rechaza si falta sedeId (requerido)", () => {
    const withoutSedeId = {
      nombre: validInput.nombre,
      categoria: validInput.categoria,
      entrenadorIds: validInput.entrenadorIds,
      jugadorIds: validInput.jugadorIds,
    };
    expect(createEquipoSchema.safeParse(withoutSedeId).success).toBe(false);
  });

  it("rechaza sedeId que no es uuid", () => {
    const result = createEquipoSchema.safeParse({ ...validInput, sedeId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });

  it("rechaza entrenadorIds con un elemento que no es uuid", () => {
    const result = createEquipoSchema.safeParse({ ...validInput, entrenadorIds: ["no-es-uuid"] });
    expect(result.success).toBe(false);
  });
});

describe("updateEquipoSchema · alias de createEquipoSchema", () => {
  it("es el mismo schema que createEquipoSchema (misma forma exigida)", () => {
    expect(updateEquipoSchema).toBe(createEquipoSchema);
  });

  it("acepta la misma forma válida que create", () => {
    const result = updateEquipoSchema.safeParse({
      nombre: "Cadete A",
      categoria: "Cadete",
      sedeId: SEDE_ID,
      entrenadorIds: [],
      jugadorIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza si falta el nombre", () => {
    const result = updateEquipoSchema.safeParse({ sedeId: SEDE_ID });
    expect(result.success).toBe(false);
  });
});
