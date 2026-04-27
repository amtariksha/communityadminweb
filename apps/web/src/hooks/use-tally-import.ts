'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken, getCurrentTenant } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Response from `POST /tally-import/{xml|csv}`. The backend parses
 * the XML and stores the result keyed by `import_id` (DB-backed
 * since migration 052 — survives PM2 worker round-robin). The XML
 * path also returns per-type counts + a classification breakdown
 * so the preview UI can render checkboxes without re-parsing.
 */
export interface TallyImportParseResult {
  import_id: string;
  records_parsed: number;
  /**
   * Per-entity-type counts of what's IN the file. Always populated
   * for XML imports (post Phase 1 of the import revamp); CSV
   * imports only populate the legacy `records_parsed` and leave
   * counts undefined.
   */
  counts?: {
    groups: number;
    ledgers: number;
    vouchers: number;
  };
  /**
   * SHA-256 of the raw XML. The commit endpoint uses this to dedupe
   * re-uploads of the same file within a 24h window unless the
   * operator passes `force: true`.
   */
  file_hash?: string;
  /**
   * If a recent commit of the same file_hash exists for this tenant
   * (within 24h), the server populates this so the UI can warn
   * before the operator hits Commit again.
   */
  duplicate_of?: { import_id: string; created_at: string } | null;
  /**
   * Per-disposition breakdown computed by classifying every parsed
   * entity against the existing DB rows. UI uses this to render
   * "X new · Y changed · Z unchanged · N conflict" per type.
   */
  classification?: {
    groups: { new: number; changed: number; unchanged: number; conflict: number };
    ledgers: { new: number; changed: number; unchanged: number; conflict: number };
    vouchers: { new: number; changed: number; unchanged: number; conflict: number };
  };
  /** Human-readable next-step hint from the server. */
  message?: string;
}

/**
 * Per-disposition counts the commit endpoint returns for each ticked
 * entity type. Mirrors the server-side `DispositionCounts`.
 */
export interface TallyDispositionCounts {
  new: number;
  updated: number;
  unchanged: number;
  conflict: number;
  errors: string[];
}

/**
 * Response from `POST /tally-import/commit` — the real results once
 * the parsed records have been written.
 */
export interface TallyCommitResult {
  groups?: TallyDispositionCounts;
  ledgers?: TallyDispositionCounts;
  vouchers?: TallyDispositionCounts;
  /** Aggregate of new + updated across all ticked types. */
  records_imported: number;
  /** Aggregate of unchanged + conflict + per-row errors. */
  records_skipped: number;
  /** Concatenated per-type error messages. */
  errors: string[];
}

/**
 * Per-type include flags the operator picks via the preview
 * checkboxes. An omitted top-level key (e.g. no `groups`) means
 * "skip this type entirely". Within a type, both flags default to
 * true on the server.
 */
export interface TallyCommitSelection {
  groups?: { include_new?: boolean; include_changed?: boolean };
  ledgers?: { include_new?: boolean; include_changed?: boolean };
  vouchers?: { include_new?: boolean; include_changed?: boolean };
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
 * `import_id` returned from the parse hooks above plus the per-type
 * `commit` selection from the operator's preview checkboxes. The
 * `force` flag bypasses the 24h file-hash dedupe; per-voucher hash +
 * edited-locally guards still apply downstream.
 */
export function useTallyCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function commitImport(input: {
      import_id: string;
      commit?: TallyCommitSelection;
      force?: boolean;
    }) {
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
