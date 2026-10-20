'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isNotDeployed } from '@/lib/not-deployed';

/** ASSET-17 — one of the society's inventory categories (`GET /inventory/categories`). */
export interface InventoryCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  /** Items (active or expired) in it. */
  items: number;
}

/** PUT /inventory/categories/bulk rows: the whole list in grid order. */
export interface InventoryCategoryGridRow {
  id?: string;
  name: string;
  is_active: boolean;
}

/** An admin of the society who may be told when stock runs low. */
export interface AlertCandidate {
  user_id: string;
  name: string | null;
  roles: string[];
  ticked: boolean;
}

export const inventorySetupKeys = {
  categories: (includeInactive: boolean) => ['inventory', 'categories', includeInactive] as const,
  allCategories: ['inventory', 'categories'] as const,
  recipients: ['inventory', 'alert-recipients'] as const,
};

const noRetryWhenMissing = (count: number, error: unknown): boolean => !isNotDeployed(error) && count < 2;

export function useInventoryCategories(includeInactive = false) {
  return useQuery({
    queryKey: inventorySetupKeys.categories(includeInactive),
    queryFn: () =>
      api
        .get<{ data: InventoryCategory[] }>('/inventory/categories', { params: includeInactive ? { include_inactive: 'true' } : undefined })
        .then((res) => res.data),
    retry: noRetryWhenMissing,
    staleTime: 60_000,
  });
}

export function useSaveInventoryCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: InventoryCategoryGridRow[]) =>
      api.put<{ data: InventoryCategory[] }>('/inventory/categories/bulk', { rows }).then((res) => res.data),
    onSuccess() {
      // A rename reaches the items' category text too.
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useAlertRecipients() {
  return useQuery({
    queryKey: inventorySetupKeys.recipients,
    queryFn: () => api.get<{ data: AlertCandidate[] }>('/inventory/alert-recipients').then((res) => res.data),
    retry: noRetryWhenMissing,
  });
}

export function useSaveAlertRecipients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      api.put<{ data: AlertCandidate[] }>('/inventory/alert-recipients', { user_ids: userIds }).then((res) => res.data),
    onSuccess(saved) {
      queryClient.setQueryData(inventorySetupKeys.recipients, saved);
    },
  });
}
