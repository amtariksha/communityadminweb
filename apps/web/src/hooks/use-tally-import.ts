'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken, getCurrentTenant } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Response from `POST /tally-import/{xml|csv}`. The backend only PARSES
 * at this point and stores the parsed data under `import_id` in an
 * in-memory preview store. Actual DB writes happen on the follow-up
 * `POST /tally-import/commit` call — see [[TallyCommitResult]].
 */
export interface TallyImportParseResult {
  import_id: string;
  records_parsed: number;
  /** Human-readable next-step hint from the server. */
  message?: string;
}

/**
 * Response from `POST /tally-import/commit` — the real results once
 * the parsed records have been written to groups / ledgers / vouchers
 * / receipts / payments.
 */
export interface TallyCommitResult {
  records_imported: number;
  records_skipped: number;
  /** Per-record error strings. May be omitted / undefined on a clean run. */
  errors?: string[];
}

/**
 * Legacy combined shape used by the accounts-content UI. Kept for
 * backward compat — in practice the UI builds this by merging the
 * parse result with the commit result.
 */
export interface TallyImportResult {
  import_id: string;
  records_parsed: number;
  records_imported: number;
  records_skipped: number;
  records_failed: number;
  errors: Array<{ row?: number; message: string }>;
  summary: Record<string, number>;
}

export interface TallyImportHistory {
  id: string;
  import_type: string;
  source_type: string;
  file_name: string | null;
  records_parsed: number;
  records_imported: number;
  records_skipped: number;
  records_failed: number;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tallyImportKeys = {
  all: ['tally-import'] as const,
  history: () => [...tallyImportKeys.all, 'history'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTallyImportHistory() {
  return useQuery({
    queryKey: tallyImportKeys.history(),
    queryFn: function fetchHistory() {
      return api
        .get<{ data: TallyImportHistory[] }>('/tally-import/history')
        .then((res) => res.data);
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useTallyXmlImport() {
  // Parse-only; no cache invalidation yet because nothing has been
  // written to the DB. Invalidation happens on useTallyCommitImport
  // success.
  return useMutation({
    mutationFn: function importXml(input: {
      xml_content: string;
      import_type: 'groups' | 'ledgers' | 'vouchers' | 'all';
      file_name?: string;
    }) {
      return api.post<{ data: TallyImportParseResult }>(
        '/tally-import/xml',
        input,
      );
    },
  });
}

export function useTallyCsvImport() {
  // Parse-only — see useTallyXmlImport comment.
  return useMutation({
    mutationFn: function importCsv(input: {
      csv_content: string;
      import_type:
        | 'trial_balance'
        | 'day_book'
        | 'ledger_report'
        | 'receipt_register'
        | 'payment_register';
      file_name?: string;
    }) {
      return api.post<{ data: TallyImportParseResult }>(
        '/tally-import/csv',
        input,
      );
    },
  });
}

/**
 * Commit a previously-parsed import. Must be called with the
 * `import_id` returned from the parse hooks above. Once this
 * resolves the records are written to the DB; only then do we
 * invalidate downstream caches.
 */
export function useTallyCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function commitImport(input: { import_id: string }) {
      return api.post<{ data: TallyCommitResult }>(
        '/tally-import/commit',
        input,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tallyImportKeys.all });
      // Accounts / ledger / invoices / receipts / vendors can all
      // change depending on the import type.
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async function downloadPdf(invoiceId: string) {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ??
        (typeof window !== 'undefined' && window.location.hostname === 'communityos.eassy.life'
          ? 'https://community.eassy.life'
          : 'http://localhost:4000');

      const token = getToken();
      const tenantId = getCurrentTenant();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['x-tenant-id'] = tenantId;

      const response = await fetch(`${baseUrl}/invoices/${invoiceId}/pdf`, { headers });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
