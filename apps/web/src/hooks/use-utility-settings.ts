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
  /**
   * UTIL-07 — post a batch of utility invoices on creation. UTIL-09 — the
   * utility reminder text (null = ours; absent on an API older than UTIL-09).
   * The whole object is absent on an API older than UTIL-07.
   */
  utility_billing?: {
    auto_post: boolean;
    reminder_template?: UtilityReminderText | null;
    /** UTIL-14 — absent on an API older than UTIL-14. */
    excluded_bank_account_ids?: string[];
  };
}

/** The utility reminder text (UTIL-09). */
export interface UtilityReminderText {
  reply_to: string | null;
  from_name: string | null;
  subject: string;
  message_html: string;
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

/** PUT /utilities/settings/billing: the fields sent are merged into what is saved. */
export function useSaveUtilityBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveUtilityBilling(input: {
      auto_post?: boolean;
      reminder_template?: UtilityReminderText | null;
      excluded_bank_account_ids?: string[];
    }) {
      return api.put<{ data: UtilitySettingsView }>('/utilities/settings/billing', input).then((res) => res.data);
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(utilitySettingsKeys.all, saved);
    },
  });
}

/** Whether the server keeps the utility reminder text and reminds utility dues on their own (UTIL-09). */
export function knowsUtilityReminders(view: UtilitySettingsView | undefined): boolean {
  return view?.utility_billing !== undefined && 'reminder_template' in view.utility_billing;
}
