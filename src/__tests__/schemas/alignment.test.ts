import { describe, it, expect } from "vitest";
import { createSesionSchema } from "@/schemas/sesion.schema";
import { createJugadorSchema } from "@/schemas/jugador.schema";
import { createEntrenadorSchema } from "@/schemas/entrenador.schema";

/**
 * Contrato: los schemas Zod de `create*` deben validar exactamente la forma
 * que el servicio realmente inserta (`*CreateInput`), no una forma legacy.
 * Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md Task 1.2.
 */

describe("createSesionSchema · alineado con SesionCreateInput (camelCase + entrenadorIds array)", () => {
  const validInput = {
    fecha: "2026-07-12",
    equipoId: "11111111-1111-4111-8111-111111111111",
    entrenadorIds: ["22222222-2222-4222-8222-222222222222"],
    estado: "Borrador",
  };

  it("acepta entrenadorIds como array de uuids (forma que inserta createSesion)", () => {
    const result = createSesionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("acepta varios entrenadores en entrenadorIds", () => {
    const result = createSesionSchema.safeParse({
      ...validInput,
      entrenadorIds: [
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza entrenadorIds vacío (se exige al menos un entrenador)", () => {
    const result = createSesionSchema.safeParse({ ...validInput, entrenadorIds: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza si falta entrenadorIds", () => {
    const withoutEntrenadorIds = {
      fecha: validInput.fecha,
      equipoId: validInput.equipoId,
      estado: validInput.estado,
    };
    const result = createSesionSchema.safeParse(withoutEntrenadorIds);
    expect(result.success).toBe(false);
  });

  it("rechaza equipoId en snake_case (equipo_id ya no es válido)", () => {
    const result = createSesionSchema.safeParse({
      fecha: validInput.fecha,
      equipo_id: validInput.equipoId,
      entrenadorIds: validInput.entrenadorIds,
      estado: validInput.estado,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza entrenadorIds con un elemento que no es uuid", () => {
    const result = createSesionSchema.safeParse({ ...validInput, entrenadorIds: ["no-es-uuid"] });
    expect(result.success).toBe(false);
  });
});

describe("createJugadorSchema · alineado con JugadorCreateInput (workspaceId requerido)", () => {
  const validInput = {
    nombre: "Ana",
    workspaceId: "44444444-4444-4444-8444-444444444444",
    sedeIds: ["55555555-5555-4555-8555-555555555555"],
  };

  it("acepta workspaceId uuid (requerido por createJugador)", () => {
    const result = createJugadorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rechaza si falta workspaceId", () => {
    const withoutWorkspaceId = { nombre: validInput.nombre, sedeIds: validInput.sedeIds };
    const result = createJugadorSchema.safeParse(withoutWorkspaceId);
    expect(result.success).toBe(false);
  });

  it("rechaza workspaceId que no es uuid", () => {
    const result = createJugadorSchema.safeParse({ ...validInput, workspaceId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("createEntrenadorSchema · alineado con EntrenadorCreateInput (workspaceId requerido)", () => {
  const validInput = {
    nombre: "Carlos",
    workspaceId: "66666666-6666-4666-8666-666666666666",
    sedeIds: ["77777777-7777-4777-8777-777777777777"],
  };

  it("acepta workspaceId uuid (requerido por createEntrenador)", () => {
    const result = createEntrenadorSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rechaza si falta workspaceId", () => {
    const withoutWorkspaceId = { nombre: validInput.nombre, sedeIds: validInput.sedeIds };
    const result = createEntrenadorSchema.safeParse(withoutWorkspaceId);
    expect(result.success).toBe(false);
  });

  it("rechaza workspaceId que no es uuid", () => {
    const result = createEntrenadorSchema.safeParse({ ...validInput, workspaceId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});
