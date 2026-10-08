'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface EventItem {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  max_attendees: number | null;
  rsvp_deadline: string | null;
  cover_image_url: string | null;
  target_audience: 'all' | 'tower' | 'floor' | 'members_only';
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_name?: string | null;
  rsvp_going_count?: number;
  my_rsvp_status?: string | null;
}

export interface EventRsvp {
  id: string;
  tenant_id: string;
  event_id: string;
  member_id: string;
  status: 'going' | 'not_going' | 'maybe';
  attendee_count: number;
  created_at: string;
  member_name?: string;
  member_phone?: string;
  unit_number?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  max_attendees?: number | null;
  rsvp_deadline?: string | null;
  cover_image_url?: string | null;
  target_audience?: 'all' | 'tower' | 'floor' | 'members_only';
  status?: 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
}

export interface UpdateEventInput extends Partial<CreateEventInput> {}

export interface RsvpInput {
  status: 'going' | 'not_going' | 'maybe';
  attendee_count?: number;
  member_id?: string;
}

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: { status?: string; search?: string }) =>
    [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  rsvps: (id: string) => [...eventKeys.detail(id), 'rsvps'] as const,
};

export function useEvents(status?: string, search?: string) {
  return useQuery({
    queryKey: eventKeys.list({ status, search }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<{ data: EventItem[] }>(`/events${queryString}`);
      return response.data;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<{ data: EventItem & { rsvps: EventRsvp[] } }>(
        `/events/${id}`,
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const response = await api.post<{ data: EventItem }>('/events', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEventInput }) => {
      const response = await api.patch<{ data: EventItem }>(`/events/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ data: { success: boolean } }>(`/events/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RsvpInput }) => {
      const response = await api.post<{ data: EventRsvp }>(`/events/${id}/rsvp`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useEventRsvps(id: string) {
  return useQuery({
    queryKey: eventKeys.rsvps(id),
    queryFn: async () => {
      const response = await api.get<{ data: EventRsvp[] }>(`/events/${id}/rsvps`);
      return response.data;
    },
    enabled: !!id,
  });
}
