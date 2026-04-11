'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { tenantKeys } from './use-tenants';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tenantFeatureKeys = {
  all: ['tenant-features'] as const,
  enabled: () => [...tenantFeatureKeys.all, 'enabled'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useEnabledFeatures() {
  return useQuery({
    queryKey: tenantFeatureKeys.enabled(),
    queryFn: function fetchEnabledFeatures() {
      return api.get<{ data: string[] }>('/tenants/features');
    },
    select: (response) => response.data,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdateFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateFeatures(params: {
      tenantId: string;
      features: string[];
    }) {
      return api.patch<{ data: string[] }>(
        `/tenants/${params.tenantId}/features`,
        { features: params.features },
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: tenantFeatureKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: tenantKeys.detail(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKeys.lists(),
      });
    },
  });
}
