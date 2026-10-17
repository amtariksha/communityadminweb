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

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const helpdeskKeys = {
  all: ['helpdesk'] as const,
  categories: () => [...helpdeskKeys.all, 'categories'] as const,
  assignees: () => [...helpdeskKeys.all, 'assignees'] as const,
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
