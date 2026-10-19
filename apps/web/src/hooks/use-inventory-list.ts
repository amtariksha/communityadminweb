'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Material, StockLog } from './use-inventory';

/** An item with the value of its stock (ASSET-09); absent from an older API. */
export type MaterialListRow = Material & { total_cost?: string };

export interface MaterialListFilters {
  search?: string;
  page: number;
  limit: number;
}

export type StockMovement = StockLog & { created_by_name?: string | null };

/** The query string of the stock book and its export, without the page. */
export function materialListParams(filters: Pick<MaterialListFilters, 'search'>): Record<string, string> {
  return filters.search ? { search: filters.search } : {};
}

/** One page of the stock book, searched on the server (ASSET-09). */
export function useMaterialList(filters: MaterialListFilters) {
  return useQuery({
    queryKey: ['inventory', 'materials', 'page', filters] as const,
    queryFn: () =>
      api.get<{ data: MaterialListRow[]; total?: number }>('/inventory/materials', {
        params: { ...materialListParams(filters), page: String(filters.page), limit: String(filters.limit) },
      }),
    placeholderData: keepPreviousData,
  });
}

/** An item's movements within From · To (ASSET-S12). */
export function useMaterialMovements(materialId: string, range: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['inventory', 'stock-logs', materialId, range] as const,
    queryFn: () => {
      const params: Record<string, string> = { materialId };
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      return api.get<{ data: StockMovement[] }>('/inventory/stock-logs', { params }).then((res) => res.data);
    },
    enabled: materialId !== '',
  });
}

export interface MovementInput {
  material_id: string;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  log_date?: string;
  reference_id?: string;
  notes?: string;
}

/** Add / Remove on one item (ASSET-S11). */
export function useAddRemoveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MovementInput) => api.post<{ data: StockLog }>('/inventory/stock-logs', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'stock-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'materials'] });
    },
  });
}
