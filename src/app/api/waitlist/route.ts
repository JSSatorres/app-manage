import { Resend } from "resend";
import { waitlistSchema } from "@/schemas/waitlist.schema";

const WAITLIST_RECIPIENT = "admin@satorus.es";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Introduce un correo válido." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return Response.json(
      { error: "La lista de espera no está disponible en este momento." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: WAITLIST_RECIPIENT,
    replyTo: parsed.data.email,
    subject: "Nueva solicitud de lista de espera · Satorus",
    text: `Nueva solicitud para la lista de espera de SportApp.\n\nCorreo: ${parsed.data.email}`,
  });

  if (error) {
    return Response.json(
      { error: "No se ha podido enviar la solicitud. Inténtalo de nuevo." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
