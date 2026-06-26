'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken, getCurrentTenant } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Egress-disciplined polling (P0-B)
// ---------------------------------------------------------------------------
// The Tally pollers used to hammer /active-jobs, /history and /jobs/:id at a
// flat 3s for the whole life of an import — each poll dragging JSONB across
// Supabase egress. We now back off (3s → 10s → 30s) the longer a job runs and
// stop entirely when the tab is hidden. `updateCount` is React Query's
// successful-refetch counter, so the interval widens automatically per poll.

const POLL_FAST_MS = 3_000;
const POLL_MID_MS = 10_000;
const POLL_SLOW_MS = 30_000;

/** True when the tab is backgrounded — pause polling so no request fires. */
function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/** 3s for the first few polls, then widen toward a 30s ceiling. */
function backoffInterval(updateCount: number): number {
  if (updateCount < 3) return POLL_FAST_MS;
  if (updateCount < 6) return POLL_MID_MS;
  return POLL_SLOW_MS;
}

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
    costCentres?: number;
    voucherTypes?: number;
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
    cost_centres?: { new: number; changed: number; unchanged: number; conflict: number };
    voucher_types?: { new: number; changed: number; unchanged: number; conflict: number };
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
 * FeatPlan — Gemini-parsed sundry-debtor ledger row. The review
 * screen pre-fills its inputs from this; admin can edit before
 * submit.
 */
export interface TallyDebtorParseResult {
  /** Original ledger name as stored in Tally / committed. */
  name: string;
  /** Backfill path includes the ledger_id; new-import path omits it. */
  ledger_id?: string;
  parsed: {
    unit_number: string | null;
    owner_names: string[];
    confidence: number;
    raw?: string;
  };
}

/**
 * FeatPlan — operator decision for one sundry-debtor row at commit
 * time. `ledger_name` matches against the committed ledger by
 * case-insensitive name (the row may not have an id at request time
 * — id-based matching is the backfill path's `ledger_id`).
 */
export interface TallyDebtorLinkInput {
  ledger_name: string;
  skip?: boolean;
  unit_id?: string;
  unit_number?: string;
  owners?: { name: string }[];
}

/**
 * FeatPlan — backfill path's link payload. Same shape as
 * TallyDebtorLinkInput but keyed by id.
 */
export interface TallyDebtorLinkByIdInput {
  ledger_id: string;
  skip?: boolean;
  unit_id?: string;
  unit_number?: string;
  owners?: { name: string }[];
}

/**
 * FeatPlan — per-row result returned by both the inline commit
 * (alongside masters' DispositionCounts) and the standalone
 * /debtors/link endpoint.
 */
export interface TallyDebtorLinkResult {
  ledger_name: string;
  status: 'linked' | 'skipped' | 'failed';
  unit_id?: string;
  customer_id?: string;
  member_ids?: string[];
  error?: string;
}

/**
 * Response from `POST /tally-import/commit` — the real results once
 * the parsed records have been written.
 */
export interface TallyCommitResult {
  groups?: TallyDispositionCounts;
  ledgers?: TallyDispositionCounts;
  vouchers?: TallyDispositionCounts;
  cost_centres?: TallyDispositionCounts;
  voucher_types?: TallyDispositionCounts;
  /** Aggregate of new + updated across all ticked types. */
  records_imported: number;
  /** Aggregate of unchanged + conflict + per-row errors. */
  records_skipped: number;
  /** Concatenated per-type error messages. */
  errors: string[];
  /**
   * FeatPlan — per-row outcome of the sundry-debtor auto-link
   * pass that runs after the masters commit. Empty array when the
   * commit didn't include `debtor_links`.
   */
  debtor_links?: TallyDebtorLinkResult[];
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
  cost_centres?: { include_new?: boolean; include_changed?: boolean };
  voucher_types?: { include_new?: boolean; include_changed?: boolean };
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
  activeJobs: () => [...tallyImportKeys.all, 'active-jobs'] as const,
};

export interface TallyActiveJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  stage: string | null;
  processed: number;
  total_records: number;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * List queued / running / just-completed Tally commit jobs for the
 * tenant. Polls every 3 s while there's an active job so the
 * "Currently running" strip live-updates.
 */
export function useTallyActiveJobs(enabled = true) {
  return useQuery({
    queryKey: tallyImportKeys.activeJobs(),
    enabled,
    queryFn: async () => {
      const res = await api.get<{ data: TallyActiveJob[] }>(
        '/tally-import/active-jobs',
      );
      return res.data;
    },
    refetchInterval: (query) => {
      if (isHidden()) return false;
      const data = query.state.data as TallyActiveJob[] | undefined;
      if (!data || data.length === 0) return false;
      const hasInFlight = data.some(
        (j) => j.status === 'queued' || j.status === 'running',
      );
      return hasInFlight ? backoffInterval(query.state.dataUpdateCount) : false;
    },
    refetchIntervalInBackground: false,
  });
}

/**
 * Recent import history. Pass `enabled={dialogOpen}` so the (heavier)
 * /history call only fires while the import dialog is open — a closed
 * accounts page should make ZERO history requests.
 */
export function useTallyImportHistory(enabled = true) {
  return useQuery({
    queryKey: tallyImportKeys.history(),
    enabled,
    queryFn: function fetchHistory() {
      return api
        .get<{ data: TallyImportHistory[] }>('/tally-import/history')
        .then((res) => res.data);
    },
    // Auto-poll (with backoff) while any import is still running so the
    // history strip live-updates without the operator hitting refresh.
    // React Query stops the interval as soon as everything settles or
    // the tab is hidden.
    refetchInterval: (query) => {
      if (isHidden()) return false;
      const data = query.state.data as TallyImportHistory[] | undefined;
      if (!data) return false;
      const hasRunning = data.some(
        (row) =>
          row.status === 'running' ||
          row.status === 'queued' ||
          row.status === 'pending',
      );
      return hasRunning ? backoffInterval(query.state.dataUpdateCount) : false;
    },
    refetchIntervalInBackground: false,
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

/**
 * Multipart-upload variant of XML import. Same response shape as
 * useTallyXmlImport, but the file streams over multipart/form-data
 * instead of being JSON-encoded — saves the ~2× memory cost of
 * JSON.stringify on a 30 MB XML and supports up to 100 MB on the
 * server (controller's FileInterceptor cap). Use this with a native
 * <input type="file"> picker.
 */
export function useTallyXmlUpload() {
  return useMutation({
    mutationFn: async function uploadXml(file: File) {
      const formData = new FormData();
      formData.append('file', file);
      // axios infers multipart Content-Type from FormData
      // automatically; explicit headers would clobber the boundary.
      return api.post<{ data: TallyImportParseResult }>(
        '/tally-import/upload',
        formData,
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
      // FeatPlan — debtor auto-link decisions. Posted alongside the
      // per-type selection so the auto-link runs in the same call as
      // the masters commit. Omit (or empty array) for masters-only
      // imports — preserves legacy behaviour.
      debtor_links?: TallyDebtorLinkInput[];
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
      // FeatPlan — units + members + customers may have been
      // created via the debtor_links path. Refresh those too so
      // the Members directory and Units page show new rows
      // immediately.
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-members'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ---------------------------------------------------------------------------
// FeatPlan — sundry-debtor auto-link hooks
// ---------------------------------------------------------------------------

/**
 * Trigger the Gemini parser on a Tally import preview's
 * sundry-debtor ledgers. Result is cached on the preview row so a
 * second call is a no-op DB read.
 */
export function useParseImportDebtors() {
  return useMutation({
    mutationFn: function parseImportDebtors(input: { import_id: string }) {
      return api
        .post<{ data: TallyDebtorParseResult[] }>(
          `/tally-import/imports/${input.import_id}/debtors/parse`,
          {},
        )
        .then((res) => res.data);
    },
  });
}

/**
 * Backfill — list every existing sundry-debtor ledger that has no
 * customers row pointing at it. Drives the
 * /accounts/reconcile-debtors page.
 */
export function useUnlinkedDebtors(enabled = true) {
  return useQuery({
    queryKey: [...tallyImportKeys.all, 'unlinked-debtors'],
    enabled,
    queryFn: async () => {
      const res = await api.get<{ data: Array<{ id: string; name: string }> }>(
        '/tally-import/debtors/unlinked',
      );
      return res.data;
    },
    staleTime: 30_000,
  });
}

/**
 * Backfill — run the parser on a selection of existing ledger rows.
 * Returns parsed (unit_number, owner_names) per row plus the
 * ledger_id so the caller can post link decisions back without a
 * second lookup.
 */
export function useParseExistingDebtors() {
  return useMutation({
    mutationFn: function parseExisting(input: { ledger_ids: string[] }) {
      return api
        .post<{ data: TallyDebtorParseResult[] }>(
          '/tally-import/debtors/parse',
          input,
        )
        .then((res) => res.data);
    },
  });
}

/**
 * Backfill — commit link decisions for existing ledger rows.
 * Server creates units / members / customers per the same shape as
 * the inline commit path.
 */
export function useLinkExistingDebtors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function linkExisting(input: {
      links: TallyDebtorLinkByIdInput[];
    }) {
      return api
        .post<{ data: TallyDebtorLinkResult[] }>(
          '/tally-import/debtors/link',
          input,
        )
        .then((res) => res.data);
    },
    onSuccess() {
      // Refresh the unlinked list (the linked ones drop off) plus
      // every downstream cache that may have new rows.
      queryClient.invalidateQueries({
        queryKey: [...tallyImportKeys.all, 'unlinked-debtors'],
      });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit-members'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

/**
 * Phase 2 — async commit. Enqueues a BullMQ job server-side and
 * returns the job_id immediately. The UI then polls
 * useTallyCommitJob until status flips to 'done' or 'failed'.
 *
 * Use this for any commit that might exceed the nginx 120s proxy
 * timeout (typically vouchers > ~1500). The synchronous
 * useTallyCommitImport above stays for small / fast commits where
 * the operator wants the result inline.
 */
export function useTallyEnqueueCommit() {
  return useMutation({
    mutationFn: function enqueueCommit(input: {
      import_id: string;
      commit?: TallyCommitSelection;
      force?: boolean;
    }) {
      return api
        .post<{ data: { job_id: string; status: 'queued' } }>(
          '/tally-import/commit-async',
          input,
        )
        .then((res) => res.data);
    },
  });
}

export interface TallyCommitJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  stage: string | null;
  processed: number;
  total_records: number;
  result: TallyCommitResult | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Poll a Tally commit job. Emits the status row at the configured
 * interval until the job settles (status='done' | 'failed' |
 * 'cancelled'); after that React Query stops the interval
 * automatically.
 *
 * Call with `enabled: jobId !== ''` from the dialog so polling
 * only happens while there's a job to watch.
 */
export function useTallyCommitJob(jobId: string, enabled = true) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...tallyImportKeys.all, 'jobs', jobId],
    enabled: enabled && jobId !== '',
    queryFn: async () => {
      const res = await api.get<{ data: TallyCommitJob }>(
        `/tally-import/jobs/${jobId}`,
      );
      const job = res.data;
      // On settle, invalidate the downstream caches once so the
      // accounts / ledger / invoices pages refetch their fresh
      // state without the operator having to reload.
      if (job.status === 'done' || job.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: tallyImportKeys.all });
        queryClient.invalidateQueries({ queryKey: ['ledger'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      }
      return job;
    },
    // Poll with backoff while running; stop on terminal state or when
    // the tab is hidden. React Query halts the interval once this
    // returns false.
    refetchInterval: (query) => {
      if (isHidden()) return false;
      const data = query.state.data as TallyCommitJob | undefined;
      if (!data) return POLL_FAST_MS;
      if (data.status === 'done' || data.status === 'failed' || data.status === 'cancelled') {
        return false;
      }
      return backoffInterval(query.state.dataUpdateCount);
    },
    refetchIntervalInBackground: false,
    // Don't cache stale state across dialog reopens — the next
    // commit should always start from a fresh poll.
    staleTime: 0,
  });
}

export function useDownloadInvoicePdf() {
  return useMutation({
    mutationFn: async function downloadPdf(invoiceId: string) {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ??
        (typeof window !== 'undefined' && window.location.hostname === 'meragharadmin.amtariksha.com'
          ? 'https://meraghar.amtariksha.com'
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
