'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isNotDeployed } from '@/lib/not-deployed';

/**
 * VEND-10 / VEND-11 / VEND-12 — AMC contracts with vendors (`/assets/amc`).
 * Field names are the API's (communityos `modules/asset/amc-contract-*.ts`).
 */

export type AmcFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type AmcStatus = 'active' | 'expired' | 'cancelled';

export interface AmcScheduleItem {
  id: string;
  kind: 'payment' | 'service';
  due_date: string;
  amount: string | null;
  done_at: string | null;
}

export interface AmcContractRow {
  id: string;
  /** Absent on a contract from an API older than VEND-10. */
  title?: string | null;
  vendor_id?: string | null;
  vendor_name: string;
  vendor_contact: string | null;
  contract_number: string | null;
  asset_category_id?: string | null;
  asset_category_name?: string | null;
  asset_id: string | null;
  asset_name?: string | null;
  assets?: Array<{ id: string; name: string }>;
  start_date: string;
  end_date: string;
  cost: string | number | null;
  coverage_details?: string | null;
  status: AmcStatus;
  effective_status?: AmcStatus;
  reminder_days?: number | null;
  days_until_expiry?: number;
  payment_frequency?: AmcFrequency | null;
  payment_start_date?: string | null;
  service_frequency?: AmcFrequency | null;
  service_start_date?: string | null;
  next_payment_date?: string | null;
  next_payment_amount?: string | null;
  next_service_date?: string | null;
  renewed_from_id?: string | null;
  renewed?: boolean;
  closed_reason?: string | null;
}

export type AmcContractDetail = AmcContractRow & { schedule?: AmcScheduleItem[] };

/** POST /assets/amc and PATCH /assets/amc/:id bodies. */
export interface AmcContractInput {
  title: string;
  vendor_id: string;
  /** For an API older than VEND-10, which keeps the vendor by name and one asset. */
  vendor_name?: string;
  asset_id?: string;
  vendor_contact?: string | null;
  contract_number?: string | null;
  asset_category_id?: string | null;
  asset_ids: string[];
  start_date: string;
  end_date: string;
  coverage_details?: string | null;
  cost?: number | null;
  reminder_days?: number;
  payment_frequency?: AmcFrequency | null;
  payment_start_date?: string | null;
  service_frequency?: AmcFrequency | null;
  service_start_date?: string | null;
}

export interface AmcListFilters {
  status: 'active' | 'expired';
  search?: string;
  page: number;
  limit: number;
}

export interface AmcCalendarEntry {
  date: string;
  contract_id: string;
  title: string;
  vendor_name: string;
  kind: 'payment' | 'service' | 'end';
  amount: string | null;
}

export interface AmcCalendarMonth {
  month: number;
  counts: { payment: number; service: number; end: number; total: number };
  items: AmcCalendarEntry[];
}

export interface AmcAttachment {
  id: string;
  file_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

const AMC = ['assets', 'amc'] as const;

export const amcKeys = {
  all: AMC,
  list: (filters: AmcListFilters) => [...AMC, 'contracts', filters] as const,
  detail: (id: string) => [...AMC, 'detail', id] as const,
  calendar: (year: number) => [...AMC, 'calendar', year] as const,
  attachments: (id: string) => [...AMC, 'attachments', id] as const,
};

const noRetryWhenMissing = (count: number, error: unknown): boolean => !isNotDeployed(error) && count < 2;

export function useAmcContracts(filters: AmcListFilters) {
  return useQuery({
    queryKey: amcKeys.list(filters),
    queryFn: () =>
      api.get<{ data: AmcContractRow[]; total: number }>('/assets/amc', {
        params: {
          status: filters.status,
          ...(filters.search ? { search: filters.search } : {}),
          page: String(filters.page),
          limit: String(filters.limit),
        },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useAmcContract(id: string) {
  return useQuery({
    queryKey: amcKeys.detail(id),
    queryFn: () => api.get<{ data: AmcContractDetail }>(`/assets/amc/${id}`).then((res) => res.data),
    enabled: id !== '',
    retry: noRetryWhenMissing,
  });
}

function useAmcMutation<Input>(send: (input: Input) => Promise<{ data: AmcContractDetail }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess() {
      // The asset dashboard counts AMCs too.
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useCreateAmc() {
  return useAmcMutation((input: AmcContractInput) => api.post<{ data: AmcContractDetail }>('/assets/amc', input));
}

export function useUpdateAmcContract() {
  return useAmcMutation(({ id, ...input }: AmcContractInput & { id: string }) =>
    api.patch<{ data: AmcContractDetail }>(`/assets/amc/${id}`, input),
  );
}

export function useCloseAmc() {
  return useAmcMutation(({ id, reason }: { id: string; reason: string }) =>
    api.post<{ data: AmcContractDetail }>(`/assets/amc/${id}/close`, { reason }),
  );
}

export function useRenewAmc() {
  return useAmcMutation(({ id, ...input }: AmcContractInput & { id: string }) =>
    api.post<{ data: AmcContractDetail }>(`/assets/amc/${id}/renew`, input),
  );
}

export function useAmcCalendar(year: number | null) {
  return useQuery({
    queryKey: amcKeys.calendar(year ?? 0),
    queryFn: () =>
      api.get<{ data: { year: number; months: AmcCalendarMonth[] } }>('/assets/amc/calendar', { params: { year: String(year) } }).then((res) => res.data),
    enabled: year !== null,
    retry: noRetryWhenMissing,
  });
}

export function useAmcAttachments(id: string) {
  return useQuery({
    queryKey: amcKeys.attachments(id),
    queryFn: () => api.get<{ data: AmcAttachment[] }>(`/assets/amc/${id}/attachments`).then((res) => res.data),
    enabled: id !== '',
    retry: noRetryWhenMissing,
  });
}

export function useAddAmcAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...file }: { id: string; file_key: string; file_name: string; mime_type: string; size_bytes: number }) =>
      api.post<{ data: AmcAttachment[] }>(`/assets/amc/${id}/attachments`, file),
    onSuccess(result, input) {
      queryClient.setQueryData(amcKeys.attachments(input.id), result.data);
    },
  });
}

export function useRemoveAmcAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      api.delete<{ data: AmcAttachment[] }>(`/assets/amc/${id}/attachments/${attachmentId}`),
    onSuccess(result, input) {
      queryClient.setQueryData(amcKeys.attachments(input.id), result.data);
    },
  });
}
