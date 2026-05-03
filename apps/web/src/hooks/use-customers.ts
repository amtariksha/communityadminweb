'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Customer, CustomerWithOutstanding } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Customer hooks — AR-side mirror of use-vendors. Kept structurally
// identical so any future vendor hook patterns (caching, retry,
// background refetch tuning) can be lifted across without rework.
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface CustomerFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

interface CreateCustomerInput {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  pan?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  notes?: string | null;
}

interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  is_active?: boolean;
}

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters?: CustomerFilters) =>
    [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

function filtersToParams(
  filters?: CustomerFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.is_active !== undefined)
    params.is_active = String(filters.is_active);
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: function fetchCustomers() {
      return api.get<PaginatedResponse<Customer>>('/customers', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: function fetchCustomer() {
      return api
        .get<{ data: CustomerWithOutstanding }>(`/customers/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createCustomer(input: CreateCustomerInput) {
      return api.post<{ data: Customer }>('/customers', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateCustomer(params: {
      id: string;
      data: UpdateCustomerInput;
    }) {
      return api.patch<{ data: Customer }>(
        `/customers/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deactivateCustomer(id: string) {
      return api.delete<{ message: string }>(`/customers/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

// Phase C.3 — Sundry-Debtor → unit converter (Tally migration helper).
// Converts a customer (typically a Tally-imported Sundry Debtors child)
// into a unit-linked opening balance: posts a transfer JE, creates an
// opening invoice on the unit, deactivates the customer.
interface ConvertToUnitInput {
  unit_id: string;
  opening_income_account_id?: string;
  invoice_date?: string;
}

interface ConvertToUnitResult {
  invoice_id: string | null;
  invoice_number: string | null;
  transferred_amount: number;
  customer_deactivated: boolean;
}

export function useConvertCustomerToUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function convert(params: {
      id: string;
      data: ConvertToUnitInput;
    }) {
      return api.post<{ data: ConvertToUnitResult }>(
        `/customers/${params.id}/convert-to-unit`,
        params.data,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      // The conversion creates an opening invoice — invalidate the
      // invoices list so it surfaces immediately.
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
