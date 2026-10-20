'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { saveBlob } from '@/lib/download';
import { orNotAvailable } from './use-move-in-setup';
import type { FieldValue } from './use-resident-fields';

/**
 * MOVE-16 / MOVE-17 / MOVE-18 — the society's move-outs: NOC Initiated /
 * Sent / Submitted lists, Start Move-Out and each NOC step. Lists are
 * `null` when the API does not have the routes yet (404).
 */
export type MoveOutState = 'initiated' | 'sent' | 'submitted';

export interface MoveOut {
  exit_id: string;
  unit_id: string;
  block: string | null;
  unit_number: string;
  member_id: string | null;
  name: string | null;
  member_type: 'owner' | 'tenant';
  exit_date: string;
  initiated_by: string;
  initiated_by_name: string | null;
  initiated_on: string;
  status: string;
  approved: boolean;
  dues: string;
  dues_at_noc: string | null;
  checklist_done: number;
  checklist_total: number;
  noc_sent_at: string | null;
  noc_submitted_at: string | null;
}

export interface MoveOutFilters {
  state: MoveOutState;
  block?: string | null;
  q?: string;
}

export interface StartMoveOutInput {
  unit_id: string;
  member_id: string;
  exit_date: string;
  reason?: string;
  fields?: Record<string, FieldValue>;
}

export const moveOutKeys = {
  all: ['move-outs'] as const,
  list: (filters: MoveOutFilters & { page: number; limit: number }) => [...moveOutKeys.all, 'list', filters] as const,
};

export function moveOutParams(filters: MoveOutFilters): Record<string, string> {
  const params: Record<string, string> = { state: filters.state };
  if (filters.block) params.block = filters.block;
  if (filters.q) params.q = filters.q;
  return params;
}

export function useMoveOuts(filters: MoveOutFilters & { page: number; limit: number }) {
  return useQuery({
    queryKey: moveOutKeys.list(filters),
    queryFn: () =>
      orNotAvailable(() =>
        api.get<{ data: MoveOut[]; total: number }>('/tenant-lifecycle/move-outs', {
          params: { ...moveOutParams(filters), page: String(filters.page), limit: String(filters.limit) },
        }),
      ),
  });
}

function useStep<Input>(run: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: moveOutKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['resident-record'] });
      void queryClient.invalidateQueries({ queryKey: ['unit-members'] });
    },
  });
}

const step = (exitId: string, name: string, body: Record<string, unknown> = {}) =>
  api.post(`/tenant-lifecycle/exits/${exitId}/${name}`, body);

export const useStartMoveOut = () => useStep((input: StartMoveOutInput) => api.post('/tenant-lifecycle/exits/admin', input));
export const useIssueNoc = () =>
  useStep((input: { exitId: string; override_reason?: string }) =>
    step(input.exitId, 'issue-noc', input.override_reason ? { override_reason: input.override_reason } : {}),
  );
export const useResendNoc = () => useStep((exitId: string) => step(exitId, 'resend-noc'));
export const useMarkSubmitted = () =>
  useStep((input: { exitId: string; confirm?: boolean }) =>
    step(input.exitId, 'mark-submitted', input.confirm ? { confirm_incomplete_checklist: true } : {}),
  );
export const useCompleteMoveOut = () => useStep((exitId: string) => step(exitId, 'complete'));
export const useCancelMoveOut = () =>
  useStep((input: { exitId: string; reason?: string }) => step(input.exitId, 'cancel', input.reason ? { reason: input.reason } : {}));

/** Saves the move-out's NOC PDF. */
export async function downloadNoc(exitId: string, unitLabel: string): Promise<void> {
  const blob = await api.download(`/tenant-lifecycle/exits/${exitId}/noc.pdf`);
  saveBlob(blob, `noc-${unitLabel}.pdf`);
}

export interface MoveOutSettings {
  noc_email: boolean;
}

export function useMoveOutSettings() {
  return useQuery({
    queryKey: [...moveOutKeys.all, 'settings'] as const,
    queryFn: () => orNotAvailable(() => api.get<{ data: MoveOutSettings }>('/tenant-lifecycle/move-out-settings').then((res) => res.data)),
  });
}

export function useSaveMoveOutSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveOutSettings) =>
      api.put<{ data: MoveOutSettings }>('/tenant-lifecycle/move-out-settings', input).then((res) => res.data),
    onSuccess(settings) {
      queryClient.setQueryData([...moveOutKeys.all, 'settings'], settings);
    },
  });
}
