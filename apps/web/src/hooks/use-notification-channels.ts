'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * ANN-06 — which channels the server can send. SMS stays off until the
 * provider and its DLT templates are set up; a server without the route
 * (404) is read as "no SMS", so SMS choices stay disabled and hidden.
 */
export interface NotificationChannels {
  email: boolean;
  sms: boolean;
  sms_essential: boolean;
  sms_message_max: number;
}

const NONE: NotificationChannels = { email: false, sms: false, sms_essential: false, sms_message_max: 120 };

export function useNotificationChannels(enabled = true) {
  return useQuery({
    queryKey: ['notification-channels'],
    meta: { suppressToast: true },
    retry: false,
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async function fetchChannels(): Promise<NotificationChannels> {
      try {
        const res = await api.get<{ data: NotificationChannels }>('/notifications/channels');
        return res.data;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return NONE;
        throw error;
      }
    },
  });
}
