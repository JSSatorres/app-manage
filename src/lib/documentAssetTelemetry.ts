import * as Sentry from "@sentry/nextjs"

type ReconciliationOutcome =
  | "reservation_expired"
  | "orphan_object_detected"
  | "usage_adjusted"
  | "delete_completed"
  | "delete_retry_failed"

interface DocumentAssetReconciliationTelemetry {
  outcome: ReconciliationOutcome
  workspaceId: string
  assetId?: string
  provider?: string
  status?: string
  errorCode?: string
  signedUrl?: string
  storagePath?: string
}

export function recordDocumentAssetReconciliation({
  outcome,
  workspaceId,
  assetId,
  provider,
  status,
  errorCode,
}: DocumentAssetReconciliationTelemetry) {
  const level = errorCode ? "warning" : "info"
  const data = {
    workspace_id: workspaceId,
    ...(assetId ? { asset_id: assetId } : {}),
    ...(provider ? { provider } : {}),
    ...(status ? { status } : {}),
    ...(errorCode ? { error_code: errorCode } : {}),
  }

  Sentry.addBreadcrumb({
    category: "document_assets.reconciliation",
    level,
    message: outcome,
    data,
  })
  Sentry.captureMessage("document_asset_reconciliation", {
    level,
    tags: {
      outcome,
      ...(provider ? { provider } : {}),
      ...(status ? { status } : {}),
    },
    extra: {
      workspace_id: workspaceId,
      ...(assetId ? { asset_id: assetId } : {}),
    },
  })
}
