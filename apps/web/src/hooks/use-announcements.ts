'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Listed state (ANN-03); older servers send none. */
export type AnnouncementState = 'draft' | 'awaiting_approval' | 'active' | 'retired';

export type AnnouncementStateCounts = Record<AnnouncementState, number>;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  /** Per state, for admins (ANN-03); absent on older servers. */
  counts?: AnnouncementStateCounts;
}

export interface ApprovalHistoryStep {
  level: number;
  decision: string;
  approver_name: string | null;
  approver_role: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  comments: string | null;
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
  // ANN-03 … ANN-12 (absent on older servers)
  status?: string;
  state?: AnnouncementState;
  retired_at?: string | null;
  retire_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  can_approve?: boolean;
  approval_history?: ApprovalHistoryStep[];
  channels?: string[];
  reply_to_email?: string | null;
  classification?: 'official' | 'promotional';
  attachment_urls?: string[];
  attachment_names?: string[];
  source?: 'committee' | 'member';
}

export interface AnnouncementDelivery {
  recipients: number;
  channels: Record<'inapp' | 'push' | 'email' | 'sms', Record<string, number>>;
}

// ---------------------------------------------------------------------------
// Filter and input types
// ---------------------------------------------------------------------------

export interface AnnouncementFilters {
  category?: string;
  active_only?: boolean;
  state?: AnnouncementState;
  q?: string;
  source?: 'committee' | 'member';
  // The classic Retired filter panel (ANN-10).
  posted_from?: string;
  posted_to?: string;
  classification?: 'official' | 'promotional';
  audience?: string;
  page?: number;
  limit?: number;
}

export interface AnnouncementInput {
  title?: string;
  body?: string;
  category?: string;
  priority?: string;
  target_audience?: string;
  target_blocks?: string[];
  is_pinned?: boolean;
  expires_at?: string | null;
  channels?: string[];
  reply_to_email?: string | null;
  classification?: 'official' | 'promotional';
  attachment_urls?: string[];
  attachment_names?: string[];
}

interface CreateAnnouncementInput extends AnnouncementInput {
  title: string;
  body: string;
  publish_now?: boolean;
}

interface UpdateAnnouncementInput extends AnnouncementInput {
  id: string;
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
  delivery: (id: string) => [...announcementKeys.all, 'delivery', id] as const,
};

function filtersToParams(filters?: AnnouncementFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params[key] = String(value);
  }
  return params;
}

/** The listed state of a row, worked out the old way when the server sends none. */
export function announcementState(row: Pick<Announcement, 'state' | 'published_at' | 'expires_at'>): AnnouncementState {
  if (row.state) return row.state;
  if (!row.published_at) return 'draft';
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return 'retired';
  return 'active';
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
      return api.get<{ data: Announcement }>(`/announcements/${id}`).then(function unwrap(res) {
        return res.data;
      });
    },
    enabled: id !== '',
  });
}

/** ANN-07 — delivery counts; null on a server without the route (404). */
export function useAnnouncementDelivery(id: string, enabled = true) {
  return useQuery({
    queryKey: announcementKeys.delivery(id),
    meta: { suppressToast: true },
    retry: false,
    enabled: enabled && id !== '',
    queryFn: async function fetchDelivery(): Promise<AnnouncementDelivery | null> {
      try {
        const res = await api.get<{ data: AnnouncementDelivery }>(`/announcements/${id}/delivery`);
        return res.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function useInvalidatingMutation<Input, Output>(fn: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

export function useCreateAnnouncement() {
  return useInvalidatingMutation((input: CreateAnnouncementInput) =>
    api.post<{ data: Announcement }>('/announcements', input),
  );
}

export function useUpdateAnnouncement() {
  return useInvalidatingMutation(({ id, ...body }: UpdateAnnouncementInput) =>
    api.patch<{ data: Announcement }>(`/announcements/${id}`, body),
  );
}

/** Post a draft: live and sent, or Awaiting Approval (the response's `state`). */
export function usePublishAnnouncement() {
  return useInvalidatingMutation((params: { id: string }) =>
    api.post<{ data: Announcement }>(`/announcements/${params.id}/publish`),
  );
}

/** Deletes a draft (a posted notice is retired). */
export function useDeleteAnnouncement() {
  return useInvalidatingMutation((params: { id: string }) => api.delete(`/announcements/${params.id}`));
}

/** ANN-03 — Delete on an active notice: it moves to Retired, the record is kept. */
export function useRetireAnnouncement() {
  return useInvalidatingMutation((params: { id: string; reason?: string }) =>
    api.post<{ data: Announcement }>(`/announcements/${params.id}/retire`, { reason: params.reason }),
  );
}

/** ANN-04 — an approver's step. */
export function useApproveAnnouncement() {
  return useInvalidatingMutation((params: { id: string }) =>
    api.post<{ data: Announcement }>(`/announcements/${params.id}/approve`, {}),
  );
}

/** ANN-04 — back to draft with the reason. */
export function useRejectAnnouncement() {
  return useInvalidatingMutation((params: { id: string; reason: string }) =>
    api.post<{ data: Announcement }>(`/announcements/${params.id}/reject`, { reason: params.reason }),
  );
}
