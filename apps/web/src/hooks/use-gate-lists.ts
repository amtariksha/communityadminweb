import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { getCurrentTenant } from '@/lib/auth';

/** A visitor entry reason with its expected stay in minutes (GATE-41); null stay = the society default. */
export interface EntryReason {
  id: string;
  name: string;
  expected_minutes: number | null;
  is_active: boolean;
  sort_order: number;
}

/** A row of PUT /gate/entry-reasons/bulk: the whole list; a retired reason is `is_active: false`. */
export interface EntryReasonGridRow {
  id?: string;
  name: string;
  expected_minutes: number | null;
  is_active: boolean;
}

/** An incident category (GATE-42). */
export interface IncidentCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

/** A row of PUT /gate/incident-categories/bulk. */
export interface IncidentCategoryGridRow {
  id?: string;
  name: string;
  is_active: boolean;
}

export const gateListKeys = {
  all: ['gate-lists'] as const,
  entryReasons: (tenantId: string, includeInactive: boolean) => [...gateListKeys.all, 'entry-reasons', tenantId, includeInactive] as const,
  incidentCategories: (tenantId: string, includeInactive: boolean) =>
    [...gateListKeys.all, 'incident-categories', tenantId, includeInactive] as const,
};

/** null when the API predates the list (404), so the screen says "not available yet". */
export async function orNullOn404<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** The society's entry reasons (seeded with eleven on the first read). */
export function useEntryReasons(includeInactive = false) {
  const tenantId = getCurrentTenant() ?? '';
  return useQuery({
    queryKey: gateListKeys.entryReasons(tenantId, includeInactive),
    enabled: tenantId !== '',
    queryFn: () =>
      orNullOn404(async () => {
        const res = await api.get<{ data: EntryReason[] }>(
          `/gate/entry-reasons${includeInactive ? '?include_inactive=true' : ''}`,
        );
        return res.data;
      }),
  });
}

export function useSaveEntryReasons() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveEntryReasons(rows: EntryReasonGridRow[]) {
      return api.put<{ data: EntryReason[] }>('/gate/entry-reasons/bulk', { rows });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: gateListKeys.all });
    },
  });
}

/** The society's incident categories (seeded with three on the first read). */
export function useIncidentCategories(includeInactive = false) {
  const tenantId = getCurrentTenant() ?? '';
  return useQuery({
    queryKey: gateListKeys.incidentCategories(tenantId, includeInactive),
    enabled: tenantId !== '',
    queryFn: () =>
      orNullOn404(async () => {
        const res = await api.get<{ data: IncidentCategory[] }>(
          `/gate/incident-categories${includeInactive ? '?include_inactive=true' : ''}`,
        );
        return res.data;
      }),
  });
}

export function useSaveIncidentCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveIncidentCategories(rows: IncidentCategoryGridRow[]) {
      return api.put<{ data: IncidentCategory[] }>('/gate/incident-categories/bulk', { rows });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: gateListKeys.all });
    },
  });
}
