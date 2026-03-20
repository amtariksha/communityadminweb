'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  target_audience: string;
  target_blocks: string[] | null;
  attachment_url: string | null;
  is_pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface AnnouncementFilters {
  category?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateAnnouncementInput {
  title: string;
  body: string;
  category?: string;
  priority?: string;
  target_audience?: string;
  target_blocks?: string[];
  is_pinned?: boolean;
  publish_now?: boolean;
  expires_at?: string;
}

interface UpdateAnnouncementInput {
  id: string;
  title?: string;
  body?: string;
  category?: string;
  priority?: string;
  target_audience?: string;
  target_blocks?: string[];
  is_pinned?: boolean;
  expires_at?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const announcementKeys = {
  all: ['announcements'] as const,
  lists: () => [...announcementKeys.all, 'list'] as const,
  list: (filters?: AnnouncementFilters) => [...announcementKeys.lists(), filters] as const,
  active: () => [...announcementKeys.all, 'active'] as const,
  details: () => [...announcementKeys.all, 'detail'] as const,
  detail: (id: string) => [...announcementKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: AnnouncementFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.active_only !== undefined) params.active_only = String(filters.active_only);
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAnnouncements(filters?: AnnouncementFilters) {
  return useQuery({
    queryKey: announcementKeys.list(filters),
    queryFn: function fetchAnnouncements() {
      return api.get<PaginatedResponse<Announcement>>('/announcements', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: announcementKeys.active(),
    queryFn: function fetchActiveAnnouncements() {
      return api.get<PaginatedResponse<Announcement>>('/announcements/active');
    },
  });
}

export function useAnnouncement(id: string) {
  return useQuery({
    queryKey: announcementKeys.detail(id),
    queryFn: function fetchAnnouncement() {
      return api
        .get<{ data: Announcement }>(`/announcements/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createAnnouncement(input: CreateAnnouncementInput) {
      return api.post<{ data: Announcement }>('/announcements', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateAnnouncement({ id, ...body }: UpdateAnnouncementInput) {
      return api.patch<{ data: Announcement }>(`/announcements/${id}`, body);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: announcementKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.active() });
    },
  });
}

export function usePublishAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function publishAnnouncement(params: { id: string }) {
      return api.post<{ data: Announcement }>(
        `/announcements/${params.id}/publish`,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: announcementKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: announcementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: announcementKeys.active() });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteAnnouncement(params: { id: string }) {
      return api.delete(`/announcements/${params.id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}
