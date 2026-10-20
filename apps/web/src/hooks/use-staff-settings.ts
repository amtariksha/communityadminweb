'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Staff Manager › Setup's badge settings (STAFF-43): GET / PATCH
 * /tenant-settings/staff over `settings_json.staff_settings`. The badge
 * print reads them. An API without the route (before the STAFF-43 deploy)
 * answers 404: the query resolves to `null` and the blocks say "not
 * available yet".
 */
export interface StaffSettings {
  /** This society's upload; none prints the society name. */
  badge_header_image_url: string | null;
  badge_back_text: string;
}

export const BADGE_BACK_TEXT_MAX = 1000;

export const staffSettingsKey = ['tenant-settings', 'staff'] as const;

export function useStaffSettings() {
  return useQuery({
    queryKey: staffSettingsKey,
    queryFn: async function fetchStaffSettings(): Promise<StaffSettings | null> {
      try {
        return (await api.get<{ data: StaffSettings }>('/tenant-settings/staff')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useSaveStaffSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changes: Partial<StaffSettings>) =>
      (await api.patch<{ data: StaffSettings }>('/tenant-settings/staff', changes)).data,
    onSuccess: (saved) => queryClient.setQueryData(staffSettingsKey, saved),
  });
}
