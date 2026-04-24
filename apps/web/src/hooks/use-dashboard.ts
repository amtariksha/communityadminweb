'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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

interface RecentInvoiceRow {
  id: string;
  invoice_number: string;
  invoice_date: string | Date;
  total_amount: number;
  status: string;
  unit_number?: string;
}

interface RecentReceiptRow {
  id: string;
  receipt_number: string;
  receipt_date: string | Date;
  amount: number;
  mode?: string;
  unit_number?: string;
}

interface DashboardData {
  receipt_summary: ReceiptSummary;
  defaulter_summary: DefaulterSummary;
  trial_balance_totals: TrialBalanceTotals;
  recent_invoices: RecentInvoiceRow[];
  recent_receipts: RecentReceiptRow[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFYDates(): { start_date: string; end_date: string } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start_date: `${year}-04-01`,
    end_date: `${year + 1}-03-31`,
  };
}

const EMPTY_RECEIPT_SUMMARY: ReceiptSummary = {
  total_collected: 0,
  cash: 0,
  cheque: 0,
  bank_transfer: 0,
  upi: 0,
  online: 0,
  count: 0,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: async function fetchDashboardData(): Promise<DashboardData> {
      const { start_date, end_date } = getFYDates();
      const today = new Date().toISOString().split('T')[0];

      // All calls have .catch() fallbacks so one failure doesn't break the dashboard
      const [receiptSummary, defaulterSummary, trialBalance, recentInvoices, recentReceipts] =
        await Promise.all([
          // Receipt summary — requires start_date and end_date
          api
            .get<{ data: ReceiptSummary }>('/receipts/summary', {
              params: { start_date, end_date },
            })
            .then((res) => res.data)
            .catch(() => EMPTY_RECEIPT_SUMMARY),

          // Defaulters — use the list endpoint, not /summary
          api
            .get<{ data: Array<Record<string, unknown>>; total: number }>(
              '/invoices/defaulters',
            )
            .then((res) => ({
              total_defaulters: res.total ?? 0,
              total_overdue_amount: Array.isArray(res.data)
                ? res.data.reduce<number>(
                    (sum, d) => sum + (Number(d.total_due) || 0),
                    0,
                  )
                : 0,
            }))
            .catch(() => ({ total_defaulters: 0, total_overdue_amount: 0 })),

          // Trial balance
          api
            .get<{ data: Array<Record<string, unknown>> }>(
              '/ledger/reports/trial-balance',
              {
                params: { as_of_date: today },
              },
            )
            .then((res) => {
              const rows = Array.isArray(res.data) ? res.data : [];
              return {
                total_debit: rows.reduce<number>(
                  (s, r) => s + (Number(r.total_debit) || 0),
                  0,
                ),
                total_credit: rows.reduce<number>(
                  (s, r) => s + (Number(r.total_credit) || 0),
                  0,
                ),
              };
            })
            .catch(() => ({ total_debit: 0, total_credit: 0 })),

          // Recent invoices
          api
            .get<{ data: RecentInvoiceRow[] }>('/invoices', {
              params: { page: '1', limit: '5' },
            })
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch(() => [] as RecentInvoiceRow[]),

          // Recent receipts
          api
            .get<{ data: RecentReceiptRow[] }>('/receipts', {
              params: { page: '1', limit: '5' },
            })
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch(() => [] as RecentReceiptRow[]),
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
