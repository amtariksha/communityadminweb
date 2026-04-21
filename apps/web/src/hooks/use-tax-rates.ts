'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * GST slabs every tenant shares — maintained in `platform_config` by
 * the super-admin and read by every tenant-level GST input across
 * /invoices, /purchases, /settings. Falls back to the Indian standard
 * slabs if the platform_config row is missing or empty.
 *
 * Cached for 5 minutes so a super-admin change propagates naturally
 * without needing a manual refresh on every page.
 */
export function useTaxRates() {
  return useQuery({
    queryKey: ['platform-config', 'tax-rates'] as const,
    staleTime: 5 * 60 * 1000, // 5 min — match backend Redis TTL
    queryFn: async () => {
      const res = await api.get<{ data: { gst: number[] } }>(
        '/platform-config/public/tax-rates',
      );
      const gst = res.data?.gst ?? [];
      return {
        gst: gst.length > 0 ? gst : [0, 5, 12, 18, 28],
      };
    },
  });
}
