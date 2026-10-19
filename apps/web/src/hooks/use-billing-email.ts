'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Whether the server can send e-mail (public /health/email): Setup › Notifications says so when it cannot. */
export function useEmailTransport() {
  return useQuery({
    queryKey: ['health', 'email'],
    meta: { suppressToast: true },
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: function fetchEmailTransport() {
      return api.get<{ enabled: boolean; from: string }>('/health/email');
    },
  });
}
