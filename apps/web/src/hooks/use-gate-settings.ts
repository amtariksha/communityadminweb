import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';

/** The guard-app switches, `gate_settings` (GATE-40); null = off. */
export interface GateSwitches {
  capture_vehicle_details: boolean;
  block_visitor_photos: boolean;
  unit_checkin_alert_threshold: number | null;
  auto_checkout_hours: number | null;
  /** GATE-43; absent from an API that predates the lock. */
  investigator_lock?: boolean;
  /** GATE-46: an image of ours under every visitor pass; absent from an older API. */
  pass_footer_image_url?: string | null;
}

/**
 * GET / PATCH /tenant-settings/gate (GATE-03, GATE-40). `gate_settings` is
 * missing from an API that predates GATE-40; the screens say "not
 * available yet" for those blocks.
 */
export interface GateSettings {
  overstay_threshold_minutes: number;
  gate_settings?: GateSwitches;
}

/** What a PATCH may name: the threshold, and any switches. */
export interface GateSettingsChanges {
  overstay_threshold_minutes?: number;
  gate_settings?: Partial<GateSwitches>;
}

export const CHECKIN_ALERT_MAX = 99;
export const AUTO_CHECKOUT_HOURS_MAX = 48;

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
    mutationFn: function updateGateSettings(changes: GateSettingsChanges) {
      return api.patch<{ data: GateSettings }>('/tenant-settings/gate', changes);
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: gateSettingsKeys.all });
    },
  });
}
