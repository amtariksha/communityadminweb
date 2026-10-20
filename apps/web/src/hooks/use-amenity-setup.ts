'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { amenityKeys } from './use-amenities';

/**
 * Amenity & Event › Setup grids saved whole (SB-08): an amenity's named,
 * priced slots (AMEN-20). An API from before them answers 404; the screens
 * then say "not available yet".
 */

export interface AmenitySlotSetting {
  id: string;
  amenity_id: string;
  name: string | null;
  /** Decimal string; null = the amenity's rate. */
  cost: string | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  display_order: number | null;
}

export interface AmenitySlotRowInput {
  id?: string;
  name: string | null;
  cost: number | null;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export const amenitySetupKeys = {
  slots: (amenityId: string) => [...amenityKeys.all, 'slot-setup', amenityId] as const,
};

export function useAmenitySlotSettings(amenityId: string) {
  return useQuery({
    queryKey: amenitySetupKeys.slots(amenityId),
    queryFn: () => api.get<{ data: AmenitySlotSetting[] }>(`/amenities/${amenityId}/slots/all`).then((res) => res.data),
    enabled: amenityId !== '',
    retry: false,
  });
}

export function useSaveAmenitySlots(amenityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: AmenitySlotRowInput[]) =>
      api.put<{ data: AmenitySlotSetting[] }>(`/amenities/${amenityId}/slots/bulk`, { rows }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}
