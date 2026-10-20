'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Units & Users › Survey (UNIT-33 over the UNIT-32 API). The admin web
 * ships before the API: a screen whose query fails with 404 shows
 * "Surveys are not available yet".
 */

export type SurveyStatus = 'draft' | 'live' | 'closed';
export type SurveyAudience = 'all_members' | 'owners_only' | 'tenants_only' | 'primary_contact_only';
export type SurveyQuestionType = 'single' | 'multiple' | 'short';

export interface SurveyRow {
  id: string;
  title: string;
  description: string | null;
  audience: SurveyAudience;
  starts_on: string | null;
  ends_on: string | null;
  status: SurveyStatus;
  posted_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  response_count: number;
}

export interface SurveyQuestion {
  id: string;
  position: number;
  type: SurveyQuestionType;
  text: string;
  is_mandatory: boolean;
  options: Array<{ id: string; position: number; label: string }>;
}

export interface SurveyDetail extends SurveyRow {
  questions: SurveyQuestion[];
}

/** One question as the builder sends it (options are [] for a short answer). */
export interface SurveyQuestionInput {
  type: SurveyQuestionType;
  text: string;
  is_mandatory: boolean;
  options: string[];
}

export interface SurveyInput {
  title: string;
  description: string | null;
  audience: SurveyAudience;
  starts_on: string | null;
  ends_on: string | null;
  questions: SurveyQuestionInput[];
}

export interface SurveyQuestionResult {
  id: string;
  position: number;
  type: SurveyQuestionType;
  text: string;
  is_mandatory: boolean;
  answered: number;
  options: Array<{ id: string; label: string; count: number }>;
  short_answers: string[];
}

export interface SurveyResults {
  survey: SurveyDetail;
  response_count: number;
  questions: SurveyQuestionResult[];
}

export interface SurveyFilters {
  status?: SurveyStatus;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface SurveyList {
  data: SurveyRow[];
  total: number;
  /** The API's today in India: a live survey starting after it is Scheduled. */
  today?: string;
}

export const surveyKeys = {
  all: ['surveys'] as const,
  list: (filters: SurveyFilters) => [...surveyKeys.all, 'list', filters] as const,
  one: (id: string) => [...surveyKeys.all, 'one', id] as const,
  results: (id: string) => [...surveyKeys.all, 'results', id] as const,
};

/** The filters as query parameters, blanks left out (the export takes the same). */
export function surveyParams(filters: SurveyFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

export function useSurveys(filters: SurveyFilters) {
  return useQuery({
    queryKey: surveyKeys.list(filters),
    queryFn: () => api.get<SurveyList>('/surveys', { params: surveyParams(filters) }),
    retry: false,
  });
}

export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.one(id ?? ''),
    queryFn: () => api.get<{ data: SurveyDetail }>(`/surveys/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useSurveyResults(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.results(id ?? ''),
    queryFn: () => api.get<{ data: SurveyResults }>(`/surveys/${id}/results`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

function useSurveyMutation<Vars>(run: (vars: Vars) => Promise<SurveyDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess(saved) {
      queryClient.setQueryData(surveyKeys.one(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: [...surveyKeys.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: surveyKeys.results(saved.id) });
    },
  });
}

const detail = (promise: Promise<{ data: SurveyDetail }>) => promise.then((res) => res.data);

export function useCreateSurvey() {
  return useSurveyMutation((input: SurveyInput) => detail(api.post('/surveys', input)));
}

/** A draft only: the header and the whole question list, replaced. */
export function useUpdateSurvey() {
  return useSurveyMutation(({ id, input }: { id: string; input: SurveyInput }) => detail(api.patch(`/surveys/${id}`, input)));
}

export function usePostSurvey() {
  return useSurveyMutation((id: string) => detail(api.post(`/surveys/${id}/post`, { confirm: true })));
}

export function useCloseSurvey() {
  return useSurveyMutation((id: string) => detail(api.post(`/surveys/${id}/close`, {})));
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/surveys/${id}`),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [...surveyKeys.all, 'list'] });
    },
  });
}
