import type Stripe from "stripe";
import { requireWorkspaceAdmin } from "@/lib/apiAuth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";
import type { Database } from "@/types/database.types";

type StripeConnectionRow = Database["public"]["Tables"]["stripe_connected_accounts"]["Row"];

const STANDARD_FULL_CONTROLLER = {
  fees: { payer: "account" },
  losses: { payments: "stripe" },
  requirement_collection: "stripe",
  stripe_dashboard: { type: "full" },
} as const;

function getStatus(account: Pick<Stripe.Account, "details_submitted" | "charges_enabled" | "payouts_enabled" | "requirements">): "pending" | "restricted" | "active" | "disabled" {
  if (account.requirements?.disabled_reason) return "disabled";
  if (account.charges_enabled && account.payouts_enabled) return "active";
  if ((account.requirements?.currently_due?.length ?? 0) > 0 || account.details_submitted) return "restricted";
  return "pending";
}

function serializeConnection(connection: StripeConnectionRow) {
  return {
    id: connection.id,
    workspaceId: connection.workspace_id,
    stripeAccountId: connection.stripe_account_id,
    status: connection.status,
    detailsSubmitted: connection.details_submitted,
    chargesEnabled: connection.charges_enabled,
    payoutsEnabled: connection.payouts_enabled,
    lastSyncedAt: connection.last_synced_at,
  };
}

function getWorkspaceId(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("workspaceId" in value)) return null;
  const workspaceId = value.workspaceId;
  return typeof workspaceId === "string" && workspaceId.trim() ? workspaceId : null;
}

function errorResponse(error: unknown): Response {
  if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
    const message = "message" in error && typeof error.message === "string" ? error.message : "No autorizado.";
    return Response.json({ error: message }, { status: error.status });
  }
  return Response.json({ error: "No se ha podido configurar Stripe." }, { status: 502 });
}

function connectionData(account: Stripe.Account, workspaceId: string) {
  return {
    workspace_id: workspaceId,
    stripe_account_id: account.id,
    dashboard_access: "full",
    controller_configuration: {
      feesPayer: account.controller?.fees?.payer ?? "account",
      lossesPayments: account.controller?.losses?.payments ?? "stripe",
      requirementCollection: account.controller?.requirement_collection ?? "stripe",
      stripeDashboardType: account.controller?.stripe_dashboard?.type ?? "full",
    },
    details_submitted: account.details_submitted,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    status: getStatus(account),
    last_synced_at: new Date().toISOString(),
  } satisfies Database["public"]["Tables"]["stripe_connected_accounts"]["Insert"];
}

async function findConnection(workspaceId: string) {
  const supabase = getSupabaseServiceClient();
  return supabase
    .from("stripe_connected_accounts")
    .select("id,workspace_id,stripe_account_id,dashboard_access,controller_configuration,details_submitted,charges_enabled,payouts_enabled,status,last_synced_at,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceId(new URL(request.url).searchParams.get("workspaceId") ? {
    workspaceId: new URL(request.url).searchParams.get("workspaceId"),
  } : null);
  if (!workspaceId) return Response.json({ error: "workspaceId es obligatorio." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(request, workspaceId);
    const { data, error } = await findConnection(workspaceId);
    if (error) throw error;
    return Response.json({ connection: data ? serializeConnection(data) : null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  const workspaceId = getWorkspaceId(payload);
  if (!workspaceId) return Response.json({ error: "workspaceId es obligatorio." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(request, workspaceId);
    const existing = await findConnection(workspaceId);
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ connection: serializeConnection(existing.data) });

    const stripe = getStripe();
    const accounts = await stripe.accounts.list({ limit: 100 });
    const reconciledAccount = accounts.data.find(
      (account) => account.metadata?.workspace_id === workspaceId,
    );
    const account = reconciledAccount ?? await stripe.accounts.create({
      metadata: { workspace_id: workspaceId },
      controller: STANDARD_FULL_CONTROLLER,
    });
    const { data, error } = await getSupabaseServiceClient()
      .from("stripe_connected_accounts")
      .insert(connectionData(account, workspaceId))
      .select("id,workspace_id,stripe_account_id,dashboard_access,controller_configuration,details_submitted,charges_enabled,payouts_enabled,status,last_synced_at,created_at,updated_at")
      .single();
    if (error || !data) throw error ?? new Error("No se ha podido guardar la cuenta conectada.");

    return Response.json({ connection: serializeConnection(data) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
