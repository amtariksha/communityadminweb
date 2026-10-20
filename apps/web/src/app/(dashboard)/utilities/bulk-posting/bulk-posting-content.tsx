'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';

/** One row of the launch matrix: a posting job with its direct and its spreadsheet way in. */
export interface BulkPostingRow {
  type: string;
  direct?: { label: string; href: (block: string | null) => string };
  excel?: { label: string; href: (block: string | null) => string };
}

const withBlock = (path: string, block: string | null): string =>
  block ? `${path}?block=${encodeURIComponent(block)}` : path;

/**
 * The rows whose ticket has shipped (UTIL-S7: "a row whose ticket has not
 * shipped is hidden"). Readings to invoices per meter type (UTIL-15),
 * readings from Excel (UTIL-16) and the GSTIN / PAN upload (INC-60) join
 * when they are built.
 */
export const BULK_POSTING_ROWS: readonly BulkPostingRow[] = [
  {
    type: 'Calculated bills to invoices',
    direct: { label: 'Invoices in Batch', href: (block) => withBlock('/utilities/bulk-posting/bills', block) },
  },
];

/** Utility Tracker › Bulk Posting (UTIL-S7): a block chooser and the jobs that post a month's utility invoices. */
export function BulkPostingContent(): ReactNode {
  const classic = useAdminLayout() === 'classic';
  const block = useSearchParams()?.get('block') ?? null;
  return (
    <div className="space-y-4">
      {!classic && <PageHeader title="Utility Bulk Posting" description="Post a month's utility invoices for a block in one go." />}
      <UnitBlockLinks value={block} hrefFor={(next) => withBlock('/utilities/bulk-posting', next)} />
      <Table aria-label="Bulk posting">
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Direct Posting</TableHead>
            <TableHead>Excel Posting</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BULK_POSTING_ROWS.map((row) => (
            <TableRow key={row.type}>
              <TableCell>{row.type}</TableCell>
              <TableCell>
                {row.direct && (
                  <Link href={row.direct.href(block)} className={buttonVariants({ size: 'sm' })}>
                    {row.direct.label}
                  </Link>
                )}
              </TableCell>
              <TableCell>
                {row.excel && (
                  <Link href={row.excel.href(block)} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    {row.excel.label}
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
