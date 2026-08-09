import { requireWorkspaceAdmin } from "@/lib/apiAuth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";

type RefundReason = "duplicate" | "fraudulent" | "requested_by_customer";

type RefundPayload = {
  workspaceId?: unknown;
  settlementId?: unknown;
  amountMinor?: unknown;
  reason?: unknown;
};

function statusFromError(error: unknown): number {
  if (!error || typeof error !== "object" || !("status" in error)) return 500;
  const status = error.status;
  return status === 401 || status === 403 ? status : 500;
}

function isRefundReason(value: unknown): value is RefundReason {
  return value === "duplicate" || value === "fraudulent" || value === "requested_by_customer";
}

function readPayload(payload: unknown): { workspaceId: string; settlementId: string; amountMinor: number; reason: RefundReason } | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as RefundPayload;
  if (
    typeof candidate.workspaceId !== "string"
    || typeof candidate.settlementId !== "string"
    || typeof candidate.amountMinor !== "number"
    || !Number.isSafeInteger(candidate.amountMinor)
    || candidate.amountMinor <= 0
    || !isRefundReason(candidate.reason)
  ) return null;
  return {
    workspaceId: candidate.workspaceId,
    settlementId: candidate.settlementId,
    amountMinor: candidate.amountMinor,
    reason: candidate.reason,
  };
}

function getPaymentIntentId(externalReference: string | null): string | null {
  if (!externalReference?.startsWith("stripe:pi_")) return null;
  return externalReference.slice("stripe:".length);
}

export async function POST(request: Request) {
  let payload: ReturnType<typeof readPayload>;
  try {
    payload = readPayload(await request.json());
  } catch {
    return Response.json({ error: "La solicitud de reembolso no es válida." }, { status: 400 });
  }
  if (!payload) return Response.json({ error: "La solicitud de reembolso no es válida." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(request, payload.workspaceId);
  } catch (error) {
    return Response.json({ error: "No tienes permiso para solicitar este reembolso." }, { status: statusFromError(error) });
  }

  const supabase = getSupabaseServiceClient();
  const { data: settlement, error: settlementError } = await supabase
    .from("economic_movements")
    .select("id,workspace_id,entry_id,movement_type,payment_method,amount_minor,currency_code,external_status,external_reference")
    .eq("id", payload.settlementId)
    .eq("workspace_id", payload.workspaceId)
    .maybeSingle();
  if (settlementError) return Response.json({ error: "No se ha podido consultar la liquidación." }, { status: 502 });
  if (
    !settlement
    || settlement.movement_type !== "settlement"
    || settlement.payment_method !== "stripe"
    || settlement.external_status !== "succeeded"
  ) return Response.json({ error: "Solo se pueden reembolsar liquidaciones Stripe confirmadas del club activo." }, { status: 422 });

  const paymentIntentId = getPaymentIntentId(settlement.external_reference);
  if (!paymentIntentId) return Response.json({ error: "La liquidación Stripe no tiene una referencia válida." }, { status: 409 });

  const { data: attempt, error: attemptError } = await supabase
    .from("stripe_payment_attempts")
    .select("id,workspace_id,stripe_connected_account_id,payment_intent_id")
    .eq("workspace_id", payload.workspaceId)
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (attemptError) return Response.json({ error: "No se ha podido comprobar el cobro Stripe." }, { status: 502 });
  if (!attempt || attempt.payment_intent_id !== paymentIntentId) {
    return Response.json({ error: "La liquidación no corresponde a un cobro Stripe del club activo." }, { status: 409 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("stripe_connected_accounts")
    .select("id,workspace_id,stripe_account_id")
    .eq("id", attempt.stripe_connected_account_id)
    .eq("workspace_id", payload.workspaceId)
    .maybeSingle();
  if (connectionError) return Response.json({ error: "No se ha podido comprobar la cuenta Stripe." }, { status: 502 });
  if (!connection || connection.id !== attempt.stripe_connected_account_id || connection.workspace_id !== payload.workspaceId) {
    return Response.json({ error: "La liquidación no corresponde a la cuenta Stripe del club activo." }, { status: 409 });
  }

  const { data: adjustments, error: adjustmentsError } = await supabase
    .from("economic_movements")
    .select("movement_type,external_status,amount_minor")
    .eq("workspace_id", payload.workspaceId)
    .eq("original_movement_id", settlement.id);
  if (adjustmentsError) return Response.json({ error: "No se ha podido calcular el importe reembolsable." }, { status: 502 });
  const refundedMinor = (adjustments ?? []).reduce((total, adjustment) => (
    adjustment.external_status === "succeeded"
      && (adjustment.movement_type === "refund" || adjustment.movement_type === "reversal")
      ? total + adjustment.amount_minor
      : total
  ), 0);
  if (payload.amountMinor > settlement.amount_minor - refundedMinor) {
    return Response.json({ error: "El importe supera el saldo reembolsable de la liquidación." }, { status: 422 });
  }

  const stripe = getStripe();
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {}, { stripeAccount: connection.stripe_account_id });
    if (
      paymentIntent.id !== paymentIntentId
      || paymentIntent.status !== "succeeded"
      || paymentIntent.amount !== settlement.amount_minor
      || paymentIntent.currency.toUpperCase() !== settlement.currency_code
    ) throw new Error("Stripe payment intent does not match settlement");

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: payload.amountMinor,
      reason: payload.reason,
    }, {
      stripeAccount: connection.stripe_account_id,
      idempotencyKey: `refund:${settlement.id}:${payload.amountMinor}:${payload.reason}`,
    });
    return Response.json({
      refundId: refund.id,
      status: refund.status === "pending" || refund.status === "requires_action" ? "processing" : "requested",
    }, { status: 202 });
  } catch {
    return Response.json({ error: "No se ha podido solicitar el reembolso en Stripe." }, { status: 502 });
  }
}
