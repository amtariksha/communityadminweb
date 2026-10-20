'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExportButton } from '@/components/ui/export-button';
import { useTrialBalanceReport, type TrialBalanceLine, type TrialBalanceParams, type TrialBalanceReport } from '@/hooks/use-ledger-statements';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReportSkeleton } from './report-skeleton';
import { TrialBalanceView } from './trial-balance-view';

const TYPE_LABELS: Record<string, string> = { asset: 'Assets', liability: 'Liabilities', equity: 'Equity', income: 'Income', expense: 'Expense' };

/** A signed balance as "₹x Dr" / "₹x Cr"; nothing for zero. */
export function drCr(value: number): string {
  if (Math.round(value * 100) === 0) return '-';
  return `${formatCurrency(Math.abs(value))} ${value > 0 ? 'Dr' : 'Cr'}`;
}

interface GroupBlock {
  type: string;
  group: string;
  rows: TrialBalanceLine[];
}

function groupBlocks(rows: readonly TrialBalanceLine[]): GroupBlock[] {
  const blocks: GroupBlock[] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && last.type === row.type && last.group === row.group_name) last.rows.push(row);
    else blocks.push({ type: row.type, group: row.group_name, rows: [row] });
  }
  return blocks;
}

const sum = (rows: readonly TrialBalanceLine[], pick: (row: TrialBalanceLine) => number): number =>
  Math.round(rows.reduce((total, row) => total + pick(row), 0) * 100) / 100;

function queryHref(row: TrialBalanceLine, report: TrialBalanceReport): string {
  const params = new URLSearchParams({ account_id: row.account_id, to: report.to_date });
  if (report.from_date) params.set('from', report.from_date);
  return `/general-ledger/query/by-group?${params.toString()}`;
}

function SubtotalRow({ label, rows }: { label: string; rows: readonly TrialBalanceLine[] }): ReactNode {
  return (
    <TableRow className="font-medium">
      <TableCell colSpan={4} className="text-right">{label}</TableCell>
      <TableCell className="text-right">{drCr(sum(rows, (row) => row.opening_balance))}</TableCell>
      <TableCell className="text-right">{formatCurrency(sum(rows, (row) => row.debit))}</TableCell>
      <TableCell className="text-right">{formatCurrency(sum(rows, (row) => row.credit))}</TableCell>
      <TableCell className="text-right">{drCr(sum(rows, (row) => row.closing_balance))}</TableCell>
    </TableRow>
  );
}

function ReportTable({ report }: { report: TrialBalanceReport }): ReactNode {
  let serial = 0;
  const blocks = groupBlocks(report.rows);
  return (
    <Table aria-label="Trial balance">
      <TableHeader>
        <TableRow>
          <TableHead>S.No</TableHead>
          <TableHead>GL Account No.</TableHead>
          <TableHead>Account Name</TableHead>
          <TableHead>Group</TableHead>
          <TableHead className="text-right">Opening Balance</TableHead>
          <TableHead className="text-right">Debit</TableHead>
          <TableHead className="text-right">Credit</TableHead>
          <TableHead className="text-right">Closing Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {blocks.map((block, index) => (
          <Fragment key={`${block.type}-${block.group}`}>
            {(index === 0 || blocks[index - 1].type !== block.type) && (
              <TableRow>
                <TableCell colSpan={8} className="bg-muted/50 font-semibold">{TYPE_LABELS[block.type] ?? block.type}</TableCell>
              </TableRow>
            )}
            {block.rows.map((row) => (
              <TableRow key={row.account_id}>
                <TableCell>{(serial += 1)}</TableCell>
                <TableCell className="font-mono text-xs">{row.account_code ?? ''}</TableCell>
                <TableCell>
                  <Link href={queryHref(row, report)} className="text-primary underline">{row.account_name}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.group_name}</TableCell>
                <TableCell className="text-right">{drCr(row.opening_balance)}</TableCell>
                <TableCell className="text-right">{row.debit ? formatCurrency(row.debit) : '-'}</TableCell>
                <TableCell className="text-right">{row.credit ? formatCurrency(row.credit) : '-'}</TableCell>
                <TableCell className="text-right">{drCr(row.closing_balance)}</TableCell>
              </TableRow>
            ))}
            <SubtotalRow label={`Total ${block.group}`} rows={block.rows} />
          </Fragment>
        ))}
        <TableRow className="border-t-2 font-bold">
          <TableCell colSpan={4} className="text-right">Grand Total</TableCell>
          <TableCell className="text-right">{formatCurrency(report.totals.opening_debit)} Dr / {formatCurrency(report.totals.opening_credit)} Cr</TableCell>
          <TableCell className="text-right">{formatCurrency(report.totals.debit)}</TableCell>
          <TableCell className="text-right">{formatCurrency(report.totals.credit)}</TableCell>
          <TableCell className="text-right">{formatCurrency(report.totals.closing_debit)} Dr / {formatCurrency(report.totals.closing_credit)} Cr</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function exportRows(report: TrialBalanceReport): Record<string, unknown>[] {
  return report.rows.map((row, index) => ({
    sl: index + 1,
    code: row.account_code ?? '',
    name: row.account_name,
    group: row.group_name,
    opening: drCr(row.opening_balance),
    debit: row.debit,
    credit: row.credit,
    closing: drCr(row.closing_balance),
  }));
}

const EXPORT_COLUMNS = [
  { key: 'sl', label: 'S.No' },
  { key: 'code', label: 'GL Account No.' },
  { key: 'name', label: 'Account Name' },
  { key: 'group', label: 'Group' },
  { key: 'opening', label: 'Opening Balance' },
  { key: 'debit', label: 'Debit' },
  { key: 'credit', label: 'Credit' },
  { key: 'closing', label: 'Closing Balance' },
];

/**
 * Trial balance with GL-15's options (screen GL-S13): rows by type and group
 * with group subtotals, a grand total, and a red line when the books do not
 * balance. An API without the options shows the one-date trial balance.
 */
export function TrialBalanceReportView({ params }: { params: TrialBalanceParams }): ReactNode {
  const query = useTrialBalanceReport(params);
  if (query.isLoading) return <ReportSkeleton />;
  if (query.isError) return <p role="alert" className="py-8 text-center text-destructive">The trial balance could not be loaded.</p>;
  if (query.data === null) {
    return (
      <div className="space-y-2">
        <p role="note" className="text-sm text-muted-foreground">Period, migration and suppress options are not available yet on this server; this is the trial balance as of To.</p>
        <TrialBalanceView asOfDate={params.to} />
      </div>
    );
  }
  const report = query.data as TrialBalanceReport;
  if (report.rows.length === 0) return <p className="py-8 text-center text-muted-foreground">No postings up to {formatDate(report.to_date)}</p>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {report.from_date ? `${formatDate(report.from_date)} to ` : 'Up to '}
          {formatDate(report.to_date)}
        </p>
        <ExportButton data={exportRows(report)} filename={`trial-balance-${report.to_date}`} columns={EXPORT_COLUMNS} />
      </div>
      {report.out_of_balance !== 0 && (
        <p role="alert" className="text-sm font-medium text-destructive">Out of balance by {formatCurrency(Math.abs(report.out_of_balance))}</p>
      )}
      <ReportTable report={report} />
    </div>
  );
}
