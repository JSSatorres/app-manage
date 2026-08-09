import { z } from "zod";

const idSchema = z.string().uuid("Identificador invÃ¡lido.");

export const sesionBloqueSchema = z.object({
  titulo: z.string().trim().min(1, "El tÃ­tulo es obligatorio.").max(120),
  duracionMinutos: z.number().int("La duraciÃ³n debe ser un nÃºmero entero.").positive("La duraciÃ³n debe ser positiva."),
  ejercicioId: idSchema,
  documentoId: idSchema.nullable(),
  orden: z.number().int("El orden debe ser un nÃºmero entero.").min(1, "El orden debe empezar en 1."),
});

export const sesionBloquesSchema = z.array(sesionBloqueSchema).min(1, "AÃ±ade al menos un bloque.").superRefine((bloques, context) => {
  bloques.forEach((bloque, index) => {
    if (bloque.orden !== index + 1) {
      context.addIssue({
        code: "custom",
        path: [index, "orden"],
        message: "El orden de los bloques debe ser continuo desde 1.",
      });
    }
  });
});

export type SesionBloqueInput = z.infer<typeof sesionBloqueSchema>;
