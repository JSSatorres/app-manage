import { describe, it, expect } from "vitest";
import { sedeSchema, createSedeSchema, updateSedeSchema } from "@/schemas/sede.schema";

/**
 * Cobertura de src/schemas/sede.schema.ts (Task 4.2).
 * Cross-check: src/services/sedes.service.ts (createSede/updateSede) y
 * src/components/sedes/SedeForm.tsx (usa createSedeSchema.omit({ workspace_id, responsable_id })).
 *
 * Nota (sin arreglar, solo reportado): `createSedeSchema`/`updateSedeSchema` usan
 * los campos snake_case `workspace_id`/`responsable_id`, mientras que
 * `SedeCreateInput` (src/types/sedes.ts) usa `workspaceId` (camelCase) y no tiene
 * `responsable_id`. No rompe en runtime porque `SedeForm` omite ambos campos antes
 * de validar y el `workspaceId`/`responsable_id` real se inserta aparte en el
 * servicio, pero el schema no protegería un uso directo con la forma del tipo.
 */

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const RESPONSABLE_ID = "22222222-2222-4222-8222-222222222222";
const SEDE_ID = "33333333-3333-4333-8333-333333333333";

describe("sedeSchema", () => {
  const validInput = {
    id: SEDE_ID,
    nombre: "Sede Central",
    direccion: "Calle Falsa 123",
    configuracion_visual: { color: "#000" },
    responsable_id: RESPONSABLE_ID,
    workspace_id: WORKSPACE_ID,
    created_at: "2026-07-12T10:00:00.000Z",
    updated_at: "2026-07-12T10:00:00.000Z",
  };

  it("acepta una fila completa de sede", () => {
    expect(sedeSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza si falta el nombre", () => {
    const withoutNombre = {
      id: validInput.id,
      direccion: validInput.direccion,
      configuracion_visual: validInput.configuracion_visual,
      responsable_id: validInput.responsable_id,
      workspace_id: validInput.workspace_id,
      created_at: validInput.created_at,
      updated_at: validInput.updated_at,
    };
    expect(sedeSchema.safeParse(withoutNombre).success).toBe(false);
  });

  it("rechaza id que no es uuid", () => {
    const result = sedeSchema.safeParse({ ...validInput, id: "no-es-uuid" });
    expect(result.success).toBe(false);
  });

  it("rechaza created_at con formato de fecha inválido", () => {
    const result = sedeSchema.safeParse({ ...validInput, created_at: "12-07-2026" });
    expect(result.success).toBe(false);
  });
});

describe("createSedeSchema · alineado con lo que consume SedeForm antes del omit", () => {
  const validInput = {
    nombre: "Sede Norte",
    direccion: "Avenida Siempre Viva 742",
    responsable_id: null as string | null,
    workspace_id: WORKSPACE_ID,
  };

  it("acepta la forma completa (nombre, direccion, responsable_id, workspace_id)", () => {
    expect(createSedeSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza si falta el nombre (mín. 1 carácter)", () => {
    const withoutNombre = {
      direccion: validInput.direccion,
      responsable_id: validInput.responsable_id,
      workspace_id: validInput.workspace_id,
    };
    expect(createSedeSchema.safeParse(withoutNombre).success).toBe(false);
  });

  it("rechaza si falta workspace_id (requerido)", () => {
    const withoutWorkspaceId = {
      nombre: validInput.nombre,
      direccion: validInput.direccion,
      responsable_id: validInput.responsable_id,
    };
    expect(createSedeSchema.safeParse(withoutWorkspaceId).success).toBe(false);
  });

  it("rechaza responsable_id que no es uuid", () => {
    const result = createSedeSchema.safeParse({ ...validInput, responsable_id: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("updateSedeSchema · partial sin workspace_id", () => {
  it("acepta objeto vacío (todos los campos son opcionales)", () => {
    expect(updateSedeSchema.safeParse({}).success).toBe(true);
  });

  it("acepta solo nombre", () => {
    expect(updateSedeSchema.safeParse({ nombre: "Sede Sur" }).success).toBe(true);
  });

  it("rechaza nombre vacío cuando se envía (mín. 1 carácter)", () => {
    const result = updateSedeSchema.safeParse({ nombre: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza responsable_id que no es uuid", () => {
    const result = updateSedeSchema.safeParse({ responsable_id: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});
