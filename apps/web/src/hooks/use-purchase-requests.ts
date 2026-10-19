'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import type { GstType } from '@/lib/gst-lines';

/**
 * EXP-06 / EXP-08 / EXP-09 — purchase requests with lines, drafts,
 * approvers per level and the bucket lists. Every query answers `null`
 * when the API does not have the route yet (404), so the screens can say
 * "not available yet" until the API is deployed.
 */

export interface PRLineInput {
  ledger_account_id: string;
  description?: string | null;
  hsn_sac?: string | null;
  quantity: number;
  unit_rate: number;
  gst_type: GstType;
  gst_rate: number;
}

export interface PRApprovalLevelInput {
  level: number;
  approver_user_ids: string[];
  min_approvals: number;
}

export interface PRApprovalInput {
  levels: PRApprovalLevelInput[];
}

export interface SavePRInput {
  title: string;
  vendor_id: string | null;
  request_date: string;
  details_html: string | null;
  lines: PRLineInput[];
}

export interface CreatePRInput extends SavePRInput {
  approval?: PRApprovalInput;
  submit: boolean;
}

export interface PRLineView {
  line_no: number;
  ledger_account_id: string | null;
  ledger_account_code: string | null;
  ledger_account_name: string | null;
  description: string | null;
  hsn_sac: string | null;
  quantity: string;
  unit_rate: string;
  taxable_amount: string;
  gst_type: GstType;
  gst_rate: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  line_total: string;
}

export interface PRApprovalStepView {
  id: string;
  level: number;
  approver_type: 'user' | 'role' | 'any_of_role';
  approver_role: string | null;
  approver_user_id: string | null;
  approver_name: string | null;
  decision: 'pending' | 'approved' | 'rejected' | 'not_required';
  decided_by_name: string | null;
  decided_at: string | null;
  comments: string | null;
}

export interface PRDetail {
  purchase_request: {
    id: string;
    pr_number: string;
    title: string;
    status: string;
    requested_by: string | null;
    requested_by_name: string | null;
    vendor_id: string | null;
    vendor_name: string | null;
    vendor_state_code: string | null;
    vendor_gstin: string | null;
    request_date: string;
    details_html: string | null;
    description: string | null;
    estimated_amount: string;
    created_at: string;
  };
  lines: PRLineView[];
  legacy: boolean;
  totals: { taxable_total: string; cgst_total: string; sgst_total: string; igst_total: string; grand_total: string };
  attachments: Array<{ id: string; file_key: string; file_name: string; mime_type: string; size_bytes: number }>;
  approval: {
    id: string;
    status: string;
    current_level: number;
    level_rules: Record<string, { min_approvals?: number }>;
    steps: PRApprovalStepView[];
  } | null;
}

export type PRBucket = 'drafts' | 'mine' | 'level' | 'open' | 'closed' | 'all';

export interface PRListFilters {
  bucket?: PRBucket;
  level?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PRListRow {
  id: string;
  pr_number: string;
  title: string;
  status: string;
  estimated_amount: string;
  vendor_id: string | null;
  vendor_name: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  request_date: string;
  created_at: string;
  approved_at: string | null;
  current_level: number | null;
  approvals_needed: number | null;
  voted_by_me: boolean;
  expense_category_name: string | null;
  extra_heads_count: number;
}

export interface PRBucketCounts {
  drafts: number;
  mine: number;
  level_1: number;
  level_2: number;
  level_3: number;
  open: number;
  closed: number;
}

export interface PRListResponse {
  data: PRListRow[];
  total: number;
  counts: PRBucketCounts;
}

export interface ExpenseHeadSummary {
  ledger_account_id: string;
  code: string;
  name: string;
  group_name: string;
  hsn_sac: string | null;
  budget_amount: string | null;
  booked_amount: string;
}

export interface ExpenseHeadsResponse {
  data: ExpenseHeadSummary[];
  financial_year: { id: string; name: string; start_date: string; end_date: string } | null;
  gst: { society_state_code: string | null; rate_options: number[]; pre_reform_rates: number[]; reform_date: string };
}

export const purchaseRequestKeys = {
  all: ['purchase-requests'] as const,
  lists: () => [...purchaseRequestKeys.all, 'list'] as const,
  list: (filters: PRListFilters) => [...purchaseRequestKeys.lists(), filters] as const,
  detail: (id: string) => [...purchaseRequestKeys.all, 'detail', id] as const,
  heads: (financialYearId?: string) => [...purchaseRequestKeys.all, 'heads', financialYearId ?? 'current'] as const,
};

async function nullOn404<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function prListParams(filters: PRListFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

/**
 * A bucket list with its counts. `null` before the API knows buckets: an
 * older API answers the same route without `counts`.
 */
export function usePurchaseRequestList(filters: PRListFilters, enabled = true) {
  return useQuery({
    queryKey: purchaseRequestKeys.list(filters),
    enabled,
    queryFn: async function fetchPurchaseRequestList(): Promise<PRListResponse | null> {
      const res = await api.get<Partial<PRListResponse>>('/purchases/requests', { params: prListParams(filters) });
      if (!res.counts) return null;
      return { data: res.data ?? [], total: res.total ?? 0, counts: res.counts };
    },
  });
}

export function usePurchaseRequestDetail(id: string | null) {
  return useQuery({
    queryKey: purchaseRequestKeys.detail(id ?? ''),
    enabled: Boolean(id),
    // An API from before lines answers without `lines`: treated as not available.
    queryFn: () =>
      nullOn404(() =>
        api.get<{ data: PRDetail }>(`/purchases/requests/${id}`).then((res) => (Array.isArray(res.data?.lines) ? res.data : null)),
      ),
  });
}

/** Expense heads with HSN/SAC and booked amount, and the GST facts for the form. */
export function useExpenseHeadsSummary(financialYearId?: string) {
  return useQuery({
    queryKey: purchaseRequestKeys.heads(financialYearId),
    queryFn: () =>
      nullOn404(() =>
        api.get<ExpenseHeadsResponse>('/purchases/expense-heads/summary', {
          params: financialYearId ? { financial_year_id: financialYearId } : undefined,
        }),
      ),
  });
}

function useRequestMutation<Input>(send: (input: Input) => Promise<{ data: PRDetail }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => send(input).then((res) => res.data),
    onSuccess(detail) {
      queryClient.invalidateQueries({ queryKey: purchaseRequestKeys.lists() });
      queryClient.setQueryData(purchaseRequestKeys.detail(detail.purchase_request.id), detail);
      // The standard /purchases list reads its own key.
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useCreatePurchaseRequest() {
  return useRequestMutation((input: CreatePRInput) => api.post<{ data: PRDetail }>('/purchases/requests', input));
}

export function useUpdatePurchaseRequest() {
  return useRequestMutation(({ id, ...input }: SavePRInput & { id: string }) =>
    api.patch<{ data: PRDetail }>(`/purchases/requests/${id}`, input),
  );
}

export function useSubmitPurchaseRequest() {
  return useRequestMutation(({ id, approval }: { id: string; approval?: PRApprovalInput }) =>
    api.post<{ data: PRDetail }>(`/purchases/requests/${id}/submit`, approval ? { approval } : {}),
  );
}

export function useWithdrawPurchaseRequest() {
  return useRequestMutation((id: string) => api.post<{ data: PRDetail }>(`/purchases/requests/${id}/withdraw`));
}

export function useAddPurchaseRequestAttachment() {
  return useRequestMutation(
    ({ id, ...file }: { id: string; file_key: string; file_name: string; mime_type: string; size_bytes: number }) =>
      api.post<{ data: PRDetail }>(`/purchases/requests/${id}/attachments`, file),
  );
}
