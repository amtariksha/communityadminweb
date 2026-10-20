'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ledgerKeys } from './use-ledger';

/** GL-15: the trial balance's options. */
export interface TrialBalanceParams {
  mode: 'complete' | 'period' | 'migration';
  from?: string;
  to: string;
  suppressRetainedEarnings: boolean;
}

export interface TrialBalanceLine {
  account_id: string;
  account_code: string | null;
  account_name: string;
  group_name: string;
  type: string;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
}

export interface TrialBalanceReport {
  mode: TrialBalanceParams['mode'];
  from_date: string | null;
  to_date: string;
  rows: TrialBalanceLine[];
  totals: { opening_debit: number; opening_credit: number; debit: number; credit: number; closing_debit: number; closing_credit: number };
  out_of_balance: number;
}

/**
 * GET /ledger/reports/trial-balance with GL-15's options; `null` when the
 * API is older (it answers the plain list for as_of_date and ignores the
 * rest), so the page falls back to the one-date view.
 */
export function useTrialBalanceReport(params: TrialBalanceParams | null) {
  return useQuery({
    queryKey: [...ledgerKeys.reports(), 'trial-balance-report', params],
    enabled: params !== null,
    queryFn: async (): Promise<TrialBalanceReport | null> => {
      const p = params as TrialBalanceParams;
      const query: Record<string, string> = {
        as_of_date: p.to,
        to_date: p.to,
        mode: p.mode,
        suppress_retained_earnings: String(p.suppressRetainedEarnings),
      };
      if (p.mode === 'period' && p.from) query.from_date = p.from;
      const res = await api.get<{ data: TrialBalanceReport | unknown[] }>('/ledger/reports/trial-balance', { params: query });
      return Array.isArray(res.data) ? null : res.data;
    },
  });
}

/** GL-16: what Financial Statements are generated for. */
export interface FinancialStatementsParams {
  basis: 'period' | 'date';
  fyId?: string;
  from?: string;
  to?: string;
  suppressRetainedEarnings: boolean;
  suppressOpeningBalance: boolean;
}

export interface StatementAccount {
  account_id: string;
  account_name: string;
  account_code: string;
  balance: number;
}

export interface StatementSection {
  group_name: string;
  accounts: StatementAccount[];
  total: number;
}

export interface IncomeExpenditureLine {
  account_id: string;
  account_name: string;
  account_code: string;
  group_name: string;
  amount: number;
}

export interface FinancialStatements {
  basis: 'period' | 'date';
  from_date: string;
  to_date: string;
  balance_sheet: {
    assets: StatementSection[];
    liabilities: StatementSection[];
    equity: StatementSection[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    unclosed_surplus: number;
    total_liabilities_and_equity: number;
  };
  income_expenditure: {
    income: IncomeExpenditureLine[];
    expense: IncomeExpenditureLine[];
    total_income: number;
    total_expense: number;
    surplus: number;
  };
}

/** GET /ledger/reports/financial-statements (GL-16). */
export function useFinancialStatements(params: FinancialStatementsParams | null) {
  return useQuery({
    queryKey: [...ledgerKeys.reports(), 'financial-statements', params],
    enabled: params !== null,
    queryFn: async (): Promise<FinancialStatements> => {
      const p = params as FinancialStatementsParams;
      const query: Record<string, string> = {
        basis: p.basis,
        suppress_retained_earnings: String(p.suppressRetainedEarnings),
        suppress_opening_balance: String(p.suppressOpeningBalance),
      };
      if (p.basis === 'period' && p.fyId) query.fy_id = p.fyId;
      if (p.basis === 'date') Object.assign(query, { from_date: p.from ?? '', to_date: p.to ?? '' });
      return (await api.get<{ data: FinancialStatements }>('/ledger/reports/financial-statements', { params: query })).data;
    },
  });
}
