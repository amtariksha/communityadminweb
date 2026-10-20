'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DataTable, FetchPanel, type DataTableColumn, type FetchCriteria } from '@/components/data-table';
import { TableCell, TableRow } from '@/components/ui/table';
import { useIncomeExpenditure } from '@/hooks/use-ledger';
import { formatCurrency } from '@/lib/utils';
import { comparisonRows, OTHERS, pieSlices, type ComparisonRow, type PieSlice } from './comparison-model';

const COLUMNS: DataTableColumn<ComparisonRow>[] = [
  { key: 'group', header: 'Group Name', cell: (r) => r.group_name || '—' },
  { key: 'account', header: 'Account Name', cell: (r) => r.account_name },
  { key: 'amount', header: 'Amount', cell: (r) => formatCurrency(r.amount), className: 'text-right tabular-nums' },
  { key: 'percent', header: '% of Total', cell: (r) => `${r.percent.toFixed(2)}%`, className: 'text-right tabular-nums' },
];

// Slices take the theme's colours (no fixed hex): six tokens, then the same
// six lighter; "Others" is the muted colour.
const SLICE_TOKENS = ['primary', 'brand-accent', 'success', 'warning', 'destructive', 'classic-menu'];

function sliceFill(slice: PieSlice, index: number): { fill: string; fillOpacity: number } {
  if (slice.name === OTHERS) return { fill: 'var(--color-muted-foreground)', fillOpacity: 0.6 };
  return { fill: `var(--color-${SLICE_TOKENS[index % SLICE_TOKENS.length]})`, fillOpacity: index < SLICE_TOKENS.length ? 1 : 0.55 };
}

function ExpensePie({ slices }: { slices: readonly PieSlice[] }): ReactNode {
  return (
    <div className="h-80" role="img" aria-label={`Expense by head: ${slices.map((slice) => slice.name).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[...slices]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}>
            {slices.map((slice, index) => (
              <Cell key={slice.name} data-testid="pie-slice" {...sliceFill(slice, index)} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Expense Tracker › Expenses Comparison (EXP-25, screen EXP-S15): opens
 * empty (SB-09); after Fetch, a pie of expense by head (the ten biggest and
 * "Others") above a table of every head with its share of the total. The
 * figures are the expense side of the Income & Expenditure for the period.
 */
export function ExpensesComparisonContent(): ReactNode {
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [paging, setPaging] = useState({ page: 1, size: 25 });
  const report = useIncomeExpenditure(period?.from ?? '', period?.to ?? '');
  const rows = useMemo(() => comparisonRows(report.data?.expense ?? []), [report.data]);
  const total = rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;

  function fetch(criteria: FetchCriteria): void {
    setPeriod({ from: criteria.from, to: criteria.to });
    setPaging({ ...paging, page: 1 });
  }

  const panel = <FetchPanel title="Fetch expenses" range="date" requireRange onFetch={fetch} busy={report.isFetching} />;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Expense Comparison</h2>
      {period && rows.length > 0 && <ExpensePie slices={pieSlices(rows)} />}
      <DataTable
        title="Expense Comparison"
        serialHeader="Sl.No"
        columns={COLUMNS}
        rows={rows.slice((paging.page - 1) * paging.size, paging.page * paging.size)}
        rowKey={(r) => r.account_id}
        total={rows.length}
        page={paging.page}
        pageSize={paging.size}
        onPageChange={(page) => setPaging({ ...paging, page })}
        onPageSizeChange={(size) => setPaging({ page: 1, size })}
        loading={report.isLoading && period !== null}
        error={report.error}
        emptyText="No expenses in this period."
        fetchMode={{ panel, fetched: period !== null }}
        export={period ? { path: '/budgets/expense-comparison/export', params: period, filename: 'expense-comparison' } : undefined}
        footer={
          <TableRow>
            <TableCell colSpan={3} className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(total)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">100.00%</TableCell>
          </TableRow>
        }
      />
    </div>
  );
}
