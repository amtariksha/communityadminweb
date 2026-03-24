'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  request_type: string;
  entity_id: string;
  entity_summary: string | null;
  requested_by: string | null;
  requested_at: string;
  approval_level: number;
  max_levels: number;
  status: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  requester_name?: string;
  requester_phone?: string;
}

export interface ApprovalStep {
  id: string;
  level: number;
  approver_type: string;
  approver_role: string | null;
  approver_user_id: string | null;
  decision: string;
  decided_by: string | null;
  decided_at: string | null;
  comments: string | null;
  decided_by_name?: string;
}

export interface ApprovalDetail {
  request: ApprovalRequest;
  steps: ApprovalStep[];
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface ApprovalFilters {
  request_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  list: (filters?: ApprovalFilters) => [...approvalKeys.lists(), filters] as const,
  myPending: () => [...approvalKeys.all, 'my-pending'] as const,
  myPendingCount: () => [...approvalKeys.all, 'my-pending-count'] as const,
  details: () => [...approvalKeys.all, 'detail'] as const,
  detail: (id: string) => [...approvalKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: ApprovalFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.request_type) params.request_type = filters.request_type;
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useMyPendingApprovals() {
  return useQuery({
    queryKey: approvalKeys.myPending(),
    queryFn: function fetchMyPendingApprovals() {
      return api.get<PaginatedResponse<ApprovalRequest>>('/approvals/my-pending');
    },
  });
}

export function useMyPendingCount() {
  return useQuery({
    queryKey: approvalKeys.myPendingCount(),
    queryFn: function fetchMyPendingCount() {
      return api
        .get<{ data: { count: number } }>('/approvals/my-pending/count')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useApprovalRequests(filters?: ApprovalFilters) {
  return useQuery({
    queryKey: approvalKeys.list(filters),
    queryFn: function fetchApprovalRequests() {
      return api.get<PaginatedResponse<ApprovalRequest>>('/approvals', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: approvalKeys.detail(id),
    queryFn: function fetchApprovalDetail() {
      return api
        .get<{ data: ApprovalDetail }>(`/approvals/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function approveRequest(input: { id: string; comments?: string }) {
      return api.post<{ data: ApprovalRequest }>(
        `/approvals/${input.id}/approve`,
        { comments: input.comments },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function rejectRequest(input: { id: string; reason: string }) {
      return api.post<{ data: ApprovalRequest }>(
        `/approvals/${input.id}/reject`,
        { reason: input.reason },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelRequest(id: string) {
      return api.patch<{ data: ApprovalRequest }>(`/approvals/${id}/cancel`, {});
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
