'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { amenitySettingsFrom, type UpdateAmenitySettingsInput } from '@communityos/shared';
import { api } from '@/lib/api';
import { amenityKeys } from './use-amenities';

/**
 * Amenity & Event › Setup grids saved whole (SB-08): an amenity's named,
 * priced slots (AMEN-20) and its add-ons (AMEN-42). An API from before them
 * answers 404; the screens then say "not available yet" or hide them.
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

/** AMEN-42 — an add-on a paid amenity sells with a booking. */
export interface AmenityAddon {
  id: string;
  amenity_id: string;
  name: string;
  max_units: number;
  /** Decimal string. */
  unit_cost: string;
  is_active: boolean;
  display_order: number | null;
}

export interface AmenityAddonRowInput {
  id?: string;
  name: string;
  max_units: number;
  unit_cost: number;
  is_active: boolean;
}

const addonKeys = {
  all: (amenityId: string) => [...amenityKeys.all, 'addon-setup', amenityId] as const,
  offered: (amenityId: string) => [...amenityKeys.all, 'addons', amenityId] as const,
};

/** Every add-on of the amenity, retired ones included (the Setup grid). */
export function useAmenityAddonSettings(amenityId: string) {
  return useQuery({
    queryKey: addonKeys.all(amenityId),
    queryFn: () => api.get<{ data: AmenityAddon[] }>(`/amenities/${amenityId}/addons/all`).then((res) => res.data),
    enabled: amenityId !== '',
    retry: false,
  });
}

/** The add-ons on offer (the booking form); empty on an older API. */
export function useAmenityAddons(amenityId: string) {
  return useQuery({
    queryKey: addonKeys.offered(amenityId),
    queryFn: () => api.get<{ data: AmenityAddon[] }>(`/amenities/${amenityId}/addons`).then((res) => res.data),
    enabled: amenityId !== '',
    retry: false,
  });
}

export function useSaveAmenityAddons(amenityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: AmenityAddonRowInput[]) =>
      api.put<{ data: AmenityAddon[] }>(`/amenities/${amenityId}/addons`, { rows }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

/**
 * AMEN-41 / AMEN-45 — Setup › Restrictions and Setup Notifications:
 * GET / PATCH /tenant-settings/amenity (the stored values over the defaults).
 */
const settingsKey = ['tenant-settings', 'amenity'] as const;

export function useAmenitySettings() {
  return useQuery({
    queryKey: settingsKey,
    queryFn: () =>
      api.get<{ data: unknown }>('/tenant-settings/amenity').then((res) => amenitySettingsFrom(res.data)),
    retry: false,
  });
}

export function useSaveAmenitySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: UpdateAmenitySettingsInput) =>
      api.patch<{ data: unknown }>('/tenant-settings/amenity', change).then((res) => amenitySettingsFrom(res.data)),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKey, saved);
    },
  });
}
