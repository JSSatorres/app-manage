import { requireWorkspaceAdmin } from "@/lib/apiAuth";
import { calculateOutstandingMinor } from "@/lib/economia";
import { getServerEnv } from "@/lib/serverEnv";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";

type CheckoutPayload = {
  workspaceId?: unknown;
  entryId?: unknown;
};

const activeAttemptStatuses = ["created", "open", "processing"];

function statusFromError(error: unknown): number {
  if (!error || typeof error !== "object" || !("status" in error)) return 500;
  const status = error.status;
  return status === 401 || status === 403 ? status : 500;
}

function readPayload(payload: unknown): { workspaceId: string; entryId: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as CheckoutPayload;
  return typeof candidate.workspaceId === "string" && typeof candidate.entryId === "string"
    ? { workspaceId: candidate.workspaceId, entryId: candidate.entryId }
    : null;
}

export async function POST(request: Request) {
  let payload: { workspaceId: string; entryId: string } | null = null;
  try {
    payload = readPayload(await request.json());
  } catch {
    return Response.json({ error: "La solicitud de pago no es válida." }, { status: 400 });
  }
  if (!payload) return Response.json({ error: "La solicitud de pago no es válida." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(request, payload.workspaceId);
  } catch (error) {
    return Response.json({ error: "No tienes permiso para generar este enlace de pago." }, { status: statusFromError(error) });
  }

  const supabase = getSupabaseServiceClient();
  const { data: entry, error: entryError } = await supabase
    .from("economic_entries")
    .select("id,workspace_id,entry_type,lifecycle,amount_minor,currency_code")
    .eq("id", payload.entryId)
    .eq("workspace_id", payload.workspaceId)
    .maybeSingle();
  if (entryError) return Response.json({ error: "No se ha podido consultar el cargo." }, { status: 502 });
  if (!entry) return Response.json({ error: "El cargo no pertenece al club activo." }, { status: 403 });
  if (entry.entry_type !== "player_charge" || entry.lifecycle !== "open") {
    return Response.json({ error: "Solo se pueden cobrar cargos abiertos de jugadores." }, { status: 422 });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("economic_settings")
    .select("currency_code")
    .eq("workspace_id", payload.workspaceId)
    .maybeSingle();
  if (settingsError) return Response.json({ error: "No se ha podido comprobar la moneda del club." }, { status: 502 });
  if (!settings || settings.currency_code !== entry.currency_code) {
    return Response.json({ error: "La moneda del cargo no coincide con la configuración del club." }, { status: 409 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("stripe_connected_accounts")
    .select("id,workspace_id,stripe_account_id,status")
    .eq("workspace_id", payload.workspaceId)
    .maybeSingle();
  if (connectionError) return Response.json({ error: "No se ha podido comprobar la cuenta Stripe." }, { status: 502 });
  if (!connection || connection.status !== "active") {
    return Response.json({ error: "La cuenta Stripe del club no está activa." }, { status: 409 });
  }

  const { data: movements, error: movementsError } = await supabase
    .from("economic_movements")
    .select("movement_type,external_status,amount_minor,currency_code")
    .eq("workspace_id", payload.workspaceId)
    .eq("entry_id", entry.id);
  if (movementsError) return Response.json({ error: "No se ha podido calcular el saldo pendiente." }, { status: 502 });

  let outstandingMinor: number;
  try {
    outstandingMinor = calculateOutstandingMinor(
      { amountMinor: entry.amount_minor, currencyCode: entry.currency_code },
      (movements ?? []).map((movement) => ({
        movementType: movement.movement_type === "settlement" || movement.movement_type === "refund" || movement.movement_type === "reversal"
          ? movement.movement_type
          : "settlement",
        externalStatus: movement.external_status === "pending" || movement.external_status === "succeeded" || movement.external_status === "failed" || movement.external_status === "cancelled"
          ? movement.external_status
          : "failed",
        amountMinor: movement.amount_minor,
        currencyCode: movement.currency_code,
      })),
    );
  } catch {
    return Response.json({ error: "Los movimientos del cargo no son consistentes." }, { status: 409 });
  }
  if (outstandingMinor <= 0) return Response.json({ error: "El cargo ya no tiene saldo pendiente." }, { status: 409 });

  const { data: existingAttempt, error: attemptLookupError } = await supabase
    .from("stripe_payment_attempts")
    .select("id,workspace_id,entry_id,stripe_connected_account_id,amount_minor,currency_code,idempotency_key,checkout_session_id,status")
    .eq("workspace_id", payload.workspaceId)
    .eq("entry_id", entry.id)
    .in("status", activeAttemptStatuses)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptLookupError) return Response.json({ error: "No se ha podido preparar el intento de pago." }, { status: 502 });

  let attempt = existingAttempt;
  let createdAttempt = false;
  if (!attempt) {
    const { data, error } = await supabase
      .from("stripe_payment_attempts")
      .insert({
        workspace_id: payload.workspaceId,
        entry_id: entry.id,
        stripe_connected_account_id: connection.id,
        amount_minor: outstandingMinor,
        currency_code: entry.currency_code,
        status: "created",
      })
      .select("id,workspace_id,entry_id,stripe_connected_account_id,amount_minor,currency_code,idempotency_key,checkout_session_id,status")
      .single();
    if (error || !data) return Response.json({ error: "No se ha podido crear el intento de pago." }, { status: 502 });
    attempt = data;
    createdAttempt = true;
  }

  if (attempt.workspace_id !== payload.workspaceId || attempt.entry_id !== entry.id || attempt.stripe_connected_account_id !== connection.id) {
    return Response.json({ error: "El intento de pago no corresponde al club activo." }, { status: 409 });
  }
  if (attempt.amount_minor !== outstandingMinor || attempt.currency_code !== entry.currency_code) {
    return Response.json({ error: "El saldo del cargo ha cambiado; vuelve a generar el enlace." }, { status: 409 });
  }

  const stripe = getStripe();
  try {
    const session = attempt.checkout_session_id
      ? await stripe.checkout.sessions.retrieve(attempt.checkout_session_id, {}, { stripeAccount: connection.stripe_account_id })
      : await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: entry.currency_code.toLowerCase(),
            unit_amount: outstandingMinor,
            product_data: { name: "Cargo del club" },
          },
        }],
        metadata: {
          workspace_id: payload.workspaceId,
          entry_id: entry.id,
          attempt_id: attempt.id,
        },
        success_url: `${getServerEnv().appUrl}/economia?checkout=processing`,
        cancel_url: `${getServerEnv().appUrl}/economia?checkout=cancelled`,
      }, {
        stripeAccount: connection.stripe_account_id,
        idempotencyKey: attempt.idempotency_key,
      });

    if (!session.url) throw new Error("Checkout session URL missing");
    const { error: updateError } = await supabase
      .from("stripe_payment_attempts")
      .update({ checkout_session_id: session.id, status: attempt.status === "processing" ? "processing" : "open" })
      .eq("id", attempt.id)
      .eq("workspace_id", payload.workspaceId);
    if (updateError) return Response.json({ error: "No se ha podido guardar el enlace de pago." }, { status: 502 });
    return Response.json({ url: session.url }, { status: createdAttempt ? 201 : 200 });
  } catch {
    return Response.json({ error: "No se ha podido generar el enlace de pago." }, { status: 502 });
  }
}
