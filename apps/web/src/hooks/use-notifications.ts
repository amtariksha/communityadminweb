'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  channel: string;
  target_audience: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_by: string | null;
  created_at: string;
  creator_name?: string;
  // Migration 076 — set when the admin picks a category in the
  // editor. Drives the action set the recipient phone renders.
  category?: string | null;
  urgency?: 'normal' | 'urgent';
}

// NotifPlan §5 — per-template scorecard returned by GET
// /notifications/sent. Joins delivery_logs + notifications.is_read
// aggregates so the Sent tab can render a per-row dashboard.
export interface SentNotification extends NotificationTemplate {
  sent_count: number;
  read_count: number;
  delivered_count: number;
  failed_count: number;
  skipped_count: number;
}

export interface Notification {
  id: string;
  tenant_id: string;
  template_id: string | null;
  title: string;
  body: string;
  channel: string;
  recipient_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface NotificationTemplateFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface MyNotificationFilters {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateTemplateInput {
  title: string;
  body: string;
  channel: string;
  target_audience: string;
  // Migration 076 — optional; admin can save a template without a
  // category (sends as a generic announcement-style payload).
  category?: string | null;
  urgency?: 'normal' | 'urgent';
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const notificationKeys = {
  all: ['notifications'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  templateList: (filters?: NotificationTemplateFilters) =>
    [...notificationKeys.templates(), filters] as const,
  mine: () => [...notificationKeys.all, 'mine'] as const,
  myList: (page?: number) => [...notificationKeys.mine(), page] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function templateFiltersToParams(
  filters?: NotificationTemplateFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useNotificationTemplates(status?: string) {
  const filters: NotificationTemplateFilters | undefined = status
    ? { status }
    : undefined;

  return useQuery({
    queryKey: notificationKeys.templateList(filters),
    queryFn: function fetchNotificationTemplates() {
      return api
        .get<{ data: NotificationTemplate[]; total: number }>(
          '/notifications/templates',
          { params: templateFiltersToParams(filters) },
        )
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

export function useMyNotifications(page?: number) {
  return useQuery({
    queryKey: notificationKeys.myList(page),
    queryFn: function fetchMyNotifications() {
      const params: Record<string, string> = {};
      if (page !== undefined) params.page = String(page);
      return api
        .get<{ data: Notification[]; total: number }>('/notifications/mine', {
          params,
        })
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: function fetchUnreadCount() {
      return api
        .get<{ data: { count: number } }>('/notifications/unread-count')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createTemplate(input: CreateTemplateInput) {
      return api.post<{ data: NotificationTemplate }>(
        '/notifications/templates',
        input,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useSendTemplate() {
  const queryClient = useQueryClient();

  // Backend returns `{ data: { sent: number } }` from
  // POST /notifications/templates/:id/send (controller signature
  // confirmed). The previous typing claimed NotificationTemplate
  // which never matched the wire shape.
  return useMutation({
    mutationFn: function sendTemplate(id: string) {
      return api.post<{ data: { sent: number } }>(
        `/notifications/templates/${id}/send`,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// NotifPlan §1 — fire a template only to the calling user. Useful in
// QA and for admins who want to preview the action set on their own
// device without iterating recipients.
export function useTestSendTemplate() {
  return useMutation({
    mutationFn: function testSendTemplate(id: string) {
      return api.post<{ data: { sent: number } }>(
        `/notifications/templates/${id}/test`,
      );
    },
  });
}

// NotifPlan §5 — admin-side "what was sent" inbox. Fetches recent
// templates with delivery aggregates already joined server-side.
// Returns the full `{data, total?}` envelope so the page reads the
// same shape as useNotificationTemplates above (consistency lets the
// page code use `query.data?.data ?? []` uniformly).
export function useSentNotifications(limit = 50) {
  return useQuery({
    queryKey: [...notificationKeys.all, 'sent', limit],
    queryFn: function fetchSent() {
      return api.get<{ data: SentNotification[] }>('/notifications/sent', {
        params: { limit: String(limit) },
      });
    },
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function markRead(id: string) {
      return api.patch<{ data: Notification }>(
        `/notifications/${id}/read`,
        {},
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function markAllRead() {
      return api.post('/notifications/read-all');
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
