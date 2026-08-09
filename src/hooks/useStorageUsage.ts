"use client"

import { useQuery } from "@/hooks/useQuery"
import {
  fetchStorageUsage,
  type StorageUsageData,
} from "@/services/storage-usage.service"

const storageUsageKey = (workspaceId: string | null) =>
  ["storage-usage", workspaceId] as const

export function useStorageUsage(workspaceId: string | null) {
  const query = useQuery<StorageUsageData>(
    () =>
      workspaceId
        ? fetchStorageUsage(workspaceId)
        : Promise.resolve({ data: null, error: null }),
    storageUsageKey(workspaceId),
  )

  return {
    ...query,
    usage: query.data?.usage ?? null,
    includedCapacityBytes: query.data?.includedCapacityBytes ?? 0,
    entitlements: query.data?.entitlements ?? [],
    upgrades: query.data?.upgrades ?? [],
  }
}
