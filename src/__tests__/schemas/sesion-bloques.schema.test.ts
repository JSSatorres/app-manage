import { describe, expect, it } from "vitest";
import { sesionBloqueSchema, sesionBloquesSchema } from "@/schemas/sesion-bloques.schema";
import { normalizarOrdenBloques, sumarDuracionBloques } from "@/lib/sesionBloques";

const bloqueValido = {
  titulo: "  Activación con balón  ",
  duracionMinutos: 10,
  ejercicioId: "f7d730a1-e2c8-4a83-b90c-6b0de9791c60",
  documentoId: null,
  notas: null,
  orden: 1,
};

describe("sesionBloqueSchema", () => {
  it("recorta el título y admite Documento nulo", () => {
    expect(sesionBloqueSchema.parse(bloqueValido)).toMatchObject({
      titulo: "Activación con balón",
      documentoId: null,
    });
  });

  it.each([0, -1, 10.5])("rechaza duración no entera y positiva: %s", (duracionMinutos) => {
    expect(
      sesionBloqueSchema.safeParse({ ...bloqueValido, duracionMinutos }).success,
    ).toBe(false);
  });

  it("admite un bloque sin ejercicio, sin recurso y sin notas", () => {
    expect(
      sesionBloqueSchema.safeParse({
        ...bloqueValido,
        ejercicioId: null,
        documentoId: null,
        notas: null,
      }).success,
    ).toBe(true);
  });

  it("admite los tres contenidos a la vez y recorta las notas", () => {
    expect(
      sesionBloqueSchema.parse({
        ...bloqueValido,
        documentoId: "9a1f0c2e-7b3d-4a5e-8f6c-1d2e3f4a5b6c",
        notas: "  Insistir en el primer toque  ",
      }),
    ).toMatchObject({ notas: "Insistir en el primer toque" });
  });

  it("rechaza notas por encima de 2000 caracteres", () => {
    expect(
      sesionBloqueSchema.safeParse({ ...bloqueValido, notas: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("sesionBloquesSchema", () => {
  it("exige un bloque y Ã³rdenes continuos desde 1", () => {
    expect(sesionBloquesSchema.safeParse([]).success).toBe(false);
    expect(
      sesionBloquesSchema.safeParse([
        bloqueValido,
        { ...bloqueValido, titulo: "Final", orden: 3 },
      ]).success,
    ).toBe(false);
  });

  it("admite ejercicios repetidos y suma la duraciÃ³n de la composiciÃ³n", () => {
    const bloques = [
      { ...bloqueValido, titulo: "Inicio", duracionMinutos: 10 },
      { ...bloqueValido, titulo: "Desarrollo", duracionMinutos: 20, orden: 2 },
      { ...bloqueValido, titulo: "Vuelta", duracionMinutos: 5, orden: 3 },
    ];

    expect(sesionBloquesSchema.safeParse(bloques).success).toBe(true);
    expect(sumarDuracionBloques(bloques)).toBe(35);
  });

  it("normaliza el orden sin cambiar el resto del bloque", () => {
    expect(
      normalizarOrdenBloques([
        { ...bloqueValido, titulo: "Segundo", orden: 7 },
        { ...bloqueValido, titulo: "Primero", orden: 2 },
      ]),
    ).toEqual([
      { ...bloqueValido, titulo: "Segundo", orden: 1 },
      { ...bloqueValido, titulo: "Primero", orden: 2 },
    ]);
  });
});
