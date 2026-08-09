import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}))

import * as Sentry from "@sentry/nextjs"
import { recordDocumentAssetReconciliation } from "@/lib/documentAssetTelemetry"

describe("documentAssetTelemetry", () => {
  beforeEach(() => vi.clearAllMocks())

  it("emite un breadcrumb y evento con identificadores opacos para un ajuste", () => {
    recordDocumentAssetReconciliation({
      outcome: "usage_adjusted",
      workspaceId: "4c6b65f6-0c5d-4200-a047-6ebc0f3fb3ee",
      assetId: "cd8f01a4-16bd-4bd1-bc7d-5a124cdd600a",
      provider: "supabase_storage",
      status: "ready",
    })

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: "document_assets.reconciliation",
      level: "info",
      message: "usage_adjusted",
      data: {
        workspace_id: "4c6b65f6-0c5d-4200-a047-6ebc0f3fb3ee",
        asset_id: "cd8f01a4-16bd-4bd1-bc7d-5a124cdd600a",
        provider: "supabase_storage",
        status: "ready",
      },
    })
    expect(Sentry.captureMessage).toHaveBeenCalledWith("document_asset_reconciliation", {
      level: "info",
      tags: {
        outcome: "usage_adjusted",
        provider: "supabase_storage",
        status: "ready",
      },
      extra: {
        workspace_id: "4c6b65f6-0c5d-4200-a047-6ebc0f3fb3ee",
        asset_id: "cd8f01a4-16bd-4bd1-bc7d-5a124cdd600a",
      },
    })
  })

  it("omite datos sensibles y clasifica los fallos como warning", () => {
    recordDocumentAssetReconciliation({
      outcome: "delete_retry_failed",
      workspaceId: "workspace-opaque",
      provider: "supabase_storage",
      status: "deleting",
      errorCode: "STORAGE_DELETE_FAILED",
      signedUrl: "https://example.supabase.co/storage/v1/object/sign/documentos/private?token=secret",
      storagePath: "workspace/private-reglamento.pdf",
    })

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      level: "warning",
      data: {
        workspace_id: "workspace-opaque",
        provider: "supabase_storage",
        status: "deleting",
        error_code: "STORAGE_DELETE_FAILED",
      },
    }))
    expect(Sentry.captureMessage).toHaveBeenCalledWith("document_asset_reconciliation", expect.objectContaining({
      level: "warning",
      extra: {
        workspace_id: "workspace-opaque",
      },
    }))

    expect(JSON.stringify(vi.mocked(Sentry.addBreadcrumb).mock.calls)).not.toContain("secret")
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain("reglamento")
  })
})
