'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Which ledger's bills a unit-ledger screen shows (INC-14 scopes). */
export type UnitLedgerScope = 'member' | 'utility' | 'all';

/** Defaulter: an open bill past due · Due: open, none past due · Advance: nothing open, advance held · Clear. */
export type UnitDuesStatus = 'defaulter' | 'due' | 'advance' | 'clear';

export type UnitDuesSearchField = 'primary_contact' | 'bill_to' | 'unit' | 'any';

export interface UnitDuesRow {
  unit_id: string;
  unit_number: string;
  block: string | null;
  primary_contact_name: string | null;
  billing_name: string | null;
  status: UnitDuesStatus;
  /** NUMERIC on the wire: a string such as "2000.00". */
  due: string;
  advance: string;
}

export interface UnitDuesResult {
  data: UnitDuesRow[];
  total: number;
  defaulter_count: number;
}

export interface UnitDuesFilters {
  block: string | null;
  q: string;
  q_field: UnitDuesSearchField;
  scope: UnitLedgerScope;
  /** UTIL-08 — only the units billed for utilities (Utility Income). */
  tracked_only?: boolean;
  page: number;
  limit: number;
}

export const unitLedgerKeys = {
  all: ['unit-ledger'] as const,
  units: (filters: UnitDuesFilters) => [...unitLedgerKeys.all, 'units', filters] as const,
};

/** Query parameters of GET /unit-ledger/units; `paged: false` for its export. */
export function unitDuesParams(filters: UnitDuesFilters, opts: { paged?: boolean } = {}): Record<string, string> {
  const params: Record<string, string> = { scope: filters.scope };
  if (opts.paged !== false) {
    params.page = String(filters.page);
    params.limit = String(filters.limit);
  }
  if (filters.block) params.block = filters.block;
  if (filters.tracked_only) params.tracked_only = 'true';
  if (filters.q) {
    params.q = filters.q;
    params.q_field = filters.q_field;
  }
  return params;
}

/** INC-20 — every active unit with what it owes (Member Income › SubLedgers). */
export function useUnitDues(filters: UnitDuesFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: unitLedgerKeys.units(filters),
    queryFn: () => api.get<UnitDuesResult>('/unit-ledger/units', { params: unitDuesParams(filters) }),
    placeholderData: keepPreviousData,
    // Before the API is deployed the route answers 404: the page says so,
    // without a toast and without retrying.
    meta: { suppressToast: true },
    retry: false,
    enabled: options.enabled ?? true,
  });
}
