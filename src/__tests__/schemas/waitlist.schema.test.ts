import { describe, expect, it } from "vitest";
import { waitlistSchema } from "@/schemas/waitlist.schema";

describe("waitlistSchema", () => {
  it("acepta un correo válido y elimina espacios exteriores", () => {
    expect(waitlistSchema.parse({ email: "  club@ejemplo.es " })).toEqual({
      email: "club@ejemplo.es",
    });
  });

  it("rechaza un correo inválido", () => {
    expect(waitlistSchema.safeParse({ email: "club" }).success).toBe(false);
  });
});
