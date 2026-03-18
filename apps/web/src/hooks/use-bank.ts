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
  from_bank_account_id: string;
  to_bank_account_id: string;
  amount: number;
  transfer_date: string;
  reference_number?: string | null;
  narration?: string;
}

interface ReconcileTransactionInput {
  statement_date: string;
  statement_balance: number;
}

interface CreateFDInput {
  bank_account_id: string;
  fd_number: string;
  principal_amount: number;
  interest_rate: number;
  start_date: string;
  maturity_date: string;
  maturity_amount: number;
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
      data?: {
        interest_rate?: number;
        maturity_date?: string;
        maturity_amount?: number;
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
