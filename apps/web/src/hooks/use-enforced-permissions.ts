'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type PermissionAction = 'read' | 'write' | 'delete';

/** A grid resource and the actions some API route checks (SB-15). */
export interface EnforcedResource {
  resource: string;
  actions: PermissionAction[];
}

export function useEnforcedPermissions() {
  return useQuery({
    queryKey: ['rbac', 'permissions', 'enforced'] as const,
    // An API without the route answers 404: the grid then offers every
    // cell, as it always did.
    meta: { suppressToast: true },
    retry: false,
    staleTime: Infinity,
    queryFn: function fetchEnforced() {
      return api.get<{ data: EnforcedResource[] }>('/rbac/permissions/enforced').then(function unwrap(res) {
        return res.data;
      });
    },
  });
}
