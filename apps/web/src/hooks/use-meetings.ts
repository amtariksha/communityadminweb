'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MeetingItem {
  id: string;
  tenant_id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name?: string | null;
  total_tasks?: number;
  completed_tasks?: number;
}

export interface MomTask {
  id: string;
  tenant_id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assignee_name?: string | null;
  assignee_phone?: string | null;
  meeting_title?: string | null;
}

export interface CreateMeetingInput {
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  agenda?: string | null;
  minutes?: string | null;
  status?: 'scheduled' | 'completed' | 'cancelled';
}

export interface UpdateMeetingInput extends Partial<CreateMeetingInput> {}

export interface CreateMomTaskInput {
  title: string;
  description?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface UpdateMomTaskInput extends Partial<CreateMomTaskInput> {}

export const meetingKeys = {
  all: ['meetings'] as const,
  lists: () => [...meetingKeys.all, 'list'] as const,
  list: (status?: string) => [...meetingKeys.lists(), status] as const,
  details: () => [...meetingKeys.all, 'detail'] as const,
  detail: (id: string) => [...meetingKeys.details(), id] as const,
  tasks: {
    all: ['meetings', 'tasks'] as const,
    list: (filters: { meeting_id?: string; assignee_id?: string; status?: string }) =>
      [...meetingKeys.tasks.all, filters] as const,
  },
};

export function useMeetings(status?: string) {
  return useQuery({
    queryKey: meetingKeys.list(status),
    queryFn: async () => {
      const qs = status && status !== 'all' ? `?status=${status}` : '';
      const response = await api.get<{ data: MeetingItem[] }>(`/meetings${qs}`);
      return response.data;
    },
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<{ data: MeetingItem & { tasks: MomTask[] } }>(
        `/meetings/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMeetingInput) => {
      const response = await api.post<{ data: MeetingItem }>('/meetings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMeetingInput }) => {
      const response = await api.patch<{ data: MeetingItem }>(`/meetings/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(`/meetings/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

export function useMomTasks(meetingId?: string, assigneeId?: string, status?: string) {
  return useQuery({
    queryKey: meetingKeys.tasks.list({ meeting_id: meetingId, assignee_id: assigneeId, status }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (meetingId) params.append('meeting_id', meetingId);
      if (assigneeId) params.append('assignee_id', assigneeId);
      if (status && status !== 'all') params.append('status', status);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<{ data: MomTask[] }>(`/meetings/tasks/all${qs}`);
      return response.data;
    },
  });
}

export function useCreateMomTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      data,
    }: {
      meetingId: string;
      data: CreateMomTaskInput;
    }) => {
      const response = await api.post<{ data: MomTask }>(
        `/meetings/${meetingId}/tasks`,
        data,
      );
      return response.data;
    },
    onSuccess: (_, { meetingId }) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingId) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() });
    },
  });
}

export function useUpdateMomTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateMomTaskInput;
    }) => {
      const response = await api.patch<{ data: MomTask }>(
        `/meetings/tasks/${taskId}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

export function useDeleteMomTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(
        `/meetings/tasks/${taskId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}
