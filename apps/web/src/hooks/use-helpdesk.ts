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
}

/** One row sent when the Setup grid is saved. */
export interface HelpdeskCategoryRow {
  id?: string;
  name: string;
  owner_l1_user_id: string | null;
  display_order: number;
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

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const helpdeskKeys = {
  all: ['helpdesk'] as const,
  categories: () => [...helpdeskKeys.all, 'categories'] as const,
  assignees: () => [...helpdeskKeys.all, 'assignees'] as const,
  escalation: () => [...helpdeskKeys.all, 'escalation'] as const,
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
