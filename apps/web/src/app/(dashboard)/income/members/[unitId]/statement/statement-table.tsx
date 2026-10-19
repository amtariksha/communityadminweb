'use client';

import { type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StatementAction, StatementRow, UnitStatement } from '@/hooks/use-unit-statement';
import type { FinanceAccess } from '@/lib/finance-roles';
import { formatCurrency, formatDate } from '@/lib/utils';
import { rowMenu } from './statement-actions';

interface StatementTableProps {
  statement: UnitStatement;
  access: FinanceAccess;
  onAction: (action: StatementAction, row: StatementRow) => void;
}

const amount = (value: number): string => (value ? formatCurrency(value) : '');

function RowActions({ row, access, onAction }: { row: StatementRow; access: FinanceAccess; onAction: StatementTableProps['onAction'] }): ReactNode {
  const items = rowMenu(row, access);
  if (items.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for ${row.invoice_no ?? row.receipt_no ?? 'row'}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.action} onClick={() => onAction(item.action, row)}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryRow({ label, due, paid, balance, span }: { label: string; due?: number; paid?: number; balance?: number; span: number }): ReactNode {
  return (
    <TableRow className="font-semibold">
      <TableCell colSpan={span}>{label}</TableCell>
      <TableCell className="text-right">{due === undefined ? '' : formatCurrency(due)}</TableCell>
      <TableCell className="text-right">{paid === undefined ? '' : formatCurrency(paid)}</TableCell>
      <TableCell className="text-right">{balance === undefined ? '' : formatCurrency(balance)}</TableCell>
      <TableCell />
    </TableRow>
  );
}

/**
 * The statement rows (INC-S17): opening balance, each document with its
 * running balance and Actions menu, then Total and Net. A negative balance
 * is an advance.
 */
export function StatementTable({ statement, access, onAction }: StatementTableProps): ReactNode {
  const admin = statement.view === 'admin';
  const leading = admin ? 6 : 5;
  return (
    <Table aria-label="Account statement">
      <TableHeader>
        <TableRow>
          {admin && <TableHead>Posted By</TableHead>}
          <TableHead>Posted As of</TableHead>
          <TableHead>Invoice No</TableHead>
          <TableHead>Receipt No</TableHead>
          <TableHead>Account</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Due</TableHead>
          <TableHead className="text-right">Amount Paid</TableHead>
          <TableHead className="text-right">Closing Balance</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <SummaryRow label="Opening balance" balance={statement.opening} span={leading} />
        {statement.rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={leading + 4} className="py-6 text-center text-muted-foreground">
              No transactions in this period
            </TableCell>
          </TableRow>
        )}
        {statement.rows.map((row) => (
          <TableRow key={`${row.doc_type}:${row.doc_id}`} className={row.reversal ? 'text-muted-foreground' : undefined}>
            {admin && <TableCell>{row.posted_by}</TableCell>}
            <TableCell>{formatDate(row.date)}</TableCell>
            <TableCell className="font-mono text-xs">{row.invoice_no}</TableCell>
            <TableCell className="font-mono text-xs">{row.receipt_no}</TableCell>
            <TableCell>{row.account}</TableCell>
            <TableCell>
              {row.description}
              {row.reversal && (
                <Badge variant="outline" className="ml-2">
                  Reversed
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{amount(row.due)}</TableCell>
            <TableCell className="text-right tabular-nums">{amount(row.paid)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(row.balance)}</TableCell>
            <TableCell>
              <RowActions row={row} access={access} onAction={onAction} />
            </TableCell>
          </TableRow>
        ))}
        <SummaryRow label="Total" due={statement.totals.due} paid={statement.totals.paid} span={leading} />
        <SummaryRow label="Net" balance={statement.totals.net} span={leading} />
      </TableBody>
    </Table>
  );
}
