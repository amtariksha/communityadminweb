'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Recurring non-member invoices (INC-66): GET/POST /recurring-invoices,
 * PATCH :id, GET :id/runs. A 404 before the API is deployed is shown as
 * "not available yet".
 */
export type RecurringFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface RecurringLine {
  description: string;
  amount: number;
  gst_rate?: number;
  income_account_id?: string;
}

export interface RecurringInvoice {
  id: string;
  customer_id: string;
  customer_name: string;
  lines: RecurringLine[];
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  due_days: number | null;
  auto_post: boolean;
  is_active: boolean;
  ended: boolean;
}

export interface RecurringRun {
  id: string;
  run_date: string;
  status: 'started' | 'created' | 'failed';
  invoice_id: string | null;
  invoice_number: string | null;
  posted: boolean;
  error_code: string | null;
}

export interface CreateRecurringInput {
  customer_id: string;
  lines: RecurringLine[];
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  due_days?: number | null;
  auto_post: boolean;
}

export const recurringKeys = {
  all: ['recurring-invoices'] as const,
  forPayer: (customerId: string) => [...recurringKeys.all, 'payer', customerId] as const,
  runs: (id: string) => [...recurringKeys.all, 'runs', id] as const,
};

export function useRecurringInvoices(customerId: string) {
  return useQuery({
    queryKey: recurringKeys.forPayer(customerId),
    queryFn: () => api.get<{ data: RecurringInvoice[] }>('/recurring-invoices', { params: { customer_id: customerId } }).then((res) => res.data),
    meta: { suppressToast: true },
    retry: false,
  });
}

export function useRecurringRuns(id: string | null) {
  return useQuery({
    queryKey: recurringKeys.runs(id ?? ''),
    enabled: Boolean(id),
    queryFn: () => api.get<{ data: RecurringRun[] }>(`/recurring-invoices/${id}/runs`).then((res) => res.data),
    meta: { suppressToast: true },
    retry: false,
  });
}

function useRecurringMutation<Input>(fn: (input: Input) => Promise<{ data: RecurringInvoice }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}

export function useCreateRecurringInvoice() {
  return useRecurringMutation((input: CreateRecurringInput) => api.post<{ data: RecurringInvoice }>('/recurring-invoices', input));
}

export function useUpdateRecurringInvoice() {
  return useRecurringMutation(({ id, ...body }: { id: string; is_active?: boolean; end_date?: string | null; auto_post?: boolean }) =>
    api.patch<{ data: RecurringInvoice }>(`/recurring-invoices/${id}`, body),
  );
}

/** Raise again a run that failed (or stuck part way). */
export function useRetryRecurringRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, runId }: { id: string; runId: string }) =>
      api.post<{ data: RecurringRun[] }>(`/recurring-invoices/${id}/runs/${runId}/retry`).then((res) => res.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}
