'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TenantSettings } from '@communityos/shared';
import { api } from '@/lib/api';

export type RuleLineStatus = 'active' | 'scheduled' | 'superseded' | 'ended';

/** A rule line of Setup › Auto Invoicing (INC-16); NUMERIC fields arrive as strings. */
export interface RuleLine {
  id: string;
  category_id: string;
  ledger_account_id: string;
  account_name: string;
  account_code: string | null;
  rule_type: 'standard';
  rate_sqft1_month: string;
  rate_sqft2_month: string;
  unit_fee_month: string;
  gst_applicable: boolean;
  gst_rate: string;
  interest_applicable: boolean;
  hsn_sac: string | null;
  effective_from: string;
  effective_to: string | null;
  revises_line_id: string | null;
  status: RuleLineStatus;
}

export interface RuleTypeGroup {
  category: { id: string; name: string; gst_threshold_applies: boolean; sort_order: number };
  lines: RuleLine[];
}

export type AutoInvoiceSettings = NonNullable<TenantSettings['billing_auto_invoice']>;

export interface AutoInvoiceSettingsView {
  billing_auto_invoice: AutoInvoiceSettings;
  interest: { rate_pa: number; due_days: number; basis: 'due_date' | 'invoice_date' };
  next_run_date: string | null;
}

/** The fields of Add / Edit Line Item. */
export interface RuleLineFees {
  rate_sqft1_month: number;
  rate_sqft2_month: number;
  unit_fee_month: number;
  gst_applicable: boolean;
  gst_rate: number;
  interest_applicable: boolean;
  hsn_sac: string | null;
  effective_from: string;
}

export interface AddRuleLineInput extends RuleLineFees {
  category_id: string;
  ledger_account_id: string;
}

export const billingRuleKeys = {
  all: ['billing-rules'] as const,
  rules: (history: boolean) => [...billingRuleKeys.all, 'rules', history] as const,
  settings: () => [...billingRuleKeys.all, 'settings'] as const,
};

export function useBillingRules(options: { history?: boolean } = {}) {
  const history = options.history ?? false;
  return useQuery({
    queryKey: billingRuleKeys.rules(history),
    // An API without rule lines answers 404: the screen says so, no toast.
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchBillingRules() {
      return api.get<{ as_of: string; data: RuleTypeGroup[] }>('/billing-rules', {
        params: history ? { history: 'true' } : undefined,
      });
    },
  });
}

export function useAutoInvoiceSettings() {
  return useQuery({
    queryKey: billingRuleKeys.settings(),
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchAutoInvoiceSettings() {
      return api.get<{ data: AutoInvoiceSettingsView }>('/billing-rules/settings').then((res) => res.data);
    },
  });
}

export function useSaveAutoInvoiceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveAutoInvoiceSettings(settings: AutoInvoiceSettings) {
      return api.put<{ data: AutoInvoiceSettingsView }>('/billing-rules/settings', settings).then((res) => res.data);
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(billingRuleKeys.settings(), saved);
    },
  });
}

function useRuleLineMutation<Input>(send: (input: Input) => Promise<{ data: RuleLine }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function writeRuleLine(input: Input) {
      return send(input).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.all });
      // Removing a unit type is refused while it has lines.
      queryClient.invalidateQueries({ queryKey: ['unit-billing-categories'] });
    },
  });
}

export function useAddRuleLine() {
  return useRuleLineMutation((input: AddRuleLineInput) => api.post<{ data: RuleLine }>('/billing-rules/lines', input));
}

export function useReviseRuleLine() {
  return useRuleLineMutation(({ id, ...fees }: RuleLineFees & { id: string }) =>
    api.post<{ data: RuleLine }>(`/billing-rules/lines/${id}/revise`, fees),
  );
}

export function useEndRuleLine() {
  return useRuleLineMutation(({ id, effective_to }: { id: string; effective_to: string }) =>
    api.post<{ data: RuleLine }>(`/billing-rules/lines/${id}/end`, { effective_to }),
  );
}

// ---------------------------------------------------------------------------
// INC-18 — Preview Invoice and Clone Rules
// ---------------------------------------------------------------------------

export interface PreviewLine {
  rule_line_id: string | null;
  account_name: string;
  description: string;
  amount: string;
  gst_rate: string;
  gst_amount: string;
  total: string;
  round_off: boolean;
}

export interface RuleLinePreview {
  unit: { id: string; unit_number: string; category_id: string | null };
  invoice_date: string;
  due_date: string;
  period: { from: string; to: string; months: number; label: string };
  lines: PreviewLine[];
  subtotal: string;
  gst_total: string;
  round_off: string;
  total: string;
  warnings: string[];
}

export interface PreviewParams {
  unit_id: string;
  invoice_date: string;
  grace_days: number;
}

const previewQuery = (params: PreviewParams): Record<string, string> => ({
  unit_id: params.unit_id,
  invoice_date: params.invoice_date,
  grace_days: String(params.grace_days),
});

/** Runs when `params` is set (after Preview is pressed); writes nothing. */
export function useRulePreview(params: PreviewParams | null) {
  return useQuery({
    queryKey: [...billingRuleKeys.all, 'preview', params] as const,
    enabled: params !== null,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchPreview() {
      return api
        .get<{ data: RuleLinePreview }>('/billing-rules/preview', { params: previewQuery(params as PreviewParams) })
        .then((res) => res.data);
    },
  });
}

export function downloadPreviewPdf(params: PreviewParams): Promise<Blob> {
  return api.download('/billing-rules/preview.pdf', { params: previewQuery(params) });
}

export interface CloneRulesInput {
  from_category_id: string;
  to_category_id: string;
  effective_from: string;
  replace: boolean;
}

export function useCloneRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function cloneRules(input: CloneRulesInput) {
      return api.post<{ data: { copied: number; ended: number } }>('/billing-rules/clone', input).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: billingRuleKeys.all });
    },
  });
}
