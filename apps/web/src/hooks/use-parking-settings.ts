'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Parking Setup (PARK-10, PARK-08): GET / PATCH /tenant-settings/parking
 * over `settings_json.parking`. Every member reads it; the society's admins
 * write it. An API without the route (before the PARK-10 deploy) answers 404:
 * the query then resolves to `null` and screens say "not available yet".
 */
export interface ParkingSettings {
  residents_can_add_vehicle: boolean;
  residents_can_edit_vehicle: boolean;
  /** Name of the register's extra field; blank hides the column and the field. */
  vehicle_additional_field_label: string;
}

export const PARKING_LABEL_MAX = 40;

export const parkingSettingsKey = ['tenant-settings', 'parking'] as const;

export function useParkingSettings() {
  return useQuery({
    queryKey: parkingSettingsKey,
    queryFn: async function fetchParkingSettings(): Promise<ParkingSettings | null> {
      try {
        return (await api.get<{ data: ParkingSettings }>('/tenant-settings/parking')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

/** The extra field's label, or '' while it is blank, loading or not available. */
export function useAdditionalFieldLabel(): string {
  return useParkingSettings().data?.vehicle_additional_field_label?.trim() ?? '';
}

export function useSaveParkingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveParkingSettings(changes: Partial<ParkingSettings>) {
      return api.patch<{ data: ParkingSettings }>('/tenant-settings/parking', changes);
    },
    onSuccess: function remember(result) {
      queryClient.setQueryData(parkingSettingsKey, result.data);
    },
  });
}
