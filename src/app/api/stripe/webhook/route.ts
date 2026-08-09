import type Stripe from "stripe";
import { getServerEnv } from "@/lib/serverEnv";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";

function getStatus(account: Pick<Stripe.Account, "details_submitted" | "charges_enabled" | "payouts_enabled" | "requirements">): "pending" | "restricted" | "active" | "disabled" {
  if (account.requirements?.disabled_reason) return "disabled";
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if ((account.requirements?.currently_due?.length ?? 0) > 0 || account.details_submitted) return "restricted";
  return "pending";
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Firma Stripe ausente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getServerEnv().stripeWebhookSecret);
  } catch {
    return Response.json({ error: "Firma Stripe no válida." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const stripeAccountId = event.account ?? null;
  const object = event.data.object;
  const objectId = "id" in object && typeof object.id === "string" ? object.id : null;
  const { error: inboxError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: event.id,
      event_type: event.type,
      stripe_account_id: stripeAccountId,
      object_id: objectId,
      processing_status: "received",
    })
    .select("id")
    .maybeSingle();
  if (inboxError?.code === "23505") return Response.json({ received: true });
  if (inboxError) return Response.json({ error: "No se ha podido registrar el evento Stripe." }, { status: 502 });

  if (event.type !== "account.updated" || !stripeAccountId || object.object !== "account") {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "ignored" })
      .eq("event_id", event.id);
    return Response.json({ received: true });
  }

  const account = object as Stripe.Account;
  const { data: connection, error: connectionError } = await supabase
    .from("stripe_connected_accounts")
    .select("workspace_id")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();
  if (connectionError) return Response.json({ error: "No se ha podido localizar la cuenta Stripe." }, { status: 502 });
  if (!connection) {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "ignored" })
      .eq("event_id", event.id);
    return Response.json({ received: true });
  }

  const { error: updateError } = await supabase
    .from("stripe_connected_accounts")
    .update({
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      status: getStatus(account),
      last_synced_at: new Date().toISOString(),
    })
    .eq("workspace_id", connection.workspace_id)
    .eq("stripe_account_id", stripeAccountId);
  if (updateError) return Response.json({ error: "No se ha podido actualizar la cuenta Stripe." }, { status: 502 });

  await supabase
    .from("stripe_webhook_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("event_id", event.id);
  return Response.json({ received: true });
}
