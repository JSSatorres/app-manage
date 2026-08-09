import { requireWorkspaceAdmin } from "@/lib/apiAuth";
import { getServerEnv } from "@/lib/serverEnv";
import { getStripe } from "@/lib/stripe";
import { getSupabaseServiceClient } from "@/services/supabase-server";

function getWorkspaceId(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("workspaceId" in value)) return null;
  const workspaceId = value.workspaceId;
  return typeof workspaceId === "string" && workspaceId.trim() ? workspaceId : null;
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
    const { data: connection, error } = await getSupabaseServiceClient()
      .from("stripe_connected_accounts")
      .select("stripe_account_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!connection) return Response.json({ error: "No hay una cuenta Stripe configurada para este club." }, { status: 404 });

    const { appUrl } = getServerEnv();
    const link = await getStripe().accountLinks.create({
      account: connection.stripe_account_id,
      type: "account_onboarding",
      refresh_url: `${appUrl}/economia?stripe=onboarding-refresh`,
      return_url: `${appUrl}/economia?stripe=onboarding-return`,
    });
    return Response.json({ url: link.url });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error.status === 401 || error.status === 403)) {
      const message = "message" in error && typeof error.message === "string" ? error.message : "No autorizado.";
      return Response.json({ error: message }, { status: error.status });
    }
    return Response.json({ error: "No se ha podido crear el enlace de onboarding." }, { status: 502 });
  }
}
