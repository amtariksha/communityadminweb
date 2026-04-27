'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * GST slabs every tenant shares — maintained in `platform_config` by
 * the super-admin and read by every tenant-level GST input across
 * /invoices, /purchases, /settings. Falls back to the Indian standard
 * slabs if the platform_config row is missing, empty, OR if the API
 * call fails (auth blip, server restart, network).
 *
 * The try/catch + placeholderData below is critical — without them, a
 * single transient /platform-config/public/tax-rates failure left
 * every GST dropdown on the admin web with zero options. Now the
 * dropdown always shows the canonical Indian slabs first, even
 * during loading or after an error, and React Query background-fetches
 * the server's list to swap in if it differs.
 */
const FALLBACK_GST = [0, 5, 12, 18, 28];

export function useTaxRates() {
  return useQuery({
    queryKey: ['platform-config', 'tax-rates'] as const,
    staleTime: 5 * 60 * 1000, // 5 min — match backend Redis TTL
    placeholderData: { gst: FALLBACK_GST },
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { gst: number[] } }>(
          '/platform-config/public/tax-rates',
        );
        const gst = res.data?.gst ?? [];
        return {
          gst: gst.length > 0 ? gst : FALLBACK_GST,
        };
      } catch {
        return { gst: FALLBACK_GST };
      }
    },
  });
}
