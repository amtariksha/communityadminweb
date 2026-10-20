'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Community Rules & Violations (RULE-*). The admin web ships before the API:
 * a screen whose query fails with 404 shows "not available yet"
 * (`isNotDeployed`).
 */

export type CategoryStatus = 'draft' | 'published' | 'inactive';

/** RULE-01 — a rule category: the rule, its warning period and its penalty. */
export interface ViolationCategory {
  id: string;
  title: string;
  description: string | null;
  warning_days: number;
  penalty_days: number;
  /** Rupees as a decimal string. */
  penalty_amount: string;
  apply_gst: boolean;
  income_account_id: string | null;
  income_account_name?: string | null;
  status: CategoryStatus;
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  title: string;
  description: string | null;
  warning_days: number;
  penalty_days: number;
  penalty_amount: number;
  apply_gst: boolean;
  income_account_id: string | null;
}

export interface CategoryFilters {
  status?: CategoryStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface Paged<Row> {
  data: Row[];
  total: number;
}

export const violationKeys = {
  all: ['violations'] as const,
  categories: () => [...violationKeys.all, 'categories'] as const,
  categoryList: (filters: CategoryFilters) => [...violationKeys.categories(), 'list', filters] as const,
  category: (id: string) => [...violationKeys.categories(), 'one', id] as const,
};

export function categoryParams(filters: CategoryFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.q) params.q = filters.q;
  if (filters.page) params.page = String(filters.page);
  if (filters.limit) params.limit = String(filters.limit);
  return params;
}

export function useViolationCategories(filters: CategoryFilters) {
  return useQuery({
    queryKey: violationKeys.categoryList(filters),
    queryFn: () => api.get<Paged<ViolationCategory>>('/violations/categories', { params: categoryParams(filters) }),
    retry: false,
  });
}

export function useViolationCategory(id: string | undefined) {
  return useQuery({
    queryKey: violationKeys.category(id ?? ''),
    queryFn: () => api.get<{ data: ViolationCategory }>(`/violations/categories/${id}`).then((res) => res.data),
    enabled: Boolean(id),
    retry: false,
  });
}

function useCategoryMutation<Vars>(run: (vars: Vars) => Promise<ViolationCategory>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess(saved) {
      queryClient.setQueryData(violationKeys.category(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: violationKeys.categories() });
    },
  });
}

export function useCreateCategory() {
  return useCategoryMutation((input: CategoryInput) =>
    api.post<{ data: ViolationCategory }>('/violations/categories', input).then((res) => res.data),
  );
}

export function useUpdateCategory(id: string) {
  return useCategoryMutation((input: Partial<CategoryInput>) =>
    api.patch<{ data: ViolationCategory }>(`/violations/categories/${id}`, input).then((res) => res.data),
  );
}

export function usePublishCategory() {
  return useCategoryMutation(({ id, publish }: { id: string; publish: boolean }) =>
    api
      .post<{ data: ViolationCategory }>(`/violations/categories/${id}/${publish ? 'publish' : 'unpublish'}`, {})
      .then((res) => res.data),
  );
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/violations/categories/${id}`),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: violationKeys.categories() });
    },
  });
}
