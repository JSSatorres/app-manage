"use client"

import { useQuery } from "@/hooks/useQuery"
import { queryKeys } from "@/hooks/queryKeys"
import {
  fetchContentAssets,
  type ContentAssetsFilters,
  type ContentAssetsPagination,
  type ContentAssetsCatalog,
} from "@/services/content-assets.service"

export interface UseContentAssetsOptions extends ContentAssetsFilters {
  pagination?: ContentAssetsPagination
}

export function useContentAssets(
  workspaceId: string | null,
  {
    provider = null,
    sedeId = null,
    assetIds,
    pagination,
  }: UseContentAssetsOptions = {},
) {
  const baseQueryKey = queryKeys.contentAssets.list(
    workspaceId,
    provider,
    sedeId,
    pagination ?? null,
  )
  const queryKey = assetIds ? [...baseQueryKey, assetIds] : baseQueryKey
  const query = useQuery<ContentAssetsCatalog>(
    () =>
      workspaceId
        ? fetchContentAssets(
            workspaceId,
            { provider, sedeId, assetIds },
            pagination,
          )
        : Promise.resolve({
            data: { assets: [], hasProviderDataInWorkspace: false },
            error: null,
            count: null,
          }),
    queryKey,
  )

  return {
    ...query,
    assets: query.data?.assets ?? [],
    hasProviderDataInWorkspace: query.data?.hasProviderDataInWorkspace ?? false,
  }
}
