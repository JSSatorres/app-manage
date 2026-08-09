export type StripeAttemptStatus = "processing" | "succeeded" | "failed" | "expired";
export type StripeRefundStatus = "pending" | "succeeded" | "failed" | "cancelled";

type CheckoutSessionSnapshot = {
  status: string | null;
};

type PaymentIntentSnapshot = {
  status: string;
};

export function resolveStripePaymentState(
  session: CheckoutSessionSnapshot,
  paymentIntent: PaymentIntentSnapshot,
): StripeAttemptStatus {
  if (paymentIntent.status === "succeeded") return "succeeded";
  if (session.status === "expired") return "expired";
  if (paymentIntent.status === "processing" || paymentIntent.status === "requires_capture") return "processing";
  return "failed";
}

export function getStripeSettlementReference(paymentIntentId: string): string {
  return `stripe:${paymentIntentId}`;
}

export function resolveStripeRefundState(refund: { status: string | null }): StripeRefundStatus {
  if (refund.status === "succeeded") return "succeeded";
  if (refund.status === "failed") return "failed";
  if (refund.status === "canceled") return "cancelled";
  return "pending";
}

export function getStripeRefundReference(refundId: string): string {
  return `stripe:refund:${refundId}`;
}
