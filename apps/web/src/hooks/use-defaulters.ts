'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** A unit with a posted bill open past its due date (INC-29). */
export interface DefaulterRow {
  unit_id: string;
  unit_number: string;
  block: string | null;
  total_due: string;
  invoice_count: number;
  oldest_due_date: string;
  days_overdue: number;
  /** Absent on an API older than INC-29. */
  type?: 'Owner' | 'Tenant' | null;
  primary_contact_name?: string | null;
  bill_to_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface DefaulterFilters {
  view: 'invoices' | 'other';
  posted_before?: string;
  min_due?: string;
  max_due?: string;
  category_ids?: string[];
  account_ids?: string[];
  q?: string;
}

export function defaulterParams(filters: DefaulterFilters): Record<string, string> {
  const params: Record<string, string> = { view: filters.view };
  if (filters.posted_before) params.posted_before = filters.posted_before;
  if (filters.min_due) params.min_due = filters.min_due;
  if (filters.max_due) params.max_due = filters.max_due;
  if (filters.category_ids?.length) params.category_ids = filters.category_ids.join(',');
  if (filters.account_ids?.length) params.account_ids = filters.account_ids.join(',');
  if (filters.q?.trim()) params.q = filters.q.trim();
  return params;
}

export const defaulterKeys = {
  all: ['defaulters'] as const,
  list: (filters: DefaulterFilters) => [...defaulterKeys.all, 'list', filters] as const,
  log: (from: string, to: string, page: number) => [...defaulterKeys.all, 'log', from, to, page] as const,
};

export function useDefaulterList(filters: DefaulterFilters) {
  return useQuery({
    queryKey: defaulterKeys.list(filters),
    meta: { suppressToast: true },
    queryFn: function fetchDefaulters() {
      return api.get<{ data: DefaulterRow[] }>('/invoices/defaulters', { params: defaulterParams(filters) }).then((res) => res.data);
    },
  });
}

export interface ReminderInput {
  unit_ids: string[];
  channel: 'email';
  reply_to?: string;
  from_name?: string;
  subject: string;
  message_html: string;
}

export interface ReminderResult {
  batch_id: string;
  units: number;
  no_dues: number;
  sent: number;
  skipped_no_email: number;
  failed: number;
}

export function useSendReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function sendReminders(input: ReminderInput) {
      return api.post<{ data: ReminderResult }>('/invoices/defaulters/remind', input).then((res) => res.data);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: [...defaulterKeys.all, 'log'] });
    },
  });
}

export interface ReminderLogRow {
  id: string;
  sent_on: string;
  unit_label: string;
  recipient: string | null;
  channel: string;
  trigger: 'automatic' | 'manual';
  status: string;
  notes: string | null;
}

export function useReminderLog(from: string, to: string, page: number) {
  return useQuery({
    queryKey: defaulterKeys.log(from, to, page),
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchReminderLog() {
      const params: Record<string, string> = { page: String(page), limit: '50' };
      if (from) params.from = from;
      if (to) params.to = to;
      return api.get<{ data: ReminderLogRow[]; total: number }>('/invoices/defaulters/reminder-log', { params });
    },
  });
}
