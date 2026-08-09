import "server-only";

import { getSupabaseServerClient } from "@/services/supabase-server";

export type WorkspaceAdminContext = {
  userId: string;
  workspaceId: string;
  role: "admin" | "superadmin";
};

export class ApiAuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function requireWorkspaceAdmin(
  request: Request,
  workspaceId: string,
): Promise<WorkspaceAdminContext> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new ApiAuthError(401, "Missing bearer token");
  }

  const supabase = getSupabaseServerClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user) {
    throw new ApiAuthError(401, "Invalid bearer token");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    (membership.role !== "admin" && membership.role !== "superadmin")
  ) {
    throw new ApiAuthError(403, "Workspace admin access required");
  }

  return { userId: user.id, workspaceId, role: membership.role };
}
