import type Stripe from "stripe";
import { requireWorkspaceAdmin } from "@/lib/apiAuth";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";
import type { Database } from "@/types/database.types";

type StripeConnectionRow = Database["public"]["Tables"]["stripe_connected_accounts"]["Row"];

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

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return Response.json({ error: "workspaceId es obligatorio." }, { status: 400 });

  try {
    await requireWorkspaceAdmin(request, workspaceId);
    const supabase = getSupabaseServiceClient();
    const { data: connection, error } = await supabase
      .from("stripe_connected_accounts")
      .select("id,workspace_id,stripe_account_id,dashboard_access,controller_configuration,details_submitted,charges_enabled,payouts_enabled,status,last_synced_at,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!connection) return Response.json({ connection: null });

    const account = await getStripe().accounts.retrieve(connection.stripe_account_id);
    const { data: updated, error: updateError } = await supabase
      .from("stripe_connected_accounts")
      .update({
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        status: getStatus(account),
        last_synced_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("stripe_account_id", connection.stripe_account_id)
      .select("id,workspace_id,stripe_account_id,dashboard_access,controller_configuration,details_submitted,charges_enabled,payouts_enabled,status,last_synced_at,created_at,updated_at")
      .single();
    if (updateError || !updated) throw updateError ?? new Error("No se ha podido actualizar el estado.");

    return Response.json({ connection: serializeConnection(updated) });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
      const message = "message" in error && typeof error.message === "string" ? error.message : "No autorizado.";
      return Response.json({ error: message }, { status: error.status });
    }
    return Response.json({ error: "No se ha podido consultar el estado de Stripe." }, { status: 502 });
  }
}
