'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { meetingKeys } from './use-meetings';

/** PROJ-22 — a task category of the society (Projects & Meetings › SetUp). */
export interface TaskCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  task_count: number;
}

/** PUT /meetings/task-categories/bulk rows: the whole list in slot order. */
export interface TaskCategoryGridRow {
  id?: string;
  name: string;
  is_active: boolean;
}

export const taskCategoryKeys = {
  all: [...meetingKeys.all, 'task-categories'] as const,
};

export function useTaskCategories() {
  return useQuery({
    queryKey: taskCategoryKeys.all,
    queryFn: () => api.get<{ data: TaskCategory[] }>('/meetings/task-categories').then((res) => res.data),
    retry: false,
  });
}

export function useSaveTaskCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: TaskCategoryGridRow[]) =>
      api.put<{ data: TaskCategory[] }>('/meetings/task-categories/bulk', { rows }).then((res) => res.data),
    onSuccess(saved) {
      queryClient.setQueryData(taskCategoryKeys.all, saved);
      queryClient.invalidateQueries({ queryKey: meetingKeys.tasks.all });
    },
  });
}
