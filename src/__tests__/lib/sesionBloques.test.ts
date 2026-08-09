import { describe, expect, it } from "vitest";
import { getSesionBloquesSignature, mapSesionDetalleToBloquesDraft } from "@/lib/sesionBloques";
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
      },
    ]);
  });

  it("deja invÃ¡lido el borrador legacy si falta la duraciÃ³n", () => {
    const bloques = mapSesionDetalleToBloquesDraft([
      { ...detalleLegacy, tiempoEjecucion: null },
    ]);

    expect(sesionBloquesSchema.safeParse(bloques).success).toBe(false);
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
