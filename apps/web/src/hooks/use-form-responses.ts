'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { communityFormKeys, formParams } from './use-community-forms';

/** FORM-06 — the approvers' queue of form responses and one response. */

export type ResponseStatus = 'unapproved' | 'approved' | 'rejected';
export type ResponseQueue = 'mine' | 'level1' | 'level2' | 'level3';

export interface FormResponseRow {
  id: string;
  response_number: string;
  form_id: string;
  form_name: string;
  respondent_name: string | null;
  unit_number: string | null;
  block: string | null;
  status: ResponseStatus;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  current_level: number | null;
  can_act: boolean;
}

export interface FormResponseAnswer {
  question_id: string;
  position: number;
  question_text: string;
  question_type: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_options: string[] | null;
  file_urls: string[] | null;
  file_names: string[] | null;
  acknowledged: boolean | null;
}

export interface FormResponseStep {
  level: number;
  approver_name: string | null;
  decision: string;
  decided_by_name: string | null;
  decided_at: string | null;
  comments: string | null;
}

export interface FormResponseDetail extends FormResponseRow {
  answers: FormResponseAnswer[];
  steps: FormResponseStep[];
}

export interface ResponseFilters {
  status: ResponseStatus;
  queue?: ResponseQueue;
  q?: string;
  form_id?: string;
  page?: number;
  limit?: number;
}

export interface ResponseList {
  data: FormResponseRow[];
  total: number;
  counts: Record<ResponseStatus, number>;
}

const responseKeys = {
  all: [...communityFormKeys.all, 'responses'] as const,
  list: (filters: ResponseFilters) => [...communityFormKeys.all, 'responses', 'list', filters] as const,
  one: (id: string) => [...communityFormKeys.all, 'responses', 'one', id] as const,
};

export function useFormResponses(filters: ResponseFilters) {
  return useQuery({
    queryKey: responseKeys.list(filters),
    queryFn: () => api.get<ResponseList>('/community-forms/responses', { params: formParams(filters) }),
    retry: false,
  });
}

export function useFormResponse(id: string | undefined) {
  return useQuery({
    queryKey: responseKeys.one(id ?? ''),
    queryFn: () => api.get<{ data: FormResponseDetail }>(`/community-forms/responses/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

function useDecision<Vars>(run: (vars: Vars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: responseKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

export function useApproveFormResponse() {
  return useDecision(({ id, comments }: { id: string; comments?: string }) => api.post(`/community-forms/responses/${id}/approve`, { comments }));
}

export function useRejectFormResponse() {
  return useDecision(({ id, reason }: { id: string; reason: string }) => api.post(`/community-forms/responses/${id}/reject`, { reason }));
}
