'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { ImportDoors } from '@/components/import/import-doors';
import { ImportLog } from '@/components/import/import-log';
import type { ImportPreviewColumn } from '@/components/import/import-rows-table';
import { Button } from '@/components/ui/button';
import { canWriteFinance } from '@/lib/finance-roles';
import { GL_IMPORT_LABELS, LEDGER_IMPORTS_ENDPOINT } from '../../gl-imports';

interface GlUploadPageProps {
  type: 'gl_opening_balance' | 'gl_journal' | 'gl_account';
  title: string;
  description: string;
  columns: readonly ImportPreviewColumn[];
  closeTo: string;
}

/** One GL-24 upload (GL-S8 and the Chart of Accounts pages): Excel or grid, then the recent uploads. */
export function GlUploadPage({ type, title, description, columns, closeTo }: GlUploadPageProps): ReactNode {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.push(closeTo)}>
          Close
        </Button>
      </div>
      <ImportDoors target={{ endpoint: LEDGER_IMPORTS_ENDPOINT, type }} title={title} description={description} columns={columns} applyLabel="Post" allowed={canWriteFinance()} />
      <ImportLog endpoint={LEDGER_IMPORTS_ENDPOINT} type={type} labels={GL_IMPORT_LABELS} />
    </div>
  );
}
