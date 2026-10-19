'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Units & Users › Unapproved Users (UNIT-13): residents' self-signup
 * requests waiting for a decision, Approve Selected Users and Edit.
 * Keys live under ['approvals'] so approving or declining anywhere
 * refreshes these lists too.
 */

export type UnapprovedTable = 'new' | 'join';

export interface UnapprovedRequest {
  approval_id: string;
  onboarding_id: string;
  name: string;
  phone: string;
  email: string | null;
  waiting_for: 'owner' | 'society';
  block: string | null;
  unit_id: string;
  unit_number: string;
  member_type: string;
  approval_level: number;
  created_at: string;
}

export interface UnapprovedList {
  data: UnapprovedRequest[];
  total: number;
  counts: Record<UnapprovedTable, number>;
}

export interface UnapprovedFilters {
  table: UnapprovedTable;
  search: string;
  page: number;
  limit: number;
}

export type BulkApprovalStatus = 'approved' | 'advanced' | 'skipped' | 'error';

export interface BulkApprovalResult {
  id: string;
  status: BulkApprovalStatus;
  message: string;
  code?: string;
}

export interface OnboardingEdit {
  tenant_name?: string;
  tenant_phone?: string;
  tenant_email?: string | null;
  member_type?: 'tenant' | 'tenant_family';
}

export const unapprovedKeys = {
  all: ['approvals', 'unapproved-users'] as const,
  list: (filters: UnapprovedFilters) => [...unapprovedKeys.all, filters] as const,
};

export function unapprovedParams(filters: Omit<UnapprovedFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = { table: filters.table };
  if (filters.search) params.search = filters.search;
  return params;
}

export function useUnapprovedUsers(filters: UnapprovedFilters) {
  return useQuery({
    queryKey: unapprovedKeys.list(filters),
    placeholderData: keepPreviousData,
    // An API without the list answers 404: the page says so, no toast.
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchUnapproved({ signal }) {
      return api.get<UnapprovedList>('/units/unapproved', {
        params: { ...unapprovedParams(filters), page: String(filters.page), limit: String(filters.limit) },
        signal,
      });
    },
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function bulkApprove(ids: string[]) {
      return api.post<{ data: BulkApprovalResult[] }>('/approvals/bulk-approve', { ids }).then((res) => res.data);
    },
    onSettled: function refresh() {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useEditOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function editOnboarding(input: { id: string; changes: OnboardingEdit }) {
      return api.patch<{ data: unknown }>(`/tenant-lifecycle/onboardings/${input.id}`, input.changes);
    },
    onSuccess: function refresh() {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-lifecycle'] });
    },
  });
}

export interface OnboardingForEdit {
  id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string | null;
  unit_number: string;
  status: string;
  approval_request_id: string | null;
}

/** The request the Edit page opens: GET /tenant-lifecycle/onboardings/:id. */
export function useOnboardingForEdit(id: string) {
  return useQuery({
    queryKey: ['tenant-lifecycle', 'onboarding-edit', id] as const,
    enabled: id !== '',
    queryFn: function fetchOnboarding({ signal }) {
      return api.get<{ data: OnboardingForEdit }>(`/tenant-lifecycle/onboardings/${id}`, { signal }).then((res) => res.data);
    },
  });
}
