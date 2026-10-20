'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportGrid } from '@/components/import/import-grid';
import { Button } from '@/components/ui/button';
import { canWriteFinance } from '@/lib/finance-roles';
import { EXPENSE_IMPORTS_ENDPOINT, expenseImport } from '../expense-imports';

/** One Bulk Posting job: the on-screen batch (`?door=grid`) or the Excel upload. */
export function ImportJob(): ReactNode {
  const router = useRouter();
  const type = String(useParams()?.type ?? '');
  const door = useSearchParams()?.get('door') === 'grid' ? 'grid' : 'excel';
  const job = expenseImport(type);
  const close = (
    <Button type="button" variant="outline" onClick={() => router.push('/expense-tracker/by-vendors/bulk-posting')}>
      Close
    </Button>
  );
  if (!job) return <div className="space-y-2"><p className="text-sm text-muted-foreground">No such bulk posting.</p>{close}</div>;
  const target = { endpoint: EXPENSE_IMPORTS_ENDPOINT, type: job.type };
  const common = { target, title: job.label, description: job.description, columns: job.columns, applyLabel: 'Post', allowed: canWriteFinance() };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{close}</div>
      {door === 'grid' ? <ImportGrid {...common} /> : <ImportFlow {...common} />}
    </div>
  );
}
