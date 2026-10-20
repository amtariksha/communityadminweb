'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import type { ApproverGrid } from './use-approver-grid';

/**
 * Move In/Out Tracker › Setup › Verifiers (MOVE-12, screen MOVE-S1): the
 * move-in flow switch and the people at Level 1 / Level 2, read and saved
 * together. `null` when the API does not have the route yet (404).
 */
export interface MoveInFlow {
  flow_enabled: boolean;
  grid: ApproverGrid;
}

export interface SaveMoveInFlowInput {
  flow_enabled: boolean;
  people: Array<{ user_id: string; level: number }>;
}

export const moveInSetupKeys = {
  all: ['move-in-setup'] as const,
  flow: () => [...moveInSetupKeys.all, 'flow'] as const,
};

/** A 404 means this server does not have the route yet. */
export async function orNotAvailable<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function useMoveInFlow() {
  return useQuery({
    queryKey: moveInSetupKeys.flow(),
    queryFn: () => orNotAvailable(() => api.get<{ data: MoveInFlow }>('/tenant-lifecycle/move-in-flow').then((res) => res.data)),
  });
}

export function useSaveMoveInFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMoveInFlowInput) =>
      api.put<{ data: MoveInFlow }>('/tenant-lifecycle/move-in-flow', input).then((res) => res.data),
    onSuccess(flow) {
      queryClient.setQueryData(moveInSetupKeys.flow(), flow);
    },
  });
}
