'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { meetingKeys, type MeetingItem, type MomTask } from './use-meetings';

export type MeetingState = 'open' | 'closed';
/** PROJ-46 — Recurred: instances made by closing a recurring task. */
export type TaskState = MeetingState | 'recurred';
/** PROJ-48 — Resolution searches the resolutions linked to a meeting. */
export type MeetingSearchScope = 'topic' | 'agenda' | 'minutes' | 'resolution' | 'all';

export interface StateCounts {
  open: number;
  closed: number;
  /** Tasks, on an API with PROJ-46. */
  recurred?: number;
}

export interface ListPage<Row> {
  data: Row[];
  total: number;
  /** Absent from an API older than PROJ-10 / PROJ-12. */
  counts?: StateCounts;
}

export interface MeetingListFilters {
  state: MeetingState;
  q?: string;
  scope?: MeetingSearchScope;
  page: number;
  limit: number;
}

export interface TaskListFilters {
  state: TaskState;
  q?: string;
  assignee_id?: string;
  /** PROJ-21 */
  category_id?: string;
  page: number;
  limit: number;
}

export type MomTaskRow = MomTask & { created_by_name?: string | null };

function params(filters: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]),
  );
}

/** Meetings › Open / Closed (PROJ-10): one state, a scoped search, one page. */
export function useMeetingList(filters: MeetingListFilters) {
  return useQuery({
    queryKey: [...meetingKeys.lists(), 'page', filters] as const,
    queryFn: () => api.get<ListPage<MeetingItem>>('/meetings', { params: params(filters) }),
    placeholderData: keepPreviousData,
  });
}

/** The query string of the Tasks list and its export, without the page. */
export function taskListParams(filters: Omit<TaskListFilters, 'page' | 'limit'>): Record<string, string> {
  return params(filters);
}

/** Tasks (PROJ-12): one state, assignee and search, one page, with counts. */
export function useMomTaskList(filters: TaskListFilters) {
  return useQuery({
    queryKey: [...meetingKeys.tasks.all, 'page', filters] as const,
    queryFn: () => api.get<ListPage<MomTaskRow>>('/meetings/tasks/all', { params: params(filters) }),
    placeholderData: keepPreviousData,
  });
}
