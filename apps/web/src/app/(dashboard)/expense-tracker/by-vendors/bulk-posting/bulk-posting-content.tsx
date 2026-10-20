'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { ImportLog } from '@/components/import/import-log';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BATCH_IMPORTS, bulkPostingHref, EXPENSE_IMPORTS_ENDPOINT, OPENING_BALANCE_IMPORT, type ExpenseImport } from './expense-imports';

function JobTable({ heading, note, jobs }: { heading: string; note?: string; jobs: readonly ExpenseImport[] }): ReactNode {
  return (
    <section className="space-y-2" aria-label={heading}>
      <h2 className="text-base font-semibold">{heading}</h2>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <Table aria-label={heading}>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Direct Posting</TableHead>
            <TableHead>Posting via Excel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.type}>
              <TableCell>{job.label}</TableCell>
              <TableCell>
                <Link href={bulkPostingHref(job.type, 'grid')} className={buttonVariants({ size: 'sm' })}>Batch entry</Link>
              </TableCell>
              <TableCell>
                <Link href={bulkPostingHref(job.type, 'excel')} className={buttonVariants({ size: 'sm', variant: 'outline' })}>Upload Excel</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

const LOG_LABELS = Object.fromEntries([OPENING_BALANCE_IMPORT, ...BATCH_IMPORTS].map((job) => [job.type, job.label]));

/** Expense Tracker › By Vendors › Bulk Posting (EXP-26, screen EXP-S11). */
export function ExpenseBulkPostingContent(): ReactNode {
  return (
    <div className="space-y-6">
      <JobTable heading="Upload opening balances" note="Use once, when the society’s books start on this system." jobs={[OPENING_BALANCE_IMPORT]} />
      <JobTable heading="Batch upload expenses" jobs={BATCH_IMPORTS} />
      <ImportLog endpoint={EXPENSE_IMPORTS_ENDPOINT} labels={LOG_LABELS} />
    </div>
  );
}
