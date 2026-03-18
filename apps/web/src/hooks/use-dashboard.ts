'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Invoice, Receipt } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface ReceiptSummary {
  total_collected: number;
  cash: number;
  cheque: number;
  bank_transfer: number;
  upi: number;
  online: number;
  count: number;
}

interface DefaulterSummary {
  total_defaulters: number;
  total_overdue_amount: number;
}

interface TrialBalanceTotals {
  total_debit: number;
  total_credit: number;
}

interface DashboardData {
  receipt_summary: ReceiptSummary;
  defaulter_summary: DefaulterSummary;
  trial_balance_totals: TrialBalanceTotals;
  recent_invoices: Invoice[];
  recent_receipts: Receipt[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: async function fetchDashboardData(): Promise<DashboardData> {
      const [receiptSummary, defaulterSummary, trialBalance, recentInvoices, recentReceipts] =
        await Promise.all([
          api
            .get<{ data: ReceiptSummary }>('/receipts/summary')
            .then(function unwrap(res) {
              return res.data;
            }),
          api
            .get<{ data: DefaulterSummary }>('/invoices/defaulters/summary')
            .then(function unwrap(res) {
              return res.data;
            })
            .catch(function fallback() {
              return { total_defaulters: 0, total_overdue_amount: 0 };
            }),
          api
            .get<{ data: { total_debit: number; total_credit: number } }>(
              '/ledger/reports/trial-balance',
              { params: { as_of_date: new Date().toISOString().split('T')[0] } },
            )
            .then(function unwrap(res) {
              return {
                total_debit: res.data.total_debit,
                total_credit: res.data.total_credit,
              };
            })
            .catch(function fallback() {
              return { total_debit: 0, total_credit: 0 };
            }),
          api
            .get<{ data: Invoice[]; total: number }>('/invoices', {
              params: { page: '1', limit: '5' },
            })
            .then(function unwrap(res) {
              return res.data;
            }),
          api
            .get<{ data: Receipt[]; total: number }>('/receipts', {
              params: { page: '1', limit: '5' },
            })
            .then(function unwrap(res) {
              return res.data;
            }),
        ]);

      return {
        receipt_summary: receiptSummary,
        defaulter_summary: defaulterSummary,
        trial_balance_totals: trialBalance,
        recent_invoices: recentInvoices,
        recent_receipts: recentReceipts,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
