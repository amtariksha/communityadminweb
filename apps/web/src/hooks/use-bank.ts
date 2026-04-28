'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BankAccount,
  BankTransfer,
  BankReconciliation,
  FixedDeposit,
} from '@communityos/shared';
import { ledgerKeys } from '@/hooks/use-ledger';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface ReconciliationData {
  bank_account: BankAccount;
  book_balance: number;
  statement_balance: number;
  unreconciled_items: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    source_type: string;
    source_id: string;
  }>;
}

interface BRSSummary {
  bank_account_id: string;
  book_balance: number;
  add_credits_not_in_book: number;
  less_debits_not_in_book: number;
  adjusted_book_balance: number;
  statement_balance: number;
  add_deposits_in_transit: number;
  less_outstanding_checks: number;
  adjusted_statement_balance: number;
  difference: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface TransferFilters {
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateBankAccountInput {
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  branch: string;
  opening_balance?: number;
  is_primary?: boolean;
}

interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {
  is_active?: boolean;
}

interface CreateTransferInput {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  reference_number?: string | null;
  narration?: string;
}

interface ReconcileTransactionInput {
  bank_date?: string;
  // Admin-web passes `statement_date` + `statement_balance`; backend
  // accepts either naming.
  statement_date?: string;
  statement_balance?: number;
}

interface CreateFDInput {
  bank_account_id: string;
  // QA #102 — `fd_account_id` is the only key the backend accepts (Zod
  // strips the rest). Was previously typed as either `fd_account_id` OR
  // `ledger_account_id`; the latter never worked.
  fd_account_id: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: string;
  maturity_date: string;
  maturity_amount: number;
  interest_account_id?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const bankKeys = {
  all: ['bank'] as const,

  accounts: () => [...bankKeys.all, 'accounts'] as const,
  account: (id: string) => [...bankKeys.accounts(), id] as const,

  transfers: () => [...bankKeys.all, 'transfers'] as const,
  transferList: (filters?: TransferFilters) =>
    [...bankKeys.transfers(), 'list', filters] as const,

  reconciliation: (accountId: string, startDate: string, endDate: string) =>
    [...bankKeys.all, 'reconciliation', accountId, startDate, endDate] as const,
  brsSummary: (accountId: string) =>
    [...bankKeys.all, 'brs-summary', accountId] as const,

  fixedDeposits: () => [...bankKeys.all, 'fixed-deposits'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function transferFiltersToParams(
  filters?: TransferFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Bank Account queries
// ---------------------------------------------------------------------------

export function useBankAccounts() {
  return useQuery({
    queryKey: bankKeys.accounts(),
    queryFn: function fetchBankAccounts() {
      return api
        .get<{ data: BankAccount[] }>('/bank/accounts')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useBankAccount(id: string) {
  return useQuery({
    queryKey: bankKeys.account(id),
    queryFn: function fetchBankAccount() {
      return api
        .get<{ data: BankAccount }>(`/bank/accounts/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Bank Account mutations
// ---------------------------------------------------------------------------

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createBankAccount(input: CreateBankAccountInput) {
      return api.post<{ data: BankAccount }>('/bank/accounts', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateBankAccount(params: {
      id: string;
      data: UpdateBankAccountInput;
    }) {
      return api.patch<{ data: BankAccount }>(
        `/bank/accounts/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: bankKeys.account(variables.id) });
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
    },
  });
}

// ---------------------------------------------------------------------------
// Transfer queries
// ---------------------------------------------------------------------------

export function useBankTransfers(filters?: TransferFilters) {
  return useQuery({
    queryKey: bankKeys.transferList(filters),
    queryFn: function fetchBankTransfers() {
      return api.get<PaginatedResponse<BankTransfer>>('/bank/transfers', {
        params: transferFiltersToParams(filters),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Transfer mutations
// ---------------------------------------------------------------------------

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createTransfer(input: CreateTransferInput) {
      return api.post<{ data: BankTransfer }>('/bank/transfers', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.transfers() });
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// ---------------------------------------------------------------------------
// Reconciliation queries
// ---------------------------------------------------------------------------

export function useReconciliation(
  accountId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: bankKeys.reconciliation(accountId, startDate, endDate),
    queryFn: function fetchReconciliation() {
      return api
        .get<{ data: ReconciliationData }>(`/bank/reconciliation/${accountId}`, {
          params: { start_date: startDate, end_date: endDate },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: accountId !== '' && startDate !== '' && endDate !== '',
  });
}

export function useBRSSummary(accountId: string) {
  return useQuery({
    queryKey: bankKeys.brsSummary(accountId),
    queryFn: function fetchBRSSummary() {
      return api
        .get<{ data: BRSSummary }>(`/bank/reconciliation/${accountId}/summary`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: accountId !== '',
  });
}

// ---------------------------------------------------------------------------
// Reconciliation mutations
// ---------------------------------------------------------------------------

export function useReconcileTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function reconcileTransaction(params: {
      id: string;
      data: ReconcileTransactionInput;
    }) {
      return api.post<{ data: BankReconciliation }>(
        `/bank/reconciliation/${params.id}/reconcile`,
        params.data,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Fixed Deposit queries
// ---------------------------------------------------------------------------

export function useFixedDeposits() {
  return useQuery({
    queryKey: bankKeys.fixedDeposits(),
    queryFn: function fetchFixedDeposits() {
      return api
        .get<{ data: FixedDeposit[] }>('/bank/fixed-deposits')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Fixed Deposit mutations
// ---------------------------------------------------------------------------

export function useCreateFD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createFD(input: CreateFDInput) {
      return api.post<{ data: FixedDeposit }>('/bank/fixed-deposits', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.fixedDeposits() });
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useMatureFD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function matureFD(id: string) {
      return api.post<{ data: FixedDeposit }>(`/bank/fixed-deposits/${id}/mature`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.fixedDeposits() });
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useRenewFD() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function renewFD(params: {
      id: string;
      // QA #103 — backend renewFDSchema only accepts new_rate /
      // new_maturity_date. Other keys get stripped by Zod and the
      // renewal silently no-ops.
      data?: {
        new_rate?: number;
        new_maturity_date?: string;
      };
    }) {
      return api.post<{ data: FixedDeposit }>(
        `/bank/fixed-deposits/${params.id}/renew`,
        params.data,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.fixedDeposits() });
      queryClient.invalidateQueries({ queryKey: bankKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// ---------------------------------------------------------------------------
// Bank Statement Import
// ---------------------------------------------------------------------------

export interface StatementRow {
  id: string;
  transaction_date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  match_status: 'unmatched' | 'auto_matched' | 'manual_matched' | 'excluded';
  matched_journal_entry_id: string | null;
  je_narration?: string;
  je_entry_number?: string;
  import_batch_id: string;
  imported_at: string;
}

export function useStatementRows(
  accountId: string,
  matchStatus?: string,
  batchId?: string,
) {
  return useQuery({
    queryKey: [...bankKeys.all, 'statement-rows', accountId, matchStatus, batchId] as const,
    queryFn: function fetchRows() {
      const params: Record<string, string> = {};
      if (matchStatus) params.match_status = matchStatus;
      if (batchId) params.batch_id = batchId;
      return api.get<{ data: StatementRow[]; total: number }>(
        `/bank/statement-rows/${accountId}`,
        { params },
      );
    },
    enabled: accountId !== '',
  });
}

export function useImportStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function importStatement(input: {
      bank_account_id: string;
      rows: Array<{
        transaction_date: string;
        description: string;
        debit: number;
        credit: number;
        balance?: number;
      }>;
    }) {
      return api.post<{
        data: { total_rows: number; auto_matched: number; unmatched: number; batch_id: string };
      }>('/bank/import-statement', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
  });
}

export function useManualMatchRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function manualMatch(input: { row_id: string; journal_entry_id: string }) {
      return api.post(`/bank/statement-rows/${input.row_id}/match`, {
        journal_entry_id: input.journal_entry_id,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
  });
}

export function useExcludeRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function excludeRow(rowId: string) {
      return api.post(`/bank/statement-rows/${rowId}/exclude`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Cheque Management
// ---------------------------------------------------------------------------

export interface Cheque {
  id: string;
  bank_account_id: string;
  bank_name: string;
  cheque_number: string;
  payee: string;
  amount: number;
  issue_date: string;
  clearing_date: string | null;
  bounce_date: string | null;
  status: 'issued' | 'cleared' | 'bounced' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export function useCheques(bankAccountId?: string, status?: string) {
  return useQuery({
    queryKey: [...bankKeys.all, 'cheques', bankAccountId, status] as const,
    queryFn: function fetchCheques() {
      const params: Record<string, string> = {};
      if (bankAccountId) params.bank_account_id = bankAccountId;
      if (status) params.status = status;
      return api.get<{ data: Cheque[]; total: number }>('/bank/cheques', { params });
    },
  });
}

export function useIssueCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function issueCheque(input: {
      bank_account_id: string;
      cheque_number: string;
      payee: string;
      amount: number;
      issue_date: string;
      payee_ledger_account_id: string;
      vendor_bill_id?: string;
      notes?: string;
    }) {
      return api.post('/bank/cheques', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useClearCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function clearCheque(input: { id: string; clearing_date: string }) {
      return api.patch(`/bank/cheques/${input.id}/clear`, {
        clearing_date: input.clearing_date,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
    },
  });
}

export function useBounceCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bounceCheque(input: { id: string; bounce_date: string }) {
      return api.patch(`/bank/cheques/${input.id}/bounce`, {
        bounce_date: input.bounce_date,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useCancelCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelCheque(id: string) {
      return api.patch(`/bank/cheques/${id}/cancel`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}
