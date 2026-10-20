'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Community Forms (FORM-*). The admin web ships before the API: a screen
 * whose query fails with 404 shows "not available yet" (`isNotDeployed`).
 */

export type FormStatus = 'draft' | 'published' | 'unpublished';
export type FormAudience = 'all' | 'owners' | 'tenants';
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_answer'
  | 'date'
  | 'file_upload'
  | 'acknowledgement'
  | 'paragraph'
  | 'number';

export interface FormQuestion {
  id?: string;
  position?: number;
  question_text: string;
  question_type: QuestionType;
  is_mandatory: boolean;
  options: string[];
  ack_text: string | null;
}

export interface CommunityForm {
  id: string;
  name: string;
  description: string | null;
  audience: FormAudience;
  requires_approval: boolean;
  status: FormStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  response_count: number;
}

export interface CommunityFormDetail extends CommunityForm {
  questions: FormQuestion[];
}

export interface FormHeaderInput {
  name: string;
  description: string | null;
  audience: FormAudience;
  requires_approval: boolean;
}

export interface FormFilters {
  status?: FormStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export const communityFormKeys = {
  all: ['community-forms'] as const,
  list: (filters: FormFilters) => [...communityFormKeys.all, 'list', filters] as const,
  one: (id: string) => [...communityFormKeys.all, 'one', id] as const,
};

export function formParams(filters: object): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

export function useCommunityForms(filters: FormFilters) {
  return useQuery({
    queryKey: communityFormKeys.list(filters),
    queryFn: () => api.get<{ data: CommunityForm[]; total: number }>('/community-forms', { params: formParams(filters) }),
    retry: false,
  });
}

export function useCommunityForm(id: string | undefined) {
  return useQuery({
    queryKey: communityFormKeys.one(id ?? ''),
    queryFn: () => api.get<{ data: CommunityFormDetail }>(`/community-forms/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

function useFormMutation<Vars>(run: (vars: Vars) => Promise<CommunityFormDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess(saved) {
      queryClient.setQueryData(communityFormKeys.one(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: [...communityFormKeys.all, 'list'] });
    },
  });
}

const data = (promise: Promise<{ data: CommunityFormDetail }>) => promise.then((res) => res.data);

export function useCreateCommunityForm() {
  return useFormMutation((input: FormHeaderInput & { questions: FormQuestion[] }) => data(api.post('/community-forms', input)));
}

export function useUpdateCommunityForm() {
  return useFormMutation(({ id, header }: { id: string; header: Partial<FormHeaderInput> }) => data(api.patch(`/community-forms/${id}`, header)));
}

export function useReplaceFormQuestions() {
  return useFormMutation(({ id, questions }: { id: string; questions: FormQuestion[] }) =>
    data(api.put(`/community-forms/${id}/questions`, { questions })),
  );
}

export function usePublishCommunityForm() {
  return useFormMutation(({ id, publish }: { id: string; publish: boolean }) =>
    data(api.post(`/community-forms/${id}/${publish ? 'publish' : 'unpublish'}`, publish ? { confirm: true } : {})),
  );
}

export function useDeleteCommunityForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/community-forms/${id}`),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [...communityFormKeys.all, 'list'] });
    },
  });
}

/** FORM-04 — whether members are told of new forms and of their decided responses (off until switched on). */
export interface FormNotifications {
  notify_residents: boolean;
}

const formNotificationsKey = [...communityFormKeys.all, 'notifications'] as const;

export function useFormNotifications() {
  return useQuery({
    queryKey: formNotificationsKey,
    queryFn: () => api.get<{ data: FormNotifications }>('/community-forms/setup/notifications').then((res) => res.data),
    retry: false,
  });
}

export function useSaveFormNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FormNotifications) =>
      api.put<{ data: FormNotifications }>('/community-forms/setup/notifications', input).then((res) => res.data),
    onSuccess(saved) {
      queryClient.setQueryData(formNotificationsKey, saved);
    },
  });
}
