'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AreaTotals {
  unit_count: number;
  total_sqft1: number;
  total_sqft2: number;
}

/** A unit type for billing (INC-15) with the active units billed as it. */
export interface UnitBillingCategory extends AreaTotals {
  id: string;
  name: string;
  gst_threshold_applies: boolean;
  sort_order: number;
}

export interface UnitBillingCategoryList {
  data: UnitBillingCategory[];
  unassigned: AreaTotals;
  total: AreaTotals;
}

/** A row of PUT /unit-billing-categories: an id with a blank name removes that type. */
export interface UnitBillingCategoryRow {
  id?: string;
  name: string;
  gst_threshold_applies?: boolean;
}

export const unitBillingCategoryKeys = {
  all: ['unit-billing-categories'] as const,
};

export function useUnitBillingCategories(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: unitBillingCategoryKeys.all,
    // An API without unit types answers 404: the card says so, no toast.
    meta: { suppressToast: true },
    retry: false,
    enabled: options.enabled ?? true,
    queryFn: function fetchUnitBillingCategories() {
      return api.get<UnitBillingCategoryList>('/unit-billing-categories');
    },
  });
}

export function useSaveUnitBillingCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveUnitBillingCategories(rows: UnitBillingCategoryRow[]) {
      return api.put<UnitBillingCategoryList>('/unit-billing-categories', { rows });
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(unitBillingCategoryKeys.all, saved);
    },
  });
}
