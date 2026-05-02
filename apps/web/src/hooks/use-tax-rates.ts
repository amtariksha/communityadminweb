'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const taxRatesKey = ['platform-config', 'tax-rates'] as const;

export function useTaxRates() {
  return useQuery({
    queryKey: taxRatesKey,
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

/**
 * QA Round 12 #12-3c — super-admin write counterpart for the GST
 * rates the canonical Indian dropdown shows everywhere.
 *
 * Targets the **typed** endpoint at `PATCH /super-admin/platform-config/tax-rates`
 * (super-admin.controller.ts:361-386) which validates the payload via
 * Zod (each rate 0-100, 1-20 entries) and de-dupes + sorts ascending
 * server-side. The generic `PATCH /super-admin/platform-config/:key`
 * uses a different body shape (`{ value: ... }`), so we don't reuse
 * `useUpdatePlatformConfig` here.
 *
 * On success: invalidate the public read cache so every consumer of
 * `useTaxRates` (the GstRateSelect dropdown across invoices,
 * purchases, settings) re-fetches the new list within milliseconds.
 * The 5-min Redis TTL on the backend means the read endpoint may
 * still return stale data right after a write — invalidating the
 * client cache forces React Query to bypass its own cache and hit
 * the API again.
 */
export function useUpdateGstRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { gst: number[] }) => {
      const res = await api.patch<{
        data: { updated: boolean; gst: number[] };
      }>('/super-admin/platform-config/tax-rates', input);
      return res.data;
    },
    onSuccess: (data) => {
      // Optimistically write the server's canonical (deduped + sorted)
      // list into the cache so the editor + every GstRateSelect
      // refresh in one render. Then invalidate to background-fetch
      // the same value (idempotent) and pick up any drift.
      qc.setQueryData(taxRatesKey, { gst: data.gst });
      qc.invalidateQueries({ queryKey: taxRatesKey });
    },
  });
}

/** Canonical Indian GST slabs — also exported for the editor's
 * "Reset to defaults" button + the read-side fallback above. */
export const DEFAULT_GST_RATES: readonly number[] = FALLBACK_GST;
