'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AccountGroup,
  LedgerAccount,
  FinancialYear,
  JournalEntry,
  JournalLine,
} from '@communityos/shared';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface JournalEntryDetail extends JournalEntry {
  lines: JournalLine[];
}

interface TrialBalanceRow {
  account_id: string;
  account_name: string;
  account_code: string;
  group_name: string;
  debit: number;
  credit: number;
}

interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  total_debit: number;
  total_credit: number;
  as_of_date: string;
}

interface BalanceSheetSection {
  group: string;
  accounts: Array<{
    account_id: string;
    account_name: string;
    balance: number;
  }>;
  total: number;
}

interface BalanceSheetReport {
  assets: BalanceSheetSection[];
  liabilities: BalanceSheetSection[];
  total_assets: number;
  total_liabilities: number;
  as_of_date: string;
}

interface IncomeExpenditureRow {
  account_id: string;
  account_name: string;
  account_code: string;
  amount: number;
}

interface IncomeExpenditureReport {
  income: IncomeExpenditureRow[];
  expenditure: IncomeExpenditureRow[];
  total_income: number;
  total_expenditure: number;
  surplus_or_deficit: number;
  start_date: string;
  end_date: string;
}

interface GeneralLedgerTransaction {
  date: string;
  entry_number: string;
  narration: string;
  debit: number;
  credit: number;
  running_balance: number;
}

interface GeneralLedgerReport {
  account_id: string;
  account_name: string;
  opening_balance: number;
  transactions: GeneralLedgerTransaction[];
  closing_balance: number;
  start_date: string;
  end_date: string;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface AccountFilters {
  group_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface JournalFilters {
  start_date?: string;
  end_date?: string;
  account_id?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateAccountGroupInput {
  name: string;
  type: string;
  parent_id?: string | null;
  code: string;
  sort_order?: number;
}

interface UpdateAccountGroupInput extends Partial<CreateAccountGroupInput> {}

interface CreateLedgerAccountInput {
  group_id: string;
  name: string;
  code: string;
  opening_balance?: number;
  balance_type?: string;
  is_bank_account?: boolean;
  bank_details?: Record<string, unknown> | null;
}

interface UpdateLedgerAccountInput extends Partial<CreateLedgerAccountInput> {
  is_active?: boolean;
}

interface SetOpeningBalanceInput {
  account_id: string;
  amount: number;
  balance_type: string;
}

interface BulkImportBalancesInput {
  balances: Array<{
    account_id: string;
    amount: number;
    balance_type: string;
  }>;
}

interface CreateFinancialYearInput {
  label: string;
  start_date: string;
  end_date: string;
}

interface CreateJournalEntryInput {
  financial_year_id: string;
  entry_date: string;
  narration: string;
  source_type?: string;
  source_id?: string | null;
  lines: Array<{
    ledger_account_id: string;
    debit: number;
    credit: number;
  }>;
}

interface ReverseJournalEntryInput {
  narration: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const ledgerKeys = {
  all: ['ledger'] as const,

  accountGroups: () => [...ledgerKeys.all, 'account-groups'] as const,
  accountGroup: (id: string) => [...ledgerKeys.accountGroups(), id] as const,

  accounts: () => [...ledgerKeys.all, 'accounts'] as const,
  accountList: (filters?: AccountFilters) => [...ledgerKeys.accounts(), 'list', filters] as const,
  account: (id: string) => [...ledgerKeys.accounts(), id] as const,

  financialYears: () => [...ledgerKeys.all, 'financial-years'] as const,

  journalEntries: () => [...ledgerKeys.all, 'journal-entries'] as const,
  journalEntryList: (filters?: JournalFilters) =>
    [...ledgerKeys.journalEntries(), 'list', filters] as const,
  journalEntry: (id: string) => [...ledgerKeys.journalEntries(), id] as const,

  reports: () => [...ledgerKeys.all, 'reports'] as const,
  trialBalance: (asOfDate: string) => [...ledgerKeys.reports(), 'trial-balance', asOfDate] as const,
  balanceSheet: (asOfDate: string) => [...ledgerKeys.reports(), 'balance-sheet', asOfDate] as const,
  incomeExpenditure: (startDate: string, endDate: string) =>
    [...ledgerKeys.reports(), 'income-expenditure', startDate, endDate] as const,
  generalLedger: (accountId: string, startDate: string, endDate: string) =>
    [...ledgerKeys.reports(), 'general-ledger', accountId, startDate, endDate] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function accountFiltersToParams(filters?: AccountFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.group_id) params.group_id = filters.group_id;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function journalFiltersToParams(filters?: JournalFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.account_id) params.account_id = filters.account_id;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Account Group queries
// ---------------------------------------------------------------------------

export function useAccountGroups() {
  return useQuery({
    queryKey: ledgerKeys.accountGroups(),
    queryFn: function fetchAccountGroups() {
      return api
        .get<{ data: AccountGroup[] }>('/ledger/account-groups')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useAccountGroup(id: string) {
  return useQuery({
    queryKey: ledgerKeys.accountGroup(id),
    queryFn: function fetchAccountGroup() {
      return api
        .get<{ data: AccountGroup }>(`/ledger/account-groups/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Account Group mutations
// ---------------------------------------------------------------------------

export function useCreateAccountGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createAccountGroup(input: CreateAccountGroupInput) {
      return api.post<{ data: AccountGroup }>('/ledger/account-groups', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accountGroups() });
    },
  });
}

export function useUpdateAccountGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateAccountGroup(params: {
      id: string;
      data: UpdateAccountGroupInput;
    }) {
      return api.patch<{ data: AccountGroup }>(
        `/ledger/account-groups/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accountGroup(variables.id) });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accountGroups() });
    },
  });
}

export function useDeactivateAccountGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deactivateAccountGroup(id: string) {
      return api.delete<{ message: string }>(`/ledger/account-groups/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accountGroups() });
    },
  });
}

// ---------------------------------------------------------------------------
// Ledger Account queries
// ---------------------------------------------------------------------------

export function useLedgerAccounts(filters?: AccountFilters) {
  return useQuery({
    queryKey: ledgerKeys.accountList(filters),
    queryFn: function fetchLedgerAccounts() {
      return api.get<PaginatedResponse<LedgerAccount>>('/ledger/accounts', {
        params: accountFiltersToParams(filters),
      });
    },
  });
}

export function useLedgerAccount(id: string) {
  return useQuery({
    queryKey: ledgerKeys.account(id),
    queryFn: function fetchLedgerAccount() {
      return api
        .get<{ data: LedgerAccount }>(`/ledger/accounts/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Ledger Account mutations
// ---------------------------------------------------------------------------

export function useCreateLedgerAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createLedgerAccount(input: CreateLedgerAccountInput) {
      return api.post<{ data: LedgerAccount }>('/ledger/accounts', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
}

export function useUpdateLedgerAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateLedgerAccount(params: {
      id: string;
      data: UpdateLedgerAccountInput;
    }) {
      return api.patch<{ data: LedgerAccount }>(
        `/ledger/accounts/${params.id}`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.account(variables.id) });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
}

export function useSetOpeningBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function setOpeningBalance(input: SetOpeningBalanceInput) {
      return api.post<{ data: LedgerAccount }>(
        `/ledger/accounts/${input.account_id}/opening-balance`,
        { amount: input.amount, balance_type: input.balance_type },
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: ledgerKeys.account(variables.account_id),
      });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useBulkImportBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkImportBalances(input: BulkImportBalancesInput) {
      return api.post<{ message: string }>('/ledger/accounts/import-balances', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// ---------------------------------------------------------------------------
// Financial Year queries
// ---------------------------------------------------------------------------

export function useFinancialYears() {
  return useQuery({
    queryKey: ledgerKeys.financialYears(),
    queryFn: function fetchFinancialYears() {
      return api
        .get<{ data: FinancialYear[] }>('/ledger/financial-years')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Financial Year mutations
// ---------------------------------------------------------------------------

export function useCreateFinancialYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createFinancialYear(input: CreateFinancialYearInput) {
      return api.post<{ data: FinancialYear }>('/ledger/financial-years', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.financialYears() });
    },
  });
}

export function useSetCurrentYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function setCurrentYear(id: string) {
      return api.patch<{ data: FinancialYear }>(
        `/ledger/financial-years/${id}/current`,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.financialYears() });
    },
  });
}

export function useFreezeYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function freezeYear(id: string) {
      return api.patch<{ data: FinancialYear }>(
        `/ledger/financial-years/${id}/freeze`,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.financialYears() });
    },
  });
}

export function useUnfreezeYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function unfreezeYear(id: string) {
      return api.patch<{ data: FinancialYear }>(
        `/ledger/financial-years/${id}/unfreeze`,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.financialYears() });
    },
  });
}

// ---------------------------------------------------------------------------
// Journal Entry queries
// ---------------------------------------------------------------------------

export function useJournalEntries(filters?: JournalFilters) {
  return useQuery({
    queryKey: ledgerKeys.journalEntryList(filters),
    queryFn: function fetchJournalEntries() {
      return api.get<PaginatedResponse<JournalEntry>>('/ledger/journal-entries', {
        params: journalFiltersToParams(filters),
      });
    },
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ledgerKeys.journalEntry(id),
    queryFn: function fetchJournalEntry() {
      return api
        .get<{ data: JournalEntryDetail }>(`/ledger/journal-entries/${id}`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: id !== '',
  });
}

// ---------------------------------------------------------------------------
// Journal Entry mutations
// ---------------------------------------------------------------------------

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createJournalEntry(input: CreateJournalEntryInput) {
      return api.post<{ data: JournalEntryDetail }>('/ledger/journal-entries', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function reverseJournalEntry(params: {
      id: string;
      data: ReverseJournalEntryInput;
    }) {
      return api.post<{ data: JournalEntryDetail }>(
        `/ledger/journal-entries/${params.id}/reverse`,
        params.data,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: ledgerKeys.journalEntry(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
    },
  });
}

// ---------------------------------------------------------------------------
// Report queries
// ---------------------------------------------------------------------------

export function useTrialBalance(asOfDate: string) {
  return useQuery({
    queryKey: ledgerKeys.trialBalance(asOfDate),
    queryFn: async function fetchTrialBalance(): Promise<TrialBalanceReport> {
      const res = await api.get<{ data: TrialBalanceRow[] | TrialBalanceReport }>(
        '/ledger/reports/trial-balance',
        { params: { as_of_date: asOfDate } },
      );

      const rawData = res.data;

      // Backend returns flat array { data: [...] } — transform to structured format
      if (Array.isArray(rawData)) {
        const rows = rawData as TrialBalanceRow[];
        return {
          rows,
          total_debit: rows.reduce((s, r) => s + Number(r.debit ?? r.total_debit ?? 0), 0),
          total_credit: rows.reduce((s, r) => s + Number(r.credit ?? r.total_credit ?? 0), 0),
          as_of_date: asOfDate,
        };
      }

      return rawData as TrialBalanceReport;
    },
    enabled: asOfDate !== '',
  });
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ledgerKeys.balanceSheet(asOfDate),
    queryFn: function fetchBalanceSheet() {
      return api
        .get<{ data: BalanceSheetReport }>('/ledger/reports/balance-sheet', {
          params: { as_of_date: asOfDate },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: asOfDate !== '',
  });
}

export function useIncomeExpenditure(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ledgerKeys.incomeExpenditure(startDate, endDate),
    queryFn: function fetchIncomeExpenditure() {
      return api
        .get<{ data: IncomeExpenditureReport }>('/ledger/reports/income-expenditure', {
          params: { start_date: startDate, end_date: endDate },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: startDate !== '' && endDate !== '',
  });
}

export function useGeneralLedgerReport(
  accountId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ledgerKeys.generalLedger(accountId, startDate, endDate),
    queryFn: function fetchGeneralLedger() {
      return api
        .get<{ data: GeneralLedgerReport }>(
          `/ledger/reports/general-ledger/${accountId}`,
          { params: { start_date: startDate, end_date: endDate } },
        )
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: accountId !== '' && startDate !== '' && endDate !== '',
  });
}
