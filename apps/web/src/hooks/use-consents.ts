'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Units & Users › Consent Activity (UNIT-37): who gave or withdrew which kind
 * of message, read-only. GET /units/consents (+ /export) and
 * GET /units/consents/:userId/history. An API without them answers 404 and
 * the page says "not available yet".
 */
export type ConsentCategory = 'essential_updates' | 'third_party_offers';
export type ConsentAnswer = 'given' | 'withdrawn' | 'not_answered';

export const CONSENT_CATEGORIES: ReadonlyArray<{ key: ConsentCategory; label: string }> = [
  { key: 'essential_updates', label: 'Essential Community Updates' },
  { key: 'third_party_offers', label: 'Third-Party Deals and Offers' },
];

export interface ConsentRow {
  user_id: string;
  name: string | null;
  units: string;
  essential_updates: boolean | null;
  third_party_offers: boolean | null;
  updated_at: string | null;
}

export interface ConsentList {
  data: ConsentRow[];
  total: number;
}

export interface ConsentChange {
  id: string;
  category: ConsentCategory;
  old_value: boolean | null;
  new_value: boolean;
  changed_at: string;
  source: 'resident_app' | 'resident_web' | 'admin_import';
}

export interface ConsentFilters {
  category: ConsentCategory | '';
  answer: ConsentAnswer | '';
  search: string;
  page: number;
  limit: number;
}

/** Given / Withdrawn / Not answered, as the screen says it. */
export function consentLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Given';
  if (value === false) return 'Withdrawn';
  return 'Not answered';
}

export const SOURCE_LABELS: Readonly<Record<ConsentChange['source'], string>> = {
  resident_app: 'Resident app',
  resident_web: 'Resident web',
  admin_import: 'Import',
};

export function consentParams(filters: Omit<ConsentFilters, 'page' | 'limit'>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.answer) params.answer = filters.answer;
  if (filters.search) params.search = filters.search;
  return params;
}

export function useConsents(filters: ConsentFilters) {
  return useQuery({
    queryKey: ['consents', 'list', filters] as const,
    placeholderData: keepPreviousData,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchConsents({ signal }) {
      return api.get<ConsentList>('/units/consents', {
        params: { ...consentParams(filters), page: String(filters.page), limit: String(filters.limit) },
        signal,
      });
    },
  });
}

export function useConsentHistory(userId: string | null) {
  return useQuery({
    queryKey: ['consents', 'history', userId] as const,
    enabled: userId !== null,
    meta: { suppressToast: true },
    retry: false,
    queryFn: function fetchConsentHistory({ signal }) {
      return api.get<{ data: ConsentChange[]; name: string | null }>(`/units/consents/${userId}/history`, { signal });
    },
  });
}
