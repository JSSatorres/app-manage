import {
  createClient,
  type ReconciliationClient,
  type ReconciliationResult,
} from "npm:@supabase/supabase-js@2"

interface StorageObjectObservation {
  path: string
  size_bytes: number
}

interface SentryEvent {
  outcome: string
  workspaceId?: string
  assetId?: string
  provider?: string
  status?: string
  errorCode?: string
}

const JSON_HEADERS = { "content-type": "application/json" }
const STORAGE_PAGE_SIZE = 1_000

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

async function matchesSecret(received: string | null, expected: string) {
  if (!received) return false
  const encoder = new TextEncoder()
  const [receivedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ])
  const receivedBytes = new Uint8Array(receivedDigest)
  const expectedBytes = new Uint8Array(expectedDigest)
  return receivedBytes.length === expectedBytes.length
    && receivedBytes.every((byte, index) => byte === expectedBytes[index])
}

async function captureSentryEvent(event: SentryEvent) {
  const dsn = Deno.env.get("SENTRY_DSN")
  if (!dsn) return

  try {
    const dsnUrl = new URL(dsn)
    const projectId = dsnUrl.pathname.split("/").filter(Boolean).at(-1)
    if (!projectId || !dsnUrl.username) return

    const level = event.errorCode ? "warning" : "info"
    const data = {
      ...(event.workspaceId ? { workspace_id: event.workspaceId } : {}),
      ...(event.assetId ? { asset_id: event.assetId } : {}),
      ...(event.provider ? { provider: event.provider } : {}),
      ...(event.status ? { status: event.status } : {}),
      ...(event.errorCode ? { error_code: event.errorCode } : {}),
    }
    const envelope = [
      JSON.stringify({ sent_at: new Date().toISOString() }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({
        event_id: crypto.randomUUID().replaceAll("-", ""),
        timestamp: Date.now() / 1_000,
        platform: "javascript",
        level,
        message: "document_asset_reconciliation",
        tags: {
          outcome: event.outcome,
          ...(event.provider ? { provider: event.provider } : {}),
          ...(event.status ? { status: event.status } : {}),
        },
        extra: data,
        breadcrumbs: [{ category: "document_assets.reconciliation", level, message: event.outcome, data }],
      }),
      "",
    ].join("\n")

    await fetch(`${dsnUrl.origin}/api/${projectId}/envelope/?sentry_key=${dsnUrl.username}`, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
    })
  } catch {
    // La telemetría no debe impedir la conciliación ni revelar la configuración de Sentry.
  }
}

async function listStorageObjects(
  supabase: ReconciliationClient,
): Promise<StorageObjectObservation[]> {
  const observations: StorageObjectObservation[] = []

  for (let from = 0; ; from += STORAGE_PAGE_SIZE) {
    const { data, error } = await supabase
      .schema("storage")
      .from("objects")
      .select("name,metadata")
      .eq("bucket_id", "documentos")
      .order("name", { ascending: true })
      .range(from, from + STORAGE_PAGE_SIZE - 1)

    if (error) throw new Error("STORAGE_OBJECTS_LIST_FAILED")
    for (const object of data ?? []) {
      const size = Number(object.metadata?.size)
      if (object.name && Number.isSafeInteger(size) && size >= 0) {
        observations.push({ path: object.name, size_bytes: size })
      }
    }
    if ((data ?? []).length < STORAGE_PAGE_SIZE) return observations
  }
}

async function reconcile(
  supabase: ReconciliationClient,
  objects: StorageObjectObservation[],
  deletedAssetIds: string[] = [],
): Promise<ReconciliationResult> {
  const { data, error } = await supabase.rpc("reconcile_document_asset_metadata", {
    p_storage_objects: objects,
    p_deleted_asset_ids: deletedAssetIds,
  })
  if (error || !data) throw new Error("RECONCILIATION_RPC_FAILED")
  return data
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" })

  const jobSecret = Deno.env.get("RECONCILE_DOCUMENT_ASSETS_JOB_SECRET")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  if (!jobSecret || !serviceRoleKey || !supabaseUrl) return response(503, { error: "job_not_configured" })
  if (!await matchesSecret(request.headers.get("x-reconciliation-secret"), jobSecret)) {
    return response(401, { error: "unauthorized" })
  }

  const supabase: ReconciliationClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const firstObjects = await listStorageObjects(supabase)
    const firstResult = await reconcile(supabase, firstObjects)
    const deletedAssetIds: string[] = []

    for (const asset of firstResult.deleting_assets) {
      const { error } = await supabase.storage.from("documentos").remove([asset.storage_path])
      if (error) {
        await captureSentryEvent({
          outcome: "delete_retry_failed",
          assetId: asset.asset_id,
          provider: "supabase_storage",
          status: "deleting",
          errorCode: "STORAGE_DELETE_FAILED",
        })
        continue
      }
      deletedAssetIds.push(asset.asset_id)
    }

    const finalObjects = deletedAssetIds.length > 0 ? await listStorageObjects(supabase) : firstObjects
    const finalResult = deletedAssetIds.length > 0
      ? await reconcile(supabase, finalObjects, deletedAssetIds)
      : firstResult

    await captureSentryEvent({
      outcome: "reconciliation_completed",
      provider: "supabase_storage",
      status: "completed",
    })
    return response(200, {
      run_id: finalResult.run_id,
      expired_reservations: finalResult.expired_reservations,
      deleted_assets: finalResult.deleted_assets,
      usage_adjustments: finalResult.usage_adjustments,
      pending_deletions: finalResult.deleting_assets.length - deletedAssetIds.length,
    })
  } catch {
    await captureSentryEvent({
      outcome: "reconciliation_failed",
      provider: "supabase_storage",
      status: "failed",
      errorCode: "RECONCILIATION_FAILED",
    })
    return response(500, { error: "reconciliation_failed" })
  }
})
