'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** One block of the society (SB-10). `id` is null for a block found only on units. */
export interface UnitBlock {
  id: string | null;
  name: string;
  display_order: number | null;
  unit_count: number;
}

export interface UnitBlockList {
  data: UnitBlock[];
  total_units: number;
}

/** A row of PUT /unit-blocks/bulk: the whole list, in order. */
export type UnitBlockRow =
  | { id: string; name: string }
  | { from_name: string; name: string }
  | { name: string };

export const unitBlockKeys = {
  all: ['unit-blocks'] as const,
};

export function useUnitBlocks() {
  return useQuery({
    queryKey: unitBlockKeys.all,
    // Before the API has the block master it answers 404: the block links
    // hide themselves and the master page says so, without a toast.
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchUnitBlocks() {
      return api.get<UnitBlockList>('/unit-blocks');
    },
  });
}

export function useSaveUnitBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveUnitBlocks(rows: UnitBlockRow[]) {
      return api.put<UnitBlockList>('/unit-blocks/bulk', { rows });
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(unitBlockKeys.all, saved);
      // A rename rewrites the block on units.
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}
