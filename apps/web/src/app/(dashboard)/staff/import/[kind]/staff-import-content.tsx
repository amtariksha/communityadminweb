'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportGrid } from '@/components/import/import-grid';
import { ImportLog } from '@/components/import/import-log';
import { Button } from '@/components/ui/button';
import { currentRole } from '@/lib/current-role';
import { STAFF_ACTIVE, STAFF_BASE } from '@/lib/staff-statuses';
import { cn } from '@/lib/utils';
import { STAFF_IMPORTS, STAFF_IMPORTS_ENDPOINT, STAFF_IMPORT_ROLES, staffImport, staffImportHref } from '../staff-imports';

const LOG_LABELS = Object.fromEntries(STAFF_IMPORTS.map((entry) => [entry.type, entry.label]));

/** Staff Manager › one bulk upload (STAFF-S7): the Excel upload, or the grid with `?door=grid`. */
export function StaffImportContent(): ReactNode {
  const router = useRouter();
  const kind = String(useParams()?.kind ?? '');
  const door = useSearchParams()?.get('door') === 'grid' ? 'grid' : 'excel';
  const job = staffImport(kind);
  const role = currentRole();
  const close = (
    <Button type="button" variant="outline" onClick={() => router.push(`${STAFF_BASE}/${STAFF_ACTIVE.slug}`)}>
      Close
    </Button>
  );
  if (!job) return <div className="space-y-2"><p className="text-sm text-muted-foreground">No such upload.</p>{close}</div>;
  const common = {
    target: { endpoint: STAFF_IMPORTS_ENDPOINT, type: job.type },
    title: job.label,
    description: job.description,
    columns: job.columns,
    applyLabel: 'Save',
    allowed: role !== null && STAFF_IMPORT_ROLES.has(role),
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Staff uploads" className="flex flex-wrap gap-3 text-sm">
          {STAFF_IMPORTS.map((entry) => (
            <Link key={entry.kind} href={staffImportHref(entry.kind)} aria-current={entry.kind === job.kind ? 'page' : undefined} className={cn('text-primary hover:underline', entry.kind === job.kind && 'font-semibold underline')}>
              {entry.label}
            </Link>
          ))}
        </nav>
        {close}
      </div>
      <nav aria-label="Way in" className="flex gap-2 text-sm">
        <Link href={`${staffImportHref(job.kind)}?door=excel`} className={cn('rounded-md px-3 py-1', door === 'excel' ? 'bg-primary text-primary-foreground' : 'text-primary hover:underline')}>
          Upload Excel
        </Link>
        <Link href={`${staffImportHref(job.kind)}?door=grid`} className={cn('rounded-md px-3 py-1', door === 'grid' ? 'bg-primary text-primary-foreground' : 'text-primary hover:underline')}>
          Type in a grid
        </Link>
      </nav>
      {door === 'grid' ? <ImportGrid {...common} /> : <ImportFlow {...common} />}
      <ImportLog endpoint={STAFF_IMPORTS_ENDPOINT} labels={LOG_LABELS} />
    </div>
  );
}
