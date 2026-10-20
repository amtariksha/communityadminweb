'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { tenantKeys } from './use-tenants';

/** PROF-20 / 21 / 22 — GET /tenant-settings/profile. */
export interface SocietyProfile {
  name: string;
  display_name: string | null;
  logo_url: string | null;
  address: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  phone: string | null;
  builder_url: string | null;
  amenities_text: string | null;
  latitude: number | null;
  longitude: number | null;
  welcome_message_html: string | null;
  /** Six slots in order; null = empty. */
  images: Array<string | null>;
  /** PROF-40: residents are asked to accept the society's agreement (absent before that API). */
  agreement_enabled?: boolean;
}

/** PATCH /tenant-settings/profile: the keys sent are written; null clears. */
export type SocietyProfileChange = Partial<Omit<SocietyProfile, 'name' | 'display_name'>>;

export const societyProfileKeys = {
  profile: ['tenant-settings', 'profile'] as const,
};

export function useSocietyProfile() {
  return useQuery({
    queryKey: societyProfileKeys.profile,
    queryFn: function fetchSocietyProfile() {
      return api.get<{ data: SocietyProfile }>('/tenant-settings/profile').then((res) => res.data);
    },
    retry: false,
  });
}

export function useUpdateSocietyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function updateSocietyProfile(change: SocietyProfileChange) {
      return api.patch<{ data: SocietyProfile }>('/tenant-settings/profile', change).then((res) => res.data);
    },
    onSuccess(profile) {
      queryClient.setQueryData(societyProfileKeys.profile, profile);
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}
