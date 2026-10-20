'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isNotDeployed } from '@/lib/not-deployed';

// Under the assets key (`assetKeys.all`), so asset writes refresh it too.
const ASSETS = ['assets'] as const;

/** ASSET-19 — straight line or written-down value. */
export type DepreciationMethod = 'slm' | 'wdv';

/** ASSET-16 — one of the society's asset categories (`GET /assets/categories`). */
export interface AssetCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  /** The fixed asset type it stands for (`elevator`), or null for the society's own. */
  legacy_type: string | null;
  depreciation_method: DepreciationMethod | null;
  depreciation_rate: string | null;
  useful_life_years: number | null;
  residual_percent: string;
  /** Active assets in it; a category in use cannot be retired. */
  active_assets: number;
}

/** PUT /assets/categories/bulk rows: the whole list in grid order. */
export interface AssetCategoryGridRow {
  id?: string;
  name: string;
  is_active: boolean;
  depreciation_method?: DepreciationMethod | null;
  depreciation_rate?: number | null;
  useful_life_years?: number | null;
  residual_percent?: number;
}

export const assetCategoryKeys = {
  all: [...ASSETS, 'categories'] as const,
  list: (includeInactive: boolean) => [...assetCategoryKeys.all, includeInactive] as const,
};

/** The society's categories; active ones unless `includeInactive` (the Setup grid). */
export function useAssetCategories(includeInactive = false) {
  return useQuery({
    queryKey: assetCategoryKeys.list(includeInactive),
    queryFn: () =>
      api
        .get<{ data: AssetCategory[] }>('/assets/categories', { params: includeInactive ? { include_inactive: 'true' } : undefined })
        .then((res) => res.data),
    retry: (count, error) => !isNotDeployed(error) && count < 2,
    staleTime: 60_000,
  });
}

export function useSaveAssetCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: AssetCategoryGridRow[]) =>
      api.put<{ data: AssetCategory[] }>('/assets/categories/bulk', { rows }).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ASSETS });
    },
  });
}

/** "+ Add Asset Category" (VEND-S8): one more active category. */
export function useAddAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<{ data: AssetCategory }>('/assets/categories', { name }).then((res) => res.data),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: assetCategoryKeys.all });
    },
  });
}

/** A choice of category for a select: its id and name. */
export interface CategoryChoice {
  value: string;
  label: string;
  /** The fixed type sent too, for an API without categories. */
  legacyType: string | null;
}

/**
 * The categories a form or filter offers: the society's own when the API
 * has them, else today's fixed types (an API older than ASSET-16), whose
 * value is the type itself.
 */
export function categoryChoices(
  categories: readonly AssetCategory[] | undefined,
  fixedTypes: ReadonlyArray<{ value: string; label: string }>,
): { choices: CategoryChoice[]; byId: boolean } {
  if (categories) {
    return { choices: categories.map((category) => ({ value: category.id, label: category.name, legacyType: category.legacy_type })), byId: true };
  }
  return { choices: fixedTypes.map((type) => ({ value: type.value, label: type.label, legacyType: type.value })), byId: false };
}
