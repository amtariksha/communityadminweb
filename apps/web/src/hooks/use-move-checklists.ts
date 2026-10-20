'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { orNotAvailable } from './use-move-in-setup';

/**
 * MOVE-13 — the move-in / move-out checklists (Setup › Move In CheckList,
 * Move Out CheckList) and their ticks on each request. Reads are `null`
 * when the API does not have the routes yet (404).
 */
export type ChecklistPhase = 'in' | 'out';
export type ChecklistRequestKind = 'onboarding' | 'exit';

export interface ChecklistItem {
  id: string;
  label: string;
  position: number;
  is_enabled: boolean;
  used: boolean;
}

export interface RequestChecklistItem {
  item_id: string;
  label: string;
  is_enabled: boolean;
  ticked: boolean;
  ticked_at: string | null;
  ticked_by_name: string | null;
}

export interface RequestChecklist {
  items: RequestChecklistItem[];
  done: number;
  total: number;
}

export interface SaveChecklistInput {
  rows: Array<{ id?: string; label: string; is_enabled: boolean }>;
}

export const checklistKeys = {
  all: ['move-checklists'] as const,
  items: (phase: ChecklistPhase) => [...checklistKeys.all, 'items', phase] as const,
  request: (kind: ChecklistRequestKind, id: string) => [...checklistKeys.all, kind, id] as const,
};

const requestPath = (kind: ChecklistRequestKind, id: string): string =>
  `/tenant-lifecycle/${kind === 'exit' ? 'exits' : 'onboardings'}/${id}/checklist`;

export function useChecklistItems(phase: ChecklistPhase) {
  return useQuery({
    queryKey: checklistKeys.items(phase),
    queryFn: () => orNotAvailable(() => api.get<{ data: ChecklistItem[] }>(`/tenant-lifecycle/checklists/${phase}`).then((res) => res.data)),
  });
}

export function useSaveChecklistItems(phase: ChecklistPhase) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveChecklistInput) =>
      api.put<{ data: ChecklistItem[] }>(`/tenant-lifecycle/checklists/${phase}`, input).then((res) => res.data),
    onSuccess(items) {
      queryClient.setQueryData(checklistKeys.items(phase), items);
    },
  });
}

export function useRequestChecklist(kind: ChecklistRequestKind, id: string | null) {
  return useQuery({
    queryKey: checklistKeys.request(kind, id ?? ''),
    enabled: Boolean(id),
    queryFn: () => orNotAvailable(() => api.get<{ data: RequestChecklist }>(requestPath(kind, id ?? '')).then((res) => res.data)),
  });
}

export function useTickChecklist(kind: ChecklistRequestKind, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tick: { item_id: string; ticked: boolean }) =>
      api.put<{ data: RequestChecklist }>(requestPath(kind, id), { ticks: [tick] }).then((res) => res.data),
    onSuccess(checklist) {
      queryClient.setQueryData(checklistKeys.request(kind, id), checklist);
      // The lists show "Checklist (n of m)".
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
      void queryClient.invalidateQueries({ queryKey: ['move-outs'] });
    },
  });
}
