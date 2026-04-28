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

interface IncomeExpenditureTotals {
  total_income: number;
  total_expenditure: number;
  surplus_or_deficit: number;
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
  // QA #58 / #59 / #244 — Income & Expenses come from the
  // income-expenditure report (ag.type IN ('income','expense')),
  // not from raw trial-balance debits/credits.
  income_expenditure: IncomeExpenditureTotals;
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

      // QA #58 / #59 / #244 — the dashboard KPIs used to read:
      //   Total Income  = receipt_summary.total_collected (an object key
      //                   that NEVER existed — /receipts/summary returns
      //                   an ARRAY of {month, mode, count, total} rows).
      //   Expenses      = SUM(total_debit) over EVERY trial-balance row,
      //                   which inflates expenses with asset / drawings
      //                   debits — completely meaningless economically.
      // Fix: aggregate the receipts array properly, and use the
      // income-expenditure report (already filtered to
      // income / expense account types) for the Income vs. Expenses
      // KPIs. Trial balance still ships its totals for the Balance
      // Sheet card downstream.
      const [
        receiptSummary,
        defaulterSummary,
        trialBalance,
        incomeExpenditure,
        recentInvoices,
        recentReceipts,
      ] = await Promise.all([
        // Receipt summary — endpoint returns Array<{ month, mode, count, total }>.
        // We fold it into the per-mode aggregate the UI expects.
        api
          .get<{
            data: Array<{
              month: string;
              mode: string;
              count: number;
              total: number;
            }>;
          }>('/receipts/summary', {
            params: { start_date, end_date },
          })
          .then((res) => {
            const rows = Array.isArray(res.data) ? res.data : [];
            const summary: ReceiptSummary = { ...EMPTY_RECEIPT_SUMMARY };
            for (const row of rows) {
              const total = Number(row.total) || 0;
              const count = Number(row.count) || 0;
              summary.total_collected += total;
              summary.count += count;
              switch (String(row.mode).toLowerCase()) {
                case 'cash':
                  summary.cash += total;
                  break;
                case 'cheque':
                  summary.cheque += total;
                  break;
                case 'bank_transfer':
                  summary.bank_transfer += total;
                  break;
                case 'upi':
                  summary.upi += total;
                  break;
                case 'online':
                case 'razorpay':
                  summary.online += total;
                  break;
                default:
                  // Unknown mode — still rolled into total_collected
                  // so the headline number stays accurate.
                  break;
              }
            }
            return summary;
          })
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

          // Trial balance — kept as-is for the Balance Sheet card.
          // NOT used for Income / Expenses anymore; that comes from
          // /ledger/reports/income-expenditure below which is
          // pre-filtered to the right account types.
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

          // Income & Expenditure — already aggregates
          // journal_lines by ag.type IN ('income', 'expense'), which
          // is exactly what the headline KPIs need.
          api
            .get<{
              data: {
                total_income?: number;
                total_expenditure?: number;
                surplus_or_deficit?: number;
              };
            }>('/ledger/reports/income-expenditure', {
              params: { start_date, end_date },
            })
            .then((res) => ({
              total_income: Number(res.data?.total_income ?? 0),
              total_expenditure: Number(res.data?.total_expenditure ?? 0),
              surplus_or_deficit: Number(res.data?.surplus_or_deficit ?? 0),
            }))
            .catch(() => ({
              total_income: 0,
              total_expenditure: 0,
              surplus_or_deficit: 0,
            })),

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
        income_expenditure: incomeExpenditure,
        recent_invoices: recentInvoices,
        recent_receipts: recentReceipts,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}
