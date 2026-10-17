'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A helpdesk category. Who owns it is only sent to staff, so the owner
 * fields are optional.
 */
export interface HelpdeskCategory {
  id: string;
  name: string;
  display_order: number;
  owner_l1_user_id?: string | null;
  owner_l1_name?: string | null;
  /** The category's own automatic reply; staff only. */
  auto_reply_text?: string | null;
}

/** One row sent when the Setup grid is saved. */
export interface HelpdeskCategoryRow {
  id?: string;
  name: string;
  owner_l1_user_id: string | null;
  display_order: number;
  /** Left out: the stored reply is kept. Blank: it is removed. */
  auto_reply_text?: string;
  delete?: boolean;
}

/** A person who can own or be assigned requests: an admin of this society. */
export interface HelpdeskAssignee {
  user_id: string;
  name: string | null;
  roles: string[];
}

/** One row of the escalation matrix: a category with its owners and windows. */
export interface EscalationRow {
  category_id: string;
  category_name: string;
  display_order: number;
  owner_l1_user_id: string | null;
  owner_l1_name: string | null;
  escalation_l1_l2_hours: number | null;
  owner_l2_user_id: string | null;
  owner_l2_name: string | null;
  escalation_l2_l3_hours: number | null;
  owner_l3_user_id: string | null;
  owner_l3_name: string | null;
  sla_hours: number | null;
  default_priority: string | null;
}

/** What the row editor saves; a blank window or owner is sent as null. */
export interface EscalationRowInput {
  owner_l1_user_id: string;
  escalation_l1_l2_hours: number | null;
  owner_l2_user_id: string | null;
  escalation_l2_l3_hours: number | null;
  owner_l3_user_id: string | null;
  sla_hours: number;
  default_priority: string;
}

/** The email alerts of Setup > Notification Alerts; each is on or off. */
export type NotificationAlerts = Record<
  | 'new_request_owner'
  | 'new_request_committee'
  | 'escalated_owner'
  | 'escalated_committee'
  | 'status_changed_requester'
  | 'resident_reply_owner'
  | 'admin_reply_requester'
  | 'completed_requester',
  boolean
>;

/** The society's helpdesk settings (GET /helpdesk/setup, `settings`). */
export interface HelpdeskSettings {
  operational_days: string[];
  operational_hours_start: string;
  operational_hours_end: string;
  allowed_modes: string[];
  aging_sla_hours: number;
  committee_emails: string[];
  notification_alerts: NotificationAlerts;
  include_contact_in_alerts: boolean;
  auto_reply_outside_hours: boolean;
  auto_reply_outside_hours_text: string | null;
  auto_reply_by_category: boolean;
}

/** What PUT /helpdesk/setup takes: only the fields that change. */
export type HelpdeskSettingsUpdate = Partial<
  Pick<
    HelpdeskSettings,
    | 'committee_emails'
    | 'include_contact_in_alerts'
    | 'operational_days'
    | 'operational_hours_start'
    | 'operational_hours_end'
    | 'auto_reply_by_category'
    | 'auto_reply_outside_hours'
  >
> & {
  notification_alerts?: Partial<NotificationAlerts>;
  auto_reply_outside_hours_text?: string;
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const helpdeskKeys = {
  all: ['helpdesk'] as const,
  categories: () => [...helpdeskKeys.all, 'categories'] as const,
  assignees: () => [...helpdeskKeys.all, 'assignees'] as const,
  escalation: () => [...helpdeskKeys.all, 'escalation'] as const,
  settings: () => [...helpdeskKeys.all, 'settings'] as const,
};

// ---------------------------------------------------------------------------
// Queries and mutations
// ---------------------------------------------------------------------------

export function useHelpdeskCategories() {
  return useQuery({
    queryKey: helpdeskKeys.categories(),
    queryFn: async function fetchCategories() {
      const res = await api.get<{ data: HelpdeskCategory[] }>('/helpdesk/categories');
      return res.data;
    },
  });
}

export function useHelpdeskAssignees() {
  return useQuery({
    queryKey: helpdeskKeys.assignees(),
    // A server that predates the screens answers 404; callers show or hide
    // what depends on it, so no toast.
    meta: { suppressToast: true },
    retry: false,
    queryFn: async function fetchAssignees() {
      const res = await api.get<{ data: HelpdeskAssignee[] }>('/helpdesk/assignees');
      return res.data;
    },
  });
}

export function useSaveHelpdeskCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function saveCategories(rows: HelpdeskCategoryRow[]) {
      const res = await api.put<{ data: HelpdeskCategory[] }>('/helpdesk/categories', { rows });
      return res.data;
    },
    onSuccess: function refresh(saved) {
      queryClient.setQueryData(helpdeskKeys.categories(), saved);
      queryClient.invalidateQueries({ queryKey: ['tickets', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'setup'] });
    },
  });
}

export function useEscalationMatrix() {
  return useQuery({
    queryKey: helpdeskKeys.escalation(),
    queryFn: async function fetchEscalationMatrix() {
      const res = await api.get<{ data: EscalationRow[] }>('/helpdesk/escalation');
      return res.data;
    },
  });
}

export function useSaveEscalationRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function saveEscalationRow(input: {
      categoryId: string;
      body: EscalationRowInput;
    }) {
      const res = await api.put<{ data: EscalationRow }>(
        `/helpdesk/escalation/${input.categoryId}`,
        input.body,
      );
      return res.data;
    },
    onSuccess: function showSavedRow(saved) {
      queryClient.setQueryData<EscalationRow[]>(helpdeskKeys.escalation(), (rows) =>
        (rows ?? []).map((row) => (row.category_id === saved.category_id ? saved : row)),
      );
      // The categories list carries each owner too.
      queryClient.invalidateQueries({ queryKey: helpdeskKeys.categories() });
    },
  });
}

const NO_ALERTS: NotificationAlerts = {
  new_request_owner: false,
  new_request_committee: false,
  escalated_owner: false,
  escalated_committee: false,
  status_changed_requester: false,
  resident_reply_owner: false,
  admin_reply_requester: false,
  completed_requester: false,
};

/** Fills in what a server that predates the alert settings leaves out. */
function withAlertDefaults(settings: HelpdeskSettings): HelpdeskSettings {
  return {
    ...settings,
    notification_alerts: { ...NO_ALERTS, ...settings.notification_alerts },
    include_contact_in_alerts: settings.include_contact_in_alerts ?? false,
    committee_emails: settings.committee_emails ?? [],
    auto_reply_outside_hours: settings.auto_reply_outside_hours ?? false,
    auto_reply_outside_hours_text: settings.auto_reply_outside_hours_text ?? null,
    auto_reply_by_category: settings.auto_reply_by_category ?? false,
  };
}

export function useHelpdeskSettings() {
  return useQuery({
    queryKey: helpdeskKeys.settings(),
    queryFn: async function fetchSettings() {
      const res = await api.get<{ data: { settings: HelpdeskSettings } }>('/helpdesk/setup');
      return res.data.settings;
    },
    select: withAlertDefaults,
  });
}

export function useSaveHelpdeskSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function saveSettings(update: HelpdeskSettingsUpdate) {
      const res = await api.put<{ data: HelpdeskSettings }>('/helpdesk/setup', update);
      return res.data;
    },
    onSuccess: function showSaved(saved) {
      queryClient.setQueryData(helpdeskKeys.settings(), saved);
      queryClient.invalidateQueries({ queryKey: ['helpdesk', 'setup'] });
    },
  });
}
