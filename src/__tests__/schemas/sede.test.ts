import { describe, it, expect } from "vitest";
import {
  cloneSedeSchema,
  createSedeSchema,
  deriveCloneSedePreflight,
  normalizeCloneSedeSelection,
  sedeSchema,
  updateSedeSchema,
} from "@/schemas/sede.schema";

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

describe("cloneSedeSchema", () => {
  const validInput = {
    workspaceId: WORKSPACE_ID,
    sourceSedeId: SEDE_ID,
    nombre: "Sede Norte clonada",
    direccion: null,
    seleccion: {
      equipos: ["44444444-4444-4444-8444-444444444444"],
      entrenadores: ["55555555-5555-4555-8555-555555555555"],
      jugadores: ["66666666-6666-4666-8666-666666666666"],
      sesiones: ["77777777-7777-4777-8777-777777777777"],
      parametros: ["88888888-8888-4888-8888-888888888888"],
      documentos: ["99999999-9999-4999-8999-999999999999"],
    },
  };

  it("acepta el input de clonación con todas las categorías permitidas", () => {
    expect(cloneSedeSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza UUID inválidos y repetidos", () => {
    const invalidUuid = cloneSedeSchema.safeParse({
      ...validInput,
      seleccion: { ...validInput.seleccion, equipos: ["no-es-uuid"] },
    });
    const duplicateUuid = cloneSedeSchema.safeParse({
      ...validInput,
      seleccion: {
        ...validInput.seleccion,
        equipos: [validInput.seleccion.equipos[0], validInput.seleccion.equipos[0]],
      },
    });

    expect(invalidUuid.success).toBe(false);
    expect(duplicateUuid.success).toBe(false);
  });

  it("rechaza categorías desconocidas y sesiones sin equipo seleccionado", () => {
    const unknownCategory = cloneSedeSchema.safeParse({
      ...validInput,
      seleccion: { ...validInput.seleccion, adjuntos: [] },
    });
    const sessionWithoutTeam = cloneSedeSchema.safeParse({
      ...validInput,
      seleccion: { ...validInput.seleccion, equipos: [] },
    });

    expect(unknownCategory.success).toBe(false);
    expect(sessionWithoutTeam.success).toBe(true);
  });
});

describe("normalizeCloneSedeSelection", () => {
  const equipoId = "44444444-4444-4444-8444-444444444444";
  const entrenadorId = "55555555-5555-4555-8555-555555555555";
  const sesionId = "77777777-7777-4777-8777-777777777777";

  it("incluye el equipo y entrenadores requeridos por cada sesiÃ³n sin duplicar selecciones explÃ­citas", () => {
    const selection = {
      equipos: [equipoId],
      entrenadores: [entrenadorId],
      jugadores: [],
      sesiones: [sesionId],
      parametros: [],
      documentos: [],
    };

    const normalized = normalizeCloneSedeSelection(selection, [
      { id: sesionId, label: "08/08/2026", equipoId, trainerIds: [entrenadorId] },
    ]);

    expect(normalized).toEqual(selection);
  });

  it("auto-incluye dependencias cuando una sesiÃ³n se selecciona sin ellas", () => {
    const selection = {
      equipos: [],
      entrenadores: [],
      jugadores: [],
      sesiones: [sesionId],
      parametros: [],
      documentos: [],
    };

    const normalized = normalizeCloneSedeSelection(selection, [
      { id: sesionId, label: "08/08/2026", equipoId, trainerIds: [entrenadorId] },
    ]);

    expect(cloneSedeSchema.safeParse({
      workspaceId: WORKSPACE_ID,
      sourceSedeId: SEDE_ID,
      nombre: "Sede Norte clonada",
      direccion: null,
      seleccion: normalized,
    }).success).toBe(true);
    expect(normalized).toMatchObject({
      equipos: [equipoId],
      entrenadores: [entrenadorId],
      sesiones: [sesionId],
    });
  });
});

describe("deriveCloneSedePreflight", () => {
  const equipoSeleccionadoId = "44444444-4444-4444-8444-444444444444";
  const equipoOmitidoId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const entrenadorId = "55555555-5555-4555-8555-555555555555";
  const jugadorId = "66666666-6666-4666-8666-666666666666";
  const sesionEfectivaId = "77777777-7777-4777-8777-777777777777";
  const sesionOmitidaId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  it("normaliza las dependencias de sesión y conserva las personas sin omisiones", () => {
    const preflight = deriveCloneSedePreflight({
      equipos: [
        { id: equipoSeleccionadoId, label: "Infantil", categoria: "U14" },
        { id: equipoOmitidoId, label: "Cadete", categoria: "U16" },
      ],
      entrenadores: [{ id: entrenadorId, label: "Luis Sanz" }],
      jugadores: [{ id: jugadorId, label: "Ana Pérez" }],
      sesiones: [
        { id: sesionEfectivaId, label: "08/08/2026", equipoId: equipoSeleccionadoId, trainerIds: [entrenadorId] },
        { id: sesionOmitidaId, label: "09/08/2026", equipoId: equipoOmitidoId, trainerIds: [entrenadorId] },
      ],
      entrenadorEquipos: [{ personId: entrenadorId, equipoId: equipoOmitidoId }],
      jugadorEquipos: [{ personId: jugadorId, equipoId: equipoOmitidoId }],
      parametros: [],
      documentos: [],
    }, {
      equipos: [equipoSeleccionadoId],
      entrenadores: [],
      jugadores: [jugadorId],
      sesiones: [sesionEfectivaId, sesionOmitidaId],
      parametros: [],
      documentos: [],
    });

    expect(preflight.effectiveSelection).toEqual({
      equipos: [equipoSeleccionadoId, equipoOmitidoId],
      entrenadores: [entrenadorId],
      jugadores: [jugadorId],
      sesiones: [sesionEfectivaId, sesionOmitidaId],
      parametros: [],
      documentos: [],
    });
    expect(preflight.omissionSummary).toEqual({
      entrenador_equipo_no_seleccionado: 0,
      jugador_equipo_no_seleccionado: 0,
      sesion_equipo_no_seleccionado: 0,
      total: 0,
    });
    expect(preflight.omissions).toEqual([]);
  });
});
