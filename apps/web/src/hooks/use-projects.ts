'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Projects & Meetings › Projects (PROJ-40 API, PROJ-41 screens). */

export type ProjectStatus = 'open' | 'in_progress' | 'closed';
export type ProjectPriority = 'low' | 'medium' | 'high';

export interface ProjectAttachment {
  url: string;
  name: string;
  size_bytes?: number | null;
}

export interface ProjectRow {
  id: string;
  project_no: number;
  category: string;
  topic: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  driven_by: string | null;
  driven_by_name: string | null;
  start_date: string | null;
  target_date: string | null;
  closed_at: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  last_note: string | null;
  last_note_at: string | null;
  notes_count: number;
  watching: boolean;
}

export interface ProjectNote {
  id: string;
  body: string;
  attachments: ProjectAttachment[];
  is_system: boolean;
  created_by_name: string | null;
  created_at: string;
}

export interface ProjectDetail extends ProjectRow {
  notes: ProjectNote[];
  watchers: Array<{ user_id: string; name: string | null }>;
}

export interface ProjectCounts {
  open: number;
  in_progress: number;
  closed: number;
}

export interface ProjectPage {
  data: ProjectRow[];
  total: number;
  counts: ProjectCounts;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  category?: string;
  /** A user id, or `unassigned`. */
  driven_by?: string;
  q?: string;
}

export interface ProjectInput {
  category: string;
  topic: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  driven_by: string | null;
  start_date: string | null;
  target_date: string | null;
}

export interface NoteInput {
  body: string;
  attachments: ProjectAttachment[];
}

export const PROJECT_STATUS_LABELS: Readonly<Record<ProjectStatus, string>> = {
  open: 'Open',
  in_progress: 'In-Progress',
  closed: 'Closed',
};
export const PROJECT_PRIORITY_LABELS: Readonly<Record<ProjectPriority, string>> = { low: 'Low', medium: 'Medium', high: 'High' };

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: object) => [...projectKeys.all, 'list', filters] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  options: () => [...projectKeys.all, 'options'] as const,
  next: () => [...projectKeys.all, 'next-number'] as const,
};

/** The query string of the list and its export. */
export function projectListParams(filters: ProjectFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
}

export function useProjectList(filters: ProjectFilters & { page?: number; limit?: number }) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => api.get<ProjectPage>('/projects', { params: projectListParams(filters) }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/** The Category and Driven By filter choices (values in use). */
export function useProjectOptions() {
  return useQuery({
    queryKey: projectKeys.options(),
    queryFn: async () => (await api.get<{ data: { categories: string[]; drivers: Array<{ id: string; name: string | null }> } }>('/projects/options')).data,
    retry: false,
  });
}

export function useNextProjectNumber(enabled = true) {
  return useQuery({
    queryKey: projectKeys.next(),
    enabled,
    queryFn: async () => (await api.get<{ data: { project_no: number } }>('/projects/next-number')).data,
    retry: false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    enabled: Boolean(id),
    queryFn: async () => (await api.get<{ data: ProjectDetail }>(`/projects/${id}`)).data,
    retry: false,
  });
}

function useProjectMutation<Input>(request: (input: Input) => Promise<{ data: ProjectDetail }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => (await request(input)).data,
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useCreateProject() {
  return useProjectMutation((input: ProjectInput & { note?: NoteInput; watch?: boolean }) =>
    api.post<{ data: ProjectDetail }>('/projects', input),
  );
}

export function useUpdateProject() {
  return useProjectMutation(({ id, data }: { id: string; data: Partial<ProjectInput> }) =>
    api.patch<{ data: ProjectDetail }>(`/projects/${id}`, data),
  );
}

export function useAddProjectNote() {
  return useProjectMutation(({ id, note }: { id: string; note: NoteInput }) => api.post<{ data: ProjectDetail }>(`/projects/${id}/notes`, note));
}

/** Watch / Unwatch for the signed-in person. */
export function useWatchProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, watch }: { id: string; watch: boolean }) =>
      watch ? api.post(`/projects/${id}/watch`) : api.delete(`/projects/${id}/watch`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
