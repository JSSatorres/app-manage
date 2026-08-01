import { describe, it, expect } from "vitest";
import { createEjercicioSchema, updateEjercicioSchema } from "@/schemas/ejercicio.schema";
import {
  createDocumentoFileSchema,
  createDocumentoLinkSchema,
  updateDocumentoSchema,
} from "@/schemas/documento.schema";
import { createParametroSchema, updateParametroSchema } from "@/schemas/parametro.schema";

/**
 * Contrato: los schemas Zod de ejercicios, documentos y parámetros deben
 * validar exactamente la forma que sus servicios realmente insertan.
 * Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md Task 2.2.
 */

const SEDE_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const ENTRENADOR_ID = "44444444-4444-4444-8444-444444444444";
const EQUIPO_ID = "55555555-5555-4555-8555-555555555555";

describe("createEjercicioSchema · alineado con EjercicioCreateInput", () => {
  const validInput = {
    titulo: "Rondo 4v2",
    objetivoPrincipal: "Posesión",
    numeroJugadoresMin: 6,
    sedePropietariaId: SEDE_ID,
    esGlobal: false,
  };

  it("acepta la forma que inserta createEjercicio", () => {
    expect(createEjercicioSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta ejercicio global sin sede propietaria", () => {
    const result = createEjercicioSchema.safeParse({
      ...validInput,
      sedePropietariaId: null,
      esGlobal: true,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza si falta el título", () => {
    const withoutTitulo = {
      objetivoPrincipal: validInput.objetivoPrincipal,
      numeroJugadoresMin: validInput.numeroJugadoresMin,
      sedePropietariaId: validInput.sedePropietariaId,
      esGlobal: validInput.esGlobal,
    };
    expect(createEjercicioSchema.safeParse(withoutTitulo).success).toBe(false);
  });

  it("rechaza si falta esGlobal (requerido por createEjercicio)", () => {
    const withoutEsGlobal = {
      titulo: validInput.titulo,
      objetivoPrincipal: validInput.objetivoPrincipal,
      numeroJugadoresMin: validInput.numeroJugadoresMin,
      sedePropietariaId: validInput.sedePropietariaId,
    };
    expect(createEjercicioSchema.safeParse(withoutEsGlobal).success).toBe(false);
  });

  it("rechaza sedePropietariaId que no es uuid", () => {
    const result = createEjercicioSchema.safeParse({ ...validInput, sedePropietariaId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });

  it("rechaza numeroJugadoresMin no numérico", () => {
    const result = createEjercicioSchema.safeParse({ ...validInput, numeroJugadoresMin: "seis" });
    expect(result.success).toBe(false);
  });

  it("updateEjercicioSchema exige los mismos campos que create (EjercicioUpdateInput = EjercicioCreateInput)", () => {
    expect(updateEjercicioSchema.safeParse(validInput).success).toBe(true);
  });
});

describe("createDocumentoFileSchema · alineado con el input de uploadDocumento", () => {
  const validInput = {
    titulo: "Reglamento interno",
    categoriaDoc: "Reglamento",
    sedeId: SEDE_ID,
    sedeIds: [SEDE_ID],
    equipoIds: [EQUIPO_ID],
    workspaceId: WORKSPACE_ID,
    visibleEntrenadores: true,
    entrenadorIds: [ENTRENADOR_ID],
    file: new File(["contenido"], "reglamento.pdf", { type: "application/pdf" }),
  };

  it("acepta la forma que inserta uploadDocumento (con archivo)", () => {
    expect(createDocumentoFileSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta workspaceId nulo (documento global del workspace)", () => {
    const result = createDocumentoFileSchema.safeParse({ ...validInput, workspaceId: null });
    expect(result.success).toBe(true);
  });

  it("rechaza si falta el archivo", () => {
    const withoutFile = {
      titulo: validInput.titulo,
      categoriaDoc: validInput.categoriaDoc,
      sedeId: validInput.sedeId,
      sedeIds: validInput.sedeIds,
      equipoIds: validInput.equipoIds,
      workspaceId: validInput.workspaceId,
      visibleEntrenadores: validInput.visibleEntrenadores,
      entrenadorIds: validInput.entrenadorIds,
    };
    expect(createDocumentoFileSchema.safeParse(withoutFile).success).toBe(false);
  });

  it("rechaza si falta el título", () => {
    const withoutTitulo = {
      categoriaDoc: validInput.categoriaDoc,
      sedeId: validInput.sedeId,
      sedeIds: validInput.sedeIds,
      equipoIds: validInput.equipoIds,
      workspaceId: validInput.workspaceId,
      visibleEntrenadores: validInput.visibleEntrenadores,
      entrenadorIds: validInput.entrenadorIds,
      file: validInput.file,
    };
    expect(createDocumentoFileSchema.safeParse(withoutTitulo).success).toBe(false);
  });

  it("rechaza sedeIds con un elemento que no es uuid", () => {
    const result = createDocumentoFileSchema.safeParse({ ...validInput, sedeIds: ["no-es-uuid"] });
    expect(result.success).toBe(false);
  });
});

describe("createDocumentoLinkSchema · alineado con DocumentoLinkCreateInput", () => {
  const validInput = {
    titulo: "Vídeo táctico",
    categoriaDoc: null,
    externalUrl: "https://www.youtube.com/watch?v=abc123",
    sedeId: null,
    sedeIds: [SEDE_ID],
    equipoIds: [] as string[],
    workspaceId: WORKSPACE_ID,
    visibleEntrenadores: false,
    entrenadorIds: [] as string[],
  };

  it("acepta la forma que inserta createDocumentoLink", () => {
    expect(createDocumentoLinkSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza si falta externalUrl (requerido en un documento de tipo enlace)", () => {
    const withoutUrl = {
      titulo: validInput.titulo,
      categoriaDoc: validInput.categoriaDoc,
      sedeId: validInput.sedeId,
      sedeIds: validInput.sedeIds,
      equipoIds: validInput.equipoIds,
      workspaceId: validInput.workspaceId,
      visibleEntrenadores: validInput.visibleEntrenadores,
      entrenadorIds: validInput.entrenadorIds,
    };
    expect(createDocumentoLinkSchema.safeParse(withoutUrl).success).toBe(false);
  });

  it("rechaza externalUrl que no es una URL válida", () => {
    const result = createDocumentoLinkSchema.safeParse({ ...validInput, externalUrl: "no-es-url" });
    expect(result.success).toBe(false);
  });
});

describe("updateDocumentoSchema · alineado con DocumentoUpdateInput", () => {
  const validInput = {
    titulo: "Reglamento interno v2",
    categoriaDoc: "Reglamento",
    sedeId: SEDE_ID,
    sedeIds: [SEDE_ID],
    equipoIds: [EQUIPO_ID],
    visibleEntrenadores: true,
    entrenadorIds: [ENTRENADOR_ID],
  };

  it("acepta la forma que inserta updateDocumento (sin workspaceId ni externalUrl)", () => {
    expect(updateDocumentoSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta workspaceId y externalUrl cuando se envían (edición de un enlace)", () => {
    const result = updateDocumentoSchema.safeParse({
      ...validInput,
      workspaceId: WORKSPACE_ID,
      externalUrl: "https://vimeo.com/12345",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza si falta el título", () => {
    const withoutTitulo = {
      categoriaDoc: validInput.categoriaDoc,
      sedeId: validInput.sedeId,
      sedeIds: validInput.sedeIds,
      equipoIds: validInput.equipoIds,
      visibleEntrenadores: validInput.visibleEntrenadores,
      entrenadorIds: validInput.entrenadorIds,
    };
    expect(updateDocumentoSchema.safeParse(withoutTitulo).success).toBe(false);
  });
});

describe("createParametroSchema · alineado con ParametroSistemaCreateInput", () => {
  const validInput = {
    categoria: "notificaciones",
    nombre: "recordatorio_sesion",
    activo: true,
    sedeId: SEDE_ID,
  };

  it("acepta la forma que inserta createParametro", () => {
    expect(createParametroSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta sedeId nulo (parámetro global)", () => {
    const result = createParametroSchema.safeParse({ ...validInput, sedeId: null });
    expect(result.success).toBe(true);
  });

  it("rechaza si falta categoria", () => {
    const withoutCategoria = {
      nombre: validInput.nombre,
      activo: validInput.activo,
      sedeId: validInput.sedeId,
    };
    expect(createParametroSchema.safeParse(withoutCategoria).success).toBe(false);
  });

  it("rechaza si falta activo (requerido por createParametro)", () => {
    const withoutActivo = {
      categoria: validInput.categoria,
      nombre: validInput.nombre,
      sedeId: validInput.sedeId,
    };
    expect(createParametroSchema.safeParse(withoutActivo).success).toBe(false);
  });

  it("rechaza sedeId que no es uuid", () => {
    const result = createParametroSchema.safeParse({ ...validInput, sedeId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("updateParametroSchema · alineado con ParametroSistemaUpdateInput (sin categoria)", () => {
  const validInput = {
    nombre: "recordatorio_sesion",
    activo: false,
    sedeId: null as string | null,
  };

  it("acepta la forma que inserta updateParametro (sin categoria, que es inmutable)", () => {
    expect(updateParametroSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza si falta nombre", () => {
    const withoutNombre = { activo: validInput.activo, sedeId: validInput.sedeId };
    expect(updateParametroSchema.safeParse(withoutNombre).success).toBe(false);
  });

  it("rechaza sedeId que no es uuid", () => {
    const result = updateParametroSchema.safeParse({ ...validInput, sedeId: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});
