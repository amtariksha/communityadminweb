'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { violationKeys, type Paged } from './use-violations';

/** RULE-03 / RULE-04 — the violation register and its stage actions. */

export type ViolationStatus = 'awaiting_approval' | 'warning' | 'penalty' | 'closed' | 'rejected';
export type ViolationStage = 'warning' | 'penalty';
export type CloseOutcome = 'complied' | 'paid' | 'waived' | 'withdrawn' | 'rejected';

export interface Violation {
  id: string;
  violation_number: string;
  category_id: string;
  category_title: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  description: string;
  requested_stage: ViolationStage;
  status: ViolationStatus;
  attachment_urls: string[];
  attachment_names: string[];
  penalty_amount: string | null;
  apply_gst: boolean | null;
  gst_amount: string | null;
  warning_ends_on: string | null;
  days_left: number | null;
  warning_period_over: boolean;
  penalty_due_on: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  balance_due: string | null;
  approval_request_id: string | null;
  current_level: number | null;
  raised_by: string;
  raised_by_name: string | null;
  closed_at: string | null;
  close_outcome: CloseOutcome | null;
  close_note: string | null;
  created_at: string;
  /** Closed and rejected violations: the status they left (warning, penalty, awaiting_approval). */
  final_stage?: string | null;
  can_act: boolean;
}

export interface ViolationEvent {
  id: string;
  event: string;
  from_status: string | null;
  to_status: string | null;
  actor_name: string | null;
  note: string | null;
  created_at: string;
}

export interface ViolationStep {
  level: number;
  approver_user_id: string | null;
  approver_name: string | null;
  decision: string;
  decided_by_name: string | null;
  decided_at: string | null;
  comments: string | null;
}

export interface ViolationDetail extends Violation {
  category_description: string | null;
  events: ViolationEvent[];
  steps: ViolationStep[];
}

export interface ViolationFilters {
  status?: ViolationStatus;
  q?: string;
  category_id?: string;
  block?: string;
  closed_from?: string;
  closed_to?: string;
  outcome?: CloseOutcome;
  warning_period_over?: boolean;
  paid?: 'paid' | 'unpaid';
  page?: number;
  limit?: number;
}

export type ViolationCounts = Record<'awaiting_approval' | 'warning' | 'penalty' | 'closed', number>;

export interface ViolationList extends Paged<Violation> {
  counts: ViolationCounts;
}

export interface RaiseViolationInput {
  category_id: string;
  unit_id: string;
  description: string;
  requested_stage: ViolationStage;
  attachments: Array<{ url: string; name: string; size_bytes?: number }>;
}

export function violationParams(filters: ViolationFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

const registerKeys = {
  list: (filters: ViolationFilters) => [...violationKeys.all, 'list', filters] as const,
  one: (id: string) => [...violationKeys.all, 'one', id] as const,
};

export function useViolations(filters: ViolationFilters) {
  return useQuery({
    queryKey: registerKeys.list(filters),
    queryFn: () => api.get<ViolationList>('/violations', { params: violationParams(filters) }),
    retry: false,
  });
}

export function useViolation(id: string | undefined) {
  return useQuery({
    queryKey: registerKeys.one(id ?? ''),
    queryFn: () => api.get<{ data: ViolationDetail }>(`/violations/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

function useViolationMutation<Vars>(run: (vars: Vars) => Promise<ViolationDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess(saved) {
      queryClient.setQueryData(registerKeys.one(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: [...violationKeys.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

const post = (path: string, body: unknown = {}) => api.post<{ data: ViolationDetail }>(path, body).then((res) => res.data);

export function useRaiseViolation() {
  return useViolationMutation((input: RaiseViolationInput) => post('/violations', input));
}

export function useApproveViolation() {
  return useViolationMutation(({ id, comments }: { id: string; comments?: string }) => post(`/violations/${id}/approve`, { comments }));
}

export function useRejectViolation() {
  return useViolationMutation(({ id, reason }: { id: string; reason: string }) => post(`/violations/${id}/reject`, { reason }));
}

export function useMoveToPenalty() {
  return useViolationMutation((id: string) => post(`/violations/${id}/move-to-penalty`));
}

export function useCloseViolation() {
  return useViolationMutation(({ id, outcome, note }: { id: string; outcome: CloseOutcome; note?: string }) =>
    post(`/violations/${id}/close`, { outcome, note }),
  );
}
