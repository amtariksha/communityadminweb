'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * SB-11 — the approver grid of one request type: office holders down the
 * side, No Access / Level 1 / 2 / 3 across, a minimum per level. `null`
 * when the API does not have the route yet (404).
 */
export type ApproverGridType = 'purchase_request' | 'announcement';

export interface ApproverGridPerson {
  user_id: string;
  name: string | null;
  roles: string[];
  /** 0 = No Access. */
  level: number;
}

export interface ApproverGridLevel {
  level: number;
  min_approvals: number;
  approver_count: number;
}

export interface ApproverGrid {
  request_type: ApproverGridType;
  configured: boolean;
  people: ApproverGridPerson[];
  levels: ApproverGridLevel[];
}

export interface SaveApproverGridInput {
  people: Array<{ user_id: string; level: number }>;
  levels: Array<{ level: number; min_approvals: number }>;
}

export const approverGridKeys = {
  all: ['approver-grid'] as const,
  grid: (type: ApproverGridType) => [...approverGridKeys.all, type] as const,
};

export function useApproverGrid(type: ApproverGridType) {
  return useQuery({
    queryKey: approverGridKeys.grid(type),
    queryFn: async function fetchApproverGrid(): Promise<ApproverGrid | null> {
      try {
        const res = await api.get<{ data: ApproverGrid }>(`/approvals/grid/${type}`);
        return res.data;
      } catch (error) {
        // A server without the route (404), or one that does not know this
        // request type yet (e.g. announcements before ANN-04 is deployed).
        if (error instanceof ApiError && (error.status === 404 || error.code === 'approver_grid_type_unknown')) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useSaveApproverGrid(type: ApproverGridType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveApproverGridInput) =>
      api.put<{ data: ApproverGrid }>(`/approvals/grid/${type}`, input).then((res) => res.data),
    onSuccess(grid) {
      queryClient.setQueryData(approverGridKeys.grid(type), grid);
    },
  });
}
