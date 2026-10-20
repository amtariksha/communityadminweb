'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Units & Users › Pet Setup (UNIT-35): GET / PATCH /tenant-settings/pets and
 * the register's count, GET /pets/stats. An API without the routes (before
 * the UNIT-35 deploy) answers 404: the queries resolve to `null` and the
 * page says "not available yet".
 */
export interface PetSettings {
  /** Residents may add, edit and remove their unit's pets. */
  enabled: boolean;
  /** The society's pet rules (basic rich text); null when there are none. */
  agreement: string | null;
}

export interface PetStats {
  units_with_pets: number;
  active_pets: number;
}

/** The API's limit on the sanitised agreement. */
export const PET_AGREEMENT_MAX = 20_000;

export const petKeys = {
  settings: ['tenant-settings', 'pets'] as const,
  stats: ['pets', 'stats'] as const,
};

async function orNull<T>(read: () => Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await read()).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function usePetSettings() {
  return useQuery({
    queryKey: petKeys.settings,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchPetSettings(): Promise<PetSettings | null> {
      return orNull(() => api.get<{ data: PetSettings }>('/tenant-settings/pets'));
    },
  });
}

export function usePetStats() {
  return useQuery({
    queryKey: petKeys.stats,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchPetStats(): Promise<PetStats | null> {
      return orNull(() => api.get<{ data: PetStats }>('/pets/stats'));
    },
  });
}

export function useSavePetSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function savePetSettings(changes: Partial<PetSettings>) {
      return api.patch<{ data: PetSettings }>('/tenant-settings/pets', changes);
    },
    onSuccess: function remember(result) {
      queryClient.setQueryData(petKeys.settings, result.data);
    },
  });
}
