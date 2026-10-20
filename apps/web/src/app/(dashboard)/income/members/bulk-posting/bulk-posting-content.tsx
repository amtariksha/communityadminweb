'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { ImportLog } from '@/components/import/import-log';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminLayout } from '@/lib/layout-context';
import { MemberIncomeLinks } from '../member-income-links';
import { BULK_POSTING_HREF, MEMBER_IMPORT_MATRICES, MEMBER_IMPORTS, memberImportHref, type MemberImportMatrix } from './member-imports';

function Matrix({ matrix }: { matrix: MemberImportMatrix }): ReactNode {
  return (
    <section className="space-y-2" aria-label={matrix.heading}>
      <h2 className="text-base font-semibold">{matrix.heading}</h2>
      {matrix.note && <p className="text-sm text-muted-foreground">{matrix.note}</p>}
      <Table aria-label={matrix.heading}>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Direct Posting</TableHead>
            <TableHead>Posting via Excel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.jobs.map((job) => (
            <TableRow key={job.type}>
              <TableCell>{job.label}</TableCell>
              <TableCell>
                <Link href={memberImportHref(job.type, 'grid')} className={buttonVariants({ size: 'sm' })}>
                  … in Batch
                </Link>
              </TableCell>
              <TableCell>
                <Link href={memberImportHref(job.type, 'excel')} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  … using Excel
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

const LOG_LABELS = Object.fromEntries(MEMBER_IMPORTS.map((job) => [job.type, job.label]));
const LOG_ENDPOINTS = [...new Set(MEMBER_IMPORTS.map((job) => job.endpoint))];

/** Income Tracker › Member Income › Bulk Posting (INC-S23). Utility invoices are bulk-posted from Utility Tracker. */
export function MemberBulkPostingContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  return (
    <div className="space-y-6">
      {!classic && <PageHeader title="Bulk Posting" description="Opening balances, invoices, collections and credit notes for many units at once." />}
      <MemberIncomeLinks current={BULK_POSTING_HREF} />
      {MEMBER_IMPORT_MATRICES.map((matrix) => (
        <Matrix key={matrix.heading} matrix={matrix} />
      ))}
      {LOG_ENDPOINTS.map((endpoint) => (
        <ImportLog key={endpoint} endpoint={endpoint} labels={LOG_LABELS} />
      ))}
    </div>
  );
}

