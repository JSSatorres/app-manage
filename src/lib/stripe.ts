import "server-only";

import Stripe from "stripe";

import { getServerEnv } from "@/lib/serverEnv";

const STRIPE_API_VERSION = "2026-07-29.dahlia";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const { stripeSecretKey } = getServerEnv();
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return stripeClient;
}

export async function verifyStripeTestMode(): Promise<void> {
  const stripe = getStripe();
  await stripe.accounts.retrieve(null);
  const balance = await stripe.balance.retrieve();
  if (balance.livemode) {
    throw new Error("Stripe account must be in test mode");
  }
}
