'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types — mirror the backend RoleDelegationService shape
// ---------------------------------------------------------------------------

export type ExpiryEnforcement =
  | 'disabled'
  | 'log_only'
  | 'filter_only'
  | 'hybrid';

// UNIT-08 — only the switches something reads: whether a supervisor sees
// their team's requests (HELP-09). The other supervisor switches were removed.
export interface SecuritySupervisorPermissions {
  security_tickets_crud: boolean;
}

export interface FacilitySupervisorPermissions {
  maintenance_tickets_crud: boolean;
}

export interface RoleDelegation {
  security_supervisor: SecuritySupervisorPermissions;
  facility_supervisor: FacilitySupervisorPermissions;
  expiry_enforcement: ExpiryEnforcement;
}

export interface RoleDelegationUpdate {
  security_supervisor?: Partial<SecuritySupervisorPermissions>;
  facility_supervisor?: Partial<FacilitySupervisorPermissions>;
  expiry_enforcement?: ExpiryEnforcement;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const roleDelegationKeys = {
  all: ['rbac', 'role-delegation'] as const,
};

// ---------------------------------------------------------------------------
// Read — GET /rbac/role-delegation
// ---------------------------------------------------------------------------

export function useRoleDelegation() {
  return useQuery({
    queryKey: roleDelegationKeys.all,
    queryFn: async (): Promise<RoleDelegation> => {
      const res = await api.get<{ data: RoleDelegation }>(
        '/rbac/role-delegation',
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // match the backend 5-min cache TTL
  });
}

// ---------------------------------------------------------------------------
// Write — PATCH /rbac/role-delegation
// ---------------------------------------------------------------------------

export function useUpdateRoleDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoleDelegationUpdate): Promise<RoleDelegation> => {
      const res = await api.patch<{ data: RoleDelegation }>(
        '/rbac/role-delegation',
        input,
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Update the cache synchronously so the UI doesn't flash back to
      // the old value while React Query re-fetches. The backend cache
      // is also invalidated server-side.
      queryClient.setQueryData(roleDelegationKeys.all, data);
    },
  });
}
