'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type InterestBasis = 'due_date' | 'invoice_date';

/** The four fields of Utility Tracker › Setup › Simple Interest (UTIL-06). */
export interface UtilityInterest {
  rate_pa: number;
  due_days: number;
  basis: InterestBasis;
  start_date: string | null;
}

/** GET /utilities/settings. */
export interface UtilitySettingsView {
  /** What utility invoices follow now (the maintenance values where none is saved). */
  utility_interest: UtilityInterest;
  /** True while the society has saved no utility rule of its own. */
  utility_interest_inherited: boolean;
  maintenance_interest: UtilityInterest;
  /** UTIL-07 — post a batch of utility invoices on creation; absent on an older API. */
  utility_billing?: { auto_post: boolean };
}

export const utilitySettingsKeys = {
  all: ['utility-settings'] as const,
};

export function useUtilitySettings() {
  return useQuery({
    queryKey: utilitySettingsKeys.all,
    // A server without the route answers 404: the page says "not available yet".
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchUtilitySettings() {
      return api.get<{ data: UtilitySettingsView }>('/utilities/settings').then((res) => res.data);
    },
  });
}

export function useSaveUtilityInterest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveUtilityInterest(interest: UtilityInterest) {
      return api.put<{ data: UtilitySettingsView }>('/utilities/settings/interest', interest).then((res) => res.data);
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(utilitySettingsKeys.all, saved);
    },
  });
}
