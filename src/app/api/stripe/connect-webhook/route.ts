import type Stripe from "stripe";

import { getServerEnv } from "@/lib/serverEnv";
import { getStripe } from "@/lib/stripe";
import {
  getStripeRefundReference,
  getStripeSettlementReference,
  resolveStripePaymentState,
  resolveStripeRefundState,
} from "@/lib/stripeEvents";
import { getSupabaseServiceClient } from "@/services/supabase-server";

function getEventObjectId(object: Stripe.Event.Data.Object): string | null {
  return "id" in object && typeof object.id === "string" ? object.id : null;
}

function isCheckoutEvent(eventType: string): boolean {
  return eventType === "checkout.session.completed"
    || eventType === "checkout.session.async_payment_succeeded"
    || eventType === "checkout.session.async_payment_failed"
    || eventType === "checkout.session.expired";
}

function isDisputeEvent(eventType: string): boolean {
  return eventType === "charge.dispute.created" || eventType === "charge.dispute.closed";
}

function isRefundEvent(eventType: string): boolean {
  return eventType === "charge.refunded"
    || eventType === "charge.refund.updated"
    || eventType === "refund.created"
    || eventType === "refund.updated"
    || eventType === "refund.failed";
}

function metadataValue(metadata: Stripe.Metadata | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function resourceId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function projectRefund(
  stripe: Stripe,
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  connection: { id: string; workspace_id: string; stripe_account_id: string },
  refund: Stripe.Refund,
) {
  let paymentIntentId = resourceId(refund.payment_intent);
  if (!paymentIntentId) {
    const chargeId = resourceId(refund.charge);
    if (!chargeId) throw new Error("Refund without payment intent or charge");
    const charge = await stripe.charges.retrieve(chargeId, {}, { stripeAccount: connection.stripe_account_id });
    paymentIntentId = resourceId(charge.payment_intent);
  }
  if (!paymentIntentId) throw new Error("Refund charge without payment intent");

  const { data: attempt, error: attemptError } = await supabase
    .from("stripe_payment_attempts")
    .select("id,workspace_id,stripe_connected_account_id,payment_intent_id")
    .eq("workspace_id", connection.workspace_id)
    .eq("stripe_connected_account_id", connection.id)
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (attemptError || !attempt) throw new Error("Refund payment attempt not found in connected account workspace");

  const { data: settlement, error: settlementError } = await supabase
    .from("economic_movements")
    .select("id,workspace_id,entry_id,amount_minor,currency_code")
    .eq("workspace_id", connection.workspace_id)
    .eq("movement_type", "settlement")
    .eq("payment_method", "stripe")
    .eq("external_status", "succeeded")
    .eq("external_reference", getStripeSettlementReference(paymentIntentId))
    .maybeSingle();
  if (settlementError || !settlement) throw new Error("Refund settlement not found in connected account workspace");
  if (refund.amount <= 0 || refund.amount > settlement.amount_minor || refund.currency.toUpperCase() !== settlement.currency_code) {
    throw new Error("Refund amount or currency does not match settlement");
  }

  const externalReference = getStripeRefundReference(refund.id);
  const { data: existingRefund, error: existingRefundError } = await supabase
    .from("economic_movements")
    .select("id")
    .eq("workspace_id", connection.workspace_id)
    .eq("external_reference", externalReference)
    .maybeSingle();
  if (existingRefundError) throw new Error("Refund movement lookup failed");

  const refundMovement = {
    movement_type: "refund",
    payment_method: "stripe",
    amount_minor: refund.amount,
    currency_code: settlement.currency_code,
    external_status: resolveStripeRefundState(refund),
    original_movement_id: settlement.id,
    external_reference: externalReference,
    occurred_at: new Date(refund.created * 1000).toISOString(),
  };
  if (existingRefund) {
    const { error: updateRefundError } = await supabase
      .from("economic_movements")
      .update(refundMovement)
      .eq("id", existingRefund.id)
      .eq("workspace_id", connection.workspace_id);
    if (updateRefundError) throw new Error("Refund movement update failed");
    return;
  }

  const { error: insertRefundError } = await supabase
    .from("economic_movements")
    .insert({ workspace_id: connection.workspace_id, entry_id: settlement.entry_id, ...refundMovement });
  if (insertRefundError && insertRefundError.code !== "23505") throw new Error("Refund movement insert failed");
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Firma Stripe ausente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, getServerEnv().stripeConnectWebhookSecret);
  } catch {
    return Response.json({ error: "Firma Stripe no válida." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const stripeAccountId = event.account ?? null;
  const objectId = getEventObjectId(event.data.object);
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

  if (!stripeAccountId) {
    await supabase.from("stripe_webhook_events").update({ processing_status: "ignored" }).eq("event_id", event.id);
    return Response.json({ received: true });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("stripe_connected_accounts")
    .select("id,workspace_id,stripe_account_id,status")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();
  if (connectionError) return Response.json({ error: "No se ha podido localizar la cuenta Stripe." }, { status: 502 });
  if (!connection) {
    await supabase.from("stripe_webhook_events").update({ processing_status: "ignored" }).eq("event_id", event.id);
    return Response.json({ received: true });
  }

  await supabase
    .from("stripe_webhook_events")
    .update({ workspace_id: connection.workspace_id })
    .eq("event_id", event.id);

  if (isDisputeEvent(event.type)) {
    await supabase
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        last_error: "Disputa Stripe pendiente de revisión en el dashboard.",
      })
      .eq("event_id", event.id);
    return Response.json({ received: true });
  }

  if (isRefundEvent(event.type) && objectId) {
    try {
      const stripe = getStripe();
      const refunds = event.type === "charge.refunded"
        ? (await stripe.refunds.list({ charge: objectId, limit: 100 }, { stripeAccount: stripeAccountId })).data
        : [await stripe.refunds.retrieve(objectId, {}, { stripeAccount: stripeAccountId })];
      for (const refund of refunds) {
        await projectRefund(stripe, supabase, connection, refund);
      }
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_status: "processed", processed_at: new Date().toISOString(), last_error: null })
        .eq("event_id", event.id);
      return Response.json({ received: true });
    } catch {
      await supabase
        .from("stripe_webhook_events")
        .update({ processing_status: "failed", last_error: "No se ha podido proyectar el reembolso Stripe." })
        .eq("event_id", event.id);
      return Response.json({ error: "No se ha podido procesar el reembolso Stripe." }, { status: 502 });
    }
  }

  if (!isCheckoutEvent(event.type) || !objectId) {
    await supabase.from("stripe_webhook_events").update({ processing_status: "ignored" }).eq("event_id", event.id);
    return Response.json({ received: true });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(objectId, {}, { stripeAccount: stripeAccountId });
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
    if (!paymentIntentId) throw new Error("Checkout session without payment intent");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: stripeAccountId });

    const workspaceId = metadataValue(session.metadata, "workspace_id");
    const entryId = metadataValue(session.metadata, "entry_id");
    const attemptId = metadataValue(session.metadata, "attempt_id");
    if (!workspaceId || !entryId || !attemptId || workspaceId !== connection.workspace_id) {
      throw new Error("Checkout metadata does not match the connected account");
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("stripe_payment_attempts")
      .select("id,workspace_id,entry_id,stripe_connected_account_id,amount_minor,currency_code,checkout_session_id,payment_intent_id,status")
      .eq("id", attemptId)
      .eq("workspace_id", connection.workspace_id)
      .eq("entry_id", entryId)
      .eq("stripe_connected_account_id", connection.id)
      .maybeSingle();
    if (attemptError || !attempt) throw new Error("Payment attempt not found in connected account workspace");
    if (
      (attempt.checkout_session_id && attempt.checkout_session_id !== session.id)
      || (attempt.payment_intent_id && attempt.payment_intent_id !== paymentIntent.id)
      || session.amount_total !== attempt.amount_minor
      || paymentIntent.amount !== attempt.amount_minor
      || session.currency?.toUpperCase() !== attempt.currency_code
      || paymentIntent.currency.toUpperCase() !== attempt.currency_code
    ) {
      throw new Error("Checkout amount or currency does not match the payment attempt");
    }

    const attemptStatus = resolveStripePaymentState(session, paymentIntent);
    const { error: updateAttemptError } = await supabase
      .from("stripe_payment_attempts")
      .update({
        checkout_session_id: session.id,
        payment_intent_id: paymentIntent.id,
        status: attemptStatus,
      })
      .eq("id", attempt.id)
      .eq("workspace_id", connection.workspace_id);
    if (updateAttemptError) throw new Error("Payment attempt update failed");

    if (attemptStatus === "succeeded") {
      const externalReference = getStripeSettlementReference(paymentIntent.id);
      const { error: movementError } = await supabase
        .from("economic_movements")
        .insert({
          workspace_id: connection.workspace_id,
          entry_id: attempt.entry_id,
          movement_type: "settlement",
          payment_method: "stripe",
          amount_minor: attempt.amount_minor,
          currency_code: attempt.currency_code,
          external_status: "succeeded",
          external_reference: externalReference,
          occurred_at: new Date().toISOString(),
        });
      if (movementError && movementError.code !== "23505") throw new Error("Settlement insert failed");
    }

    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString(), last_error: null })
      .eq("event_id", event.id);
    return Response.json({ received: true });
  } catch {
    await supabase
      .from("stripe_webhook_events")
      .update({ processing_status: "failed", last_error: "No se ha podido proyectar el evento Stripe." })
      .eq("event_id", event.id);
    return Response.json({ error: "No se ha podido procesar el evento Stripe." }, { status: 502 });
  }
}
