'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * Announcements › Setup (ANN-04 / ANN-07). Each query is `null` on a server
 * without the route yet (404), so the page says "not available yet".
 */
export type AnnouncementChannel = 'push' | 'email' | 'sms_general';

export interface AnnouncementRightsRow {
  user_id: string;
  name: string | null;
  roles: string[];
  approval_level: number;
  can_approve: boolean;
  can_set_expiry: boolean;
}

export const announcementSetupKeys = {
  all: ['announcement-setup'] as const,
  rights: () => [...announcementSetupKeys.all, 'rights'] as const,
  channels: () => [...announcementSetupKeys.all, 'channels'] as const,
};

async function orNull<T>(load: () => Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await load()).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function useAnnouncementRights(enabled = true) {
  return useQuery({
    queryKey: announcementSetupKeys.rights(),
    meta: { suppressToast: true },
    retry: false,
    enabled,
    queryFn: () => orNull(() => api.get<{ data: AnnouncementRightsRow[] }>('/announcements/setup/rights')),
  });
}

export function useSaveAnnouncementRights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<{ user_id: string; can_approve?: boolean; can_set_expiry?: boolean }>) =>
      api.put<{ data: AnnouncementRightsRow[] }>('/announcements/setup/rights', { rows }).then((res) => res.data),
    onSuccess(rows) {
      queryClient.setQueryData(announcementSetupKeys.rights(), rows);
      queryClient.invalidateQueries({ queryKey: ['approver-grid'] });
    },
  });
}

export function useAnnouncementChannels(enabled = true) {
  return useQuery({
    queryKey: announcementSetupKeys.channels(),
    meta: { suppressToast: true },
    retry: false,
    enabled,
    queryFn: () =>
      orNull(() => api.get<{ data: { default_channels: AnnouncementChannel[] } }>('/announcements/setup/channels')),
  });
}

export function useSaveAnnouncementChannels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channels: AnnouncementChannel[]) =>
      api
        .put<{ data: { default_channels: AnnouncementChannel[] } }>('/announcements/setup/channels', {
          default_channels: channels,
        })
        .then((res) => res.data),
    onSuccess(data) {
      queryClient.setQueryData(announcementSetupKeys.channels(), data);
    },
  });
}
