import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';

/** GET / PATCH /tenant-settings/gate (GATE-03). */
export interface GateSettings {
  overstay_threshold_minutes: number;
}

export const OVERSTAY_MINUTES_MIN = 15;
export const OVERSTAY_MINUTES_MAX = 1440;

export const gateSettingsKeys = {
  all: ['gate-settings'] as const,
  current: (tenantId: string) => [...gateSettingsKeys.all, tenantId] as const,
};

/**
 * The society's gate settings. `null` when the API does not have the route
 * yet (404), so the screen can say "not available yet" instead of failing.
 */
export function useGateSettings() {
  const tenantId = getCurrentTenant() ?? '';
  return useQuery({
    queryKey: gateSettingsKeys.current(tenantId),
    enabled: tenantId !== '',
    queryFn: async function fetchGateSettings(): Promise<GateSettings | null> {
      try {
        const res = await api.get<{ data: GateSettings }>('/tenant-settings/gate');
        return res.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useUpdateGateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function updateGateSettings(changes: Partial<GateSettings>) {
      return api.patch<{ data: GateSettings }>('/tenant-settings/gate', changes);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: gateSettingsKeys.all });
    },
  });
}
