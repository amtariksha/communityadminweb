'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import type { JournalEntryRow } from './use-journal-entries';
import { ledgerKeys } from './use-ledger';

/** GET /ledger/query/lines (GL-17): what By Account Group asks for. */
export interface LedgerQueryParams {
  from: string;
  to: string;
  accountType?: string;
  groupId?: string;
  accountId?: string;
  page: number;
}

export interface LedgerQueryLine {
  line_id: string;
  entry_id: string;
  entry_number: number;
  entry_date: string;
  source_type: string | null;
  narration: string;
  account_id: string;
  account_code: string | null;
  account_name: string;
  debit: string;
  credit: string;
  posted_by_name: string | null;
  is_reversed: boolean;
  is_reversal: boolean;
  document_type: string | null;
  document_number: string | null;
}

export interface LedgerQueryResult {
  data: LedgerQueryLine[];
  total: number;
  totals: { debit: string; credit: string };
}

export const QUERY_PAGE_SIZE = 100;

async function orNotAvailable<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** The lines; null on an API older than GL-17 (the page says not available yet). */
export function useLedgerQueryLines(params: LedgerQueryParams | null) {
  return useQuery({
    queryKey: [...ledgerKeys.reports(), 'query-lines', params],
    enabled: params !== null,
    queryFn: () => {
      const p = params as LedgerQueryParams;
      const query: Record<string, string> = { from_date: p.from, to_date: p.to, page: String(p.page), limit: String(QUERY_PAGE_SIZE) };
      if (p.accountType) query.account_type = p.accountType;
      if (p.groupId) query.group_id = p.groupId;
      if (p.accountId) query.account_id = p.accountId;
      return orNotAvailable(() => api.get<LedgerQueryResult>('/ledger/query/lines', { params: query }));
    },
  });
}

/** Query › By User (GL-17, screen GL-S12). */
export interface ByUserParams {
  postedBy: string; // '' = all, 'system' or a user id
  documentType: 'all' | 'invoices_credit_notes' | 'collections' | 'vendor_bills_payments' | 'journal_entries';
  createdFrom: string;
  createdTo: string;
  from: string;
  to: string;
  count: number;
  startingFrom: number;
  voidedOnly: boolean;
}

export function byUserQuery(p: ByUserParams): Record<string, string> {
  const query: Record<string, string> = { limit: String(p.count), offset: String(Math.max(p.startingFrom - 1, 0)) };
  if (p.postedBy) query.posted_by = p.postedBy;
  if (p.documentType !== 'all') query.document_type = p.documentType;
  if (p.createdFrom) query.created_from = p.createdFrom;
  if (p.createdTo) query.created_to = p.createdTo;
  if (p.from) query.start_date = p.from;
  if (p.to) query.end_date = p.to;
  if (p.voidedOnly) query.voided_only = 'true';
  return query;
}

export function useJournalEntriesByUser(params: ByUserParams | null) {
  return useQuery({
    queryKey: [...ledgerKeys.journalEntries(), 'by-user', params],
    enabled: params !== null,
    queryFn: () => api.get<{ data: JournalEntryRow[]; total: number }>('/ledger/journal-entries', { params: byUserQuery(params as ByUserParams) }),
  });
}

/** Who has posted entries; null on an older API (only All and System are offered). */
export function useJournalPosters() {
  return useQuery({
    queryKey: [...ledgerKeys.journalEntries(), 'posters'],
    queryFn: () => orNotAvailable(() => api.get<{ data: Array<{ user_id: string; name: string | null }> }>('/ledger/query/posters').then((res) => res.data)),
  });
}
