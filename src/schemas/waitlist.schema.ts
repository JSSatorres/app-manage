import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.string().trim().email("Introduce un correo electrónico válido."),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
