'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { ImportLog } from '@/components/import/import-log';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MemberImport, MemberImportMatrix } from './member-imports';

/** One headed matrix "Type · Direct Posting · Posting via Excel" (INC-S23, INC-S32). */
export function BulkPostingMatrix({ matrix, hrefFor }: { matrix: MemberImportMatrix; hrefFor: (type: string, door: 'grid' | 'excel') => string }): ReactNode {
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
                <Link href={hrefFor(job.type, 'grid')} className={buttonVariants({ size: 'sm' })}>
                  … in Batch
                </Link>
              </TableCell>
              <TableCell>
                <Link href={hrefFor(job.type, 'excel')} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
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

/** The upload logs of the jobs, one per endpoint they post to. */
export function BulkPostingLogs({ jobs }: { jobs: readonly MemberImport[] }): ReactNode {
  const labels = Object.fromEntries(jobs.map((job) => [job.type, job.label]));
  const endpoints = [...new Set(jobs.map((job) => job.endpoint))];
  return (
    <>
      {endpoints.map((endpoint) => (
        <ImportLog key={endpoint} endpoint={endpoint} labels={labels} />
      ))}
    </>
  );
}
