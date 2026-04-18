'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface RegularVisitor {
  id: string;
  tenant_id: string;
  unit_id: string;
  unit_number?: string;
  added_by: string;
  name: string;
  visitor_type: string;
  phone: string | null;
  photo_url: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  schedule_note: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegularVisitorFilters {
  unit_id?: string;
  visitor_type?: string;
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export const regularVisitorKeys = {
  all: ['regular-visitors'] as const,
  list: (filters?: RegularVisitorFilters) =>
    [...regularVisitorKeys.all, 'list', filters] as const,
  detail: (id: string) => [...regularVisitorKeys.all, 'detail', id] as const,
};

function toParams(
  filters?: RegularVisitorFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.visitor_type) params.visitor_type = filters.visitor_type;
  if (filters.q) params.q = filters.q;
  if (typeof filters.is_active === 'boolean') {
    params.is_active = String(filters.is_active);
  }
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

export function useRegularVisitors(filters?: RegularVisitorFilters) {
  return useQuery({
    queryKey: regularVisitorKeys.list(filters),
    queryFn: function fetchRegularVisitors() {
      return api.get<{ data: RegularVisitor[]; total: number }>(
        '/regular-visitors',
        { params: toParams(filters) },
      );
    },
  });
}

export function useDeactivateRegularVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function deactivate(id: string) {
      return api.patch<{ data: RegularVisitor }>(
        `/regular-visitors/${id}/deactivate`,
      );
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: regularVisitorKeys.all });
    },
  });
}
