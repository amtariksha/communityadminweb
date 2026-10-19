'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unitKeys } from '@/hooks/use-units';
import { unitBillingCategoryKeys } from '@/hooks/use-unit-billing-categories';

/** One unit's billing inputs on Track Units › Unit (INC-37). NUMERIC areas arrive as strings. */
export interface TrackUnitRow {
  id: string;
  unit_number: string;
  block: string | null;
  is_active: boolean;
  billing_category_id: string | null;
  area_sqft: string | null;
  garden_area: string | null;
  primary_contact_name: string | null;
  /** Nothing ever referred to it: Delete is offered (INC-49). */
  deletable?: boolean;
}

export interface TrackUnitList {
  data: TrackUnitRow[];
  totals: { units: number; total_sqft1: number; total_sqft2: number };
}

export interface TrackUnitSaveRow {
  id: string;
  billing_category_id: string | null;
  area_sqft: number | null;
  garden_area: number | null;
}

export interface TrackUnitSaveResult {
  updated: string[];
  /** `{ "rows.2.area_sqft": ["…"] }` for the rows sent that were not saved. */
  errors: Record<string, string[]>;
}

export const trackUnitKeys = {
  all: [...unitKeys.all, 'track'] as const,
  list: (block: string | null) => [...trackUnitKeys.all, 'list', block] as const,
  unused: () => [...trackUnitKeys.all, 'unused'] as const,
};

const quiet = { meta: { suppressToast: true }, retry: false } as const;

export function useTrackUnits(block: string | null) {
  return useQuery({
    queryKey: trackUnitKeys.list(block),
    queryFn: () => api.get<TrackUnitList>('/units/billing-attributes', { params: block ? { block } : {} }),
    ...quiet,
  });
}

export function useSaveTrackUnits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: TrackUnitSaveRow[]) =>
      api.put<{ data: TrackUnitSaveResult }>('/units/billing-attributes', { rows }).then((res) => res.data),
    // Returned, so the save resolves once the grid's fresh rows are in.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: unitKeys.all }),
        queryClient.invalidateQueries({ queryKey: unitBillingCategoryKeys.all }),
      ]),
  });
}

export function useUnusedUnits(enabled: boolean) {
  return useQuery({
    queryKey: trackUnitKeys.unused(),
    queryFn: () => api.get<{ data: TrackUnitRow[] }>('/units/unused').then((res) => res.data),
    enabled,
    ...quiet,
  });
}

export function useDeleteUnusedUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitId: string) => api.delete<{ data: { id: string; unit_number: string } }>(`/units/${unitId}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
      queryClient.invalidateQueries({ queryKey: unitBillingCategoryKeys.all });
    },
  });
}
