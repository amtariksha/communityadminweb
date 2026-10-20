'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TableCell, TableRow } from '@/components/ui/table';
import { useBudget, type BudgetList, type BudgetRow } from '@/hooks/use-budgets';
import { useFinancialYears } from '@/hooks/use-ledger';
import { getCurrentTenant, getUser } from '@/lib/auth';
import { canWriteFinance } from '@/lib/finance-roles';
import { cn, formatCurrency } from '@/lib/utils';
import { isOverspent, yearLabel } from './budget-model';
import { CloneBudgetDialog, type CloneYears } from './clone-dialog';

const COLUMNS: DataTableColumn<BudgetRow>[] = [
  { key: 'group', header: 'Group Name', cell: (r) => r.group_name },
  { key: 'account', header: 'Account Name', cell: (r) => r.account_name },
  { key: 'budget', header: 'Budget for Complete Year', cell: (r) => formatCurrency(r.budget), className: 'text-right tabular-nums' },
  { key: 'booked', header: 'Expense Booked', cell: (r) => formatCurrency(r.booked), className: 'text-right tabular-nums' },
  {
    key: 'variance',
    header: 'Variance',
    text: (r) => formatCurrency(r.variance),
    cell: (r) => <span className={cn(isOverspent(r.variance) && 'font-medium text-destructive')}>{formatCurrency(r.variance)}</span>,
    className: 'text-right tabular-nums',
  },
];

interface YearOption {
  id: string;
  label: string;
  start: string;
}

function societyName(): string {
  const tenantId = getCurrentTenant();
  return getUser()?.societies.find((s) => s.id === tenantId)?.name ?? '';
}

function matches(row: BudgetRow, search: string): boolean {
  const needle = search.toLowerCase();
  return [row.account_name, row.group_name, row.code ?? ''].some((text) => text.toLowerCase().includes(needle));
}

/** The year before `yearId` by start date, for Clone Previous Year. */
function previousYear(years: readonly YearOption[], yearId: string): YearOption | undefined {
  const current = years.find((year) => year.id === yearId);
  if (!current) return undefined;
  return [...years].filter((year) => year.start < current.start).sort((a, b) => b.start.localeCompare(a.start))[0];
}

function useYearOptions(): YearOption[] {
  const years = useFinancialYears();
  return useMemo(
    () =>
      (years.data ?? []).map((year) => ({
        id: year.id,
        label: yearLabel(year),
        start: String(year.start_date).slice(0, 10),
      })),
    [years.data],
  );
}

function TotalsRow({ list }: { list: BudgetList }): ReactNode {
  return (
    <TableRow>
      <TableCell colSpan={3} className="font-medium">Total</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(list.totals.budget)}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(list.totals.booked)}</TableCell>
      <TableCell className={cn('text-right font-medium tabular-nums', isOverspent(list.totals.variance) && 'text-destructive')}>
        {formatCurrency(list.totals.variance)}
      </TableCell>
    </TableRow>
  );
}

interface ToolbarProps {
  years: readonly YearOption[];
  shownYear: string;
  list: BudgetList | undefined;
  onYearChange: (yearId: string) => void;
  onClone: (years: CloneYears) => void;
}

function BudgetToolbar({ years, shownYear, list, onYearChange, onClone }: ToolbarProps): ReactNode {
  const previous = previousYear(years, shownYear);
  const thisYear = years.find((year) => year.id === shownYear);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <Label htmlFor="budget-year">Financial year</Label>
        <select
          id="budget-year"
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={shownYear}
          onChange={(e) => onYearChange(e.target.value)}
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>{year.label}</option>
          ))}
        </select>
      </div>
      {canWriteFinance() && list && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/expense-tracker/budget/setup?fy=${shownYear}`} className={buttonVariants()} data-slot="button" data-size="default">
            Setup
          </Link>
          <Button
            type="button"
            variant="outline"
            disabled={!previous || !thisYear || list.financial_year.is_frozen}
            onClick={() => previous && thisYear && onClone({ from: previous, to: thisYear })}
          >
            Clone Previous Year
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Expense Tracker › Budget (EXP-S13): each expense head of a financial year
 * with its budget, what is booked and the variance (overspent in red).
 * Finance writers open the setup grid or clone the previous year. The
 * classic page keeps the year in the URL; the standard /purchases tab in
 * its own state.
 */
export function BudgetView({ yearId, onYearChange }: { yearId: string; onYearChange: (yearId: string) => void }): ReactNode {
  const budget = useBudget(yearId);
  const years = useYearOptions();
  const [search, setSearch] = useState('');
  const [paging, setPaging] = useState({ page: 1, size: 50 });
  const [clone, setClone] = useState<CloneYears | null>(null);

  if (budget.data === null) return <p className="text-sm text-muted-foreground">The budget is not available yet.</p>;
  const list = budget.data;
  const shownYear = list?.financial_year.id ?? yearId;
  const rows = (list?.data ?? []).filter((row) => !search || matches(row, search));
  const noBudget = list !== undefined && list.data.every((row) => Number(row.budget) === 0);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{societyName()}</h2>
      <BudgetToolbar years={years} shownYear={shownYear} list={list} onYearChange={onYearChange} onClone={setClone} />
      {noBudget && <p className="text-sm text-muted-foreground">No budget set for this year — Setup or Clone Previous Year.</p>}
      <DataTable
        title="Budget"
        serialHeader="Sl.No"
        columns={COLUMNS}
        rows={rows.slice((paging.page - 1) * paging.size, paging.page * paging.size)}
        rowKey={(r) => r.ledger_account_id}
        total={rows.length}
        page={paging.page}
        pageSize={paging.size}
        onPageChange={(page) => setPaging({ ...paging, page })}
        onPageSizeChange={(size) => setPaging({ page: 1, size })}
        search={{ value: search, onChange: (value) => { setSearch(value); setPaging({ ...paging, page: 1 }); } }}
        loading={budget.isLoading}
        error={budget.error}
        emptyText="No expense heads yet — add them in General Ledger › Chart of Accounts."
        export={{ path: '/budgets/export', params: shownYear ? { financial_year_id: shownYear } : {}, filename: 'expense-budget' }}
        footer={list ? <TotalsRow list={list} /> : undefined}
      />
      <CloneBudgetDialog years={clone} onClose={() => setClone(null)} />
    </div>
  );
}

/** The classic page: the year is in the URL (`?fy=`), so the page can be linked and reloaded. */
export function BudgetPage(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  return <BudgetView yearId={params.get('fy') ?? ''} onYearChange={(id) => router.replace(`/expense-tracker/budget?fy=${id}`)} />;
}

/** The standard /purchases Budget tab: the same view, the year kept in the tab. */
export function BudgetTab(): ReactNode {
  const [yearId, setYearId] = useState('');
  return <BudgetView yearId={yearId} onYearChange={setYearId} />;
}
