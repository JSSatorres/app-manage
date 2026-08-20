import { describe, expect, it } from "vitest";
import {
  getBloqueEtiqueta,
  getSesionBloquesSignature,
  mapSesionDetalleToBloquesDraft,
  sumarDuracionBloques,
} from "@/lib/sesionBloques";
import { sesionBloquesSchema } from "@/schemas/sesion-bloques.schema";

const detalleLegacy = {
  id: "4e1ff6a9-5bd5-4ebd-98a7-bd4f430df45a",
  ejercicioId: "f7d730a1-e2c8-4a83-b90c-6b0de9791c60",
  orden: 4,
  tiempoEjecucion: 15,
  titulo: "Rondo de cinco",
  tiempoDescanso: 2,
  varianteAplicada: "Dos toques",
};

describe("mapSesionDetalleToBloquesDraft", () => {
  it("conserva orden y convierte el detalle en un borrador sin descanso ni variante", () => {
    expect(mapSesionDetalleToBloquesDraft([detalleLegacy])).toEqual([
      {
        id: detalleLegacy.id,
        ejercicioId: detalleLegacy.ejercicioId,
        orden: detalleLegacy.orden,
        titulo: detalleLegacy.titulo,
        duracionMinutos: detalleLegacy.tiempoEjecucion,
        documentoId: null,
        notas: null,
      },
    ]);
  });

  it("deja invÃ¡lido el borrador legacy si falta la duraciÃ³n", () => {
    const bloques = mapSesionDetalleToBloquesDraft([
      { ...detalleLegacy, tiempoEjecucion: null },
    ]);

    expect(sesionBloquesSchema.safeParse(bloques).success).toBe(false);
  });

  it("inicializa las notas a null al migrar un detalle legado", () => {
    const [draft] = mapSesionDetalleToBloquesDraft([
      { id: "l1", ejercicioId: null, orden: 1, tiempoEjecucion: 10, titulo: "Inicio" },
    ]);
    expect(draft).toMatchObject({ documentoId: null, notas: null });
  });
});

describe("getSesionBloquesSignature", () => {
  const bloques = [
    { id: "bloque-1", orden: 1, duracionMinutos: 10 },
    { id: "bloque-2", orden: 2, duracionMinutos: 20 },
  ];

  it("es estable cuando id, orden y duraciÃ³n no cambian", () => {
    expect(getSesionBloquesSignature(bloques)).toBe(getSesionBloquesSignature([...bloques]));
  });

  it("cambia al aÃ±adir, eliminar, reordenar o modificar minutos", () => {
    const firma = getSesionBloquesSignature(bloques);

    expect(getSesionBloquesSignature([...bloques, { id: "bloque-3", orden: 3, duracionMinutos: 5 }])).not.toBe(firma);
    expect(getSesionBloquesSignature([bloques[0]])).not.toBe(firma);
    expect(getSesionBloquesSignature([{ ...bloques[0], orden: 2 }, { ...bloques[1], orden: 1 }])).not.toBe(firma);
    expect(getSesionBloquesSignature([{ ...bloques[0], duracionMinutos: 11 }, bloques[1]])).not.toBe(firma);
  });
});

describe("sumarDuracionBloques", () => {
  it("ignora las duraciones nulas", () => {
    expect(
      sumarDuracionBloques([
        { duracionMinutos: 10 },
        { duracionMinutos: null },
        { duracionMinutos: 5 },
      ]),
    ).toBe(15);
  });

  it("devuelve 0 cuando ningún bloque tiene duración", () => {
    expect(sumarDuracionBloques([{ duracionMinutos: null }])).toBe(0);
  });
});

describe("getBloqueEtiqueta", () => {
  it("usa el título cuando existe", () => {
    expect(getBloqueEtiqueta({ titulo: "  Calentamiento  ", orden: 2 })).toBe("Calentamiento");
  });

  it("cae a «Bloque N» cuando el título está vacío o es nulo", () => {
    expect(getBloqueEtiqueta({ titulo: null, orden: 3 })).toBe("Bloque 3");
    expect(getBloqueEtiqueta({ titulo: "   ", orden: 1 })).toBe("Bloque 1");
  });
});
