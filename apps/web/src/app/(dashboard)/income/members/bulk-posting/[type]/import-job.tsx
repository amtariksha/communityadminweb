'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportGrid } from '@/components/import/import-grid';
import { Button } from '@/components/ui/button';
import { currentRole } from '@/lib/current-role';
import { canWriteFinance } from '@/lib/finance-roles';
import { BULK_POSTING_HREF, memberImport, type MemberImport } from '../member-imports';

function mayRun(job: MemberImport): boolean {
  if (!job.roles) return canWriteFinance();
  const role = currentRole();
  return role !== null && job.roles.includes(role);
}

/** One Member Income bulk posting: the batch grid (`?door=grid`) or the Excel upload. */
export function MemberImportJob(): ReactNode {
  const router = useRouter();
  const type = String(useParams()?.type ?? '');
  const door = useSearchParams()?.get('door') === 'grid' ? 'grid' : 'excel';
  const job = memberImport(type);
  const close = (
    <Button type="button" variant="outline" onClick={() => router.push(BULK_POSTING_HREF)}>
      Close
    </Button>
  );
  if (!job) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No such bulk posting.</p>
        {close}
      </div>
    );
  }
  const common = {
    target: { endpoint: job.endpoint, type: job.type },
    title: job.label,
    description: job.description,
    columns: job.columns,
    applyLabel: 'Post',
    allowed: mayRun(job),
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{close}</div>
      {door === 'grid' ? <ImportGrid {...common} /> : <ImportFlow {...common} />}
    </div>
  );
}
