"use client"

import { useCallback } from "react"
import { useMutation } from "@/hooks/useMutation"
import { useQuery } from "@/hooks/useQuery"
import {
  fetchStorageUpgradeRequests,
  requestStorageUpgrade,
  STORAGE_UPGRADE_CONFIRMATION_MESSAGE,
  type StorageUpgradeRequest,
  type StorageUpgradeRequestResult,
} from "@/services/storage-upgrades.service"
import type { StorageUpgradeRequestInput } from "@/schemas/storage-upgrade.schema"

type StorageUpgradeRequestDraft = Omit<StorageUpgradeRequestInput, "workspaceId">

const storageUpgradeRequestsKey = (workspaceId: string | null) =>
  ["storage-upgrades", workspaceId] as const

export function useStorageUpgrades(workspaceId: string | null) {
  const query = useQuery<StorageUpgradeRequest[]>(
    () =>
      workspaceId
        ? fetchStorageUpgradeRequests(workspaceId)
        : Promise.resolve({ data: null, error: null }),
    storageUpgradeRequestsKey(workspaceId),
  )
  const requestMutation = useMutation<
    StorageUpgradeRequestResult,
    StorageUpgradeRequestInput
  >(requestStorageUpgrade, {
    invalidateKeys: [["storage-upgrades"], ["storage-usage"]],
  })

  const requestUpgrade = useCallback(
    (input: StorageUpgradeRequestDraft) =>
      workspaceId
        ? requestMutation.mutate({ ...input, workspaceId })
        : Promise.resolve(null),
    [requestMutation, workspaceId],
  )

  return {
    ...query,
    requests: query.data ?? [],
    requestUpgrade,
    requestLoading: requestMutation.loading,
    requestErrorMessage: requestMutation.errorMessage,
    confirmationMessage: STORAGE_UPGRADE_CONFIRMATION_MESSAGE,
  }
}
