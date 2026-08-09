import { describe, expect, it } from "vitest";

import { resolveStripePaymentState } from "@/lib/stripeEvents";

describe("resolveStripePaymentState", () => {
  it("usa el estado actual del PaymentIntent y no el orden del evento", () => {
    expect(resolveStripePaymentState({ status: "complete" }, { status: "succeeded" })).toBe("succeeded");
    expect(resolveStripePaymentState({ status: "complete" }, { status: "processing" })).toBe("processing");
    expect(resolveStripePaymentState({ status: "expired" }, { status: "requires_payment_method" })).toBe("expired");
  });
});
