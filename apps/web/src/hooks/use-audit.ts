'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: unknown;
  new_data: unknown;
  user_name: string;
  ip_address: string;
  created_at: string;
}

export interface AuditFilters {
  entity_type?: string;
  user_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const auditKeys = {
  all: ['audit'] as const,
  list: (filters?: AuditFilters) => [...auditKeys.all, 'list', filters] as const,
  entity: (type: string, id: string) => [...auditKeys.all, 'entity', type, id] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function auditFiltersToParams(
  filters?: AuditFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.entity_type) params.entity_type = filters.entity_type;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.action) params.action = filters.action;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAuditLog(filters?: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: function fetchAuditLog() {
      return api.get<PaginatedResponse<AuditEntry>>('/audit', {
        params: auditFiltersToParams(filters),
      });
    },
  });
}

export function useEntityHistory(entityType: string, entityId: string) {
  return useQuery({
    queryKey: auditKeys.entity(entityType, entityId),
    queryFn: function fetchEntityHistory() {
      return api
        .get<{ data: AuditEntry[] }>(`/audit/entity/${entityType}/${entityId}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: Boolean(entityType) && Boolean(entityId),
  });
}
