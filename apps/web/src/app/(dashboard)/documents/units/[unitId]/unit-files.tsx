'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { useDocuments } from '@/hooks/use-documents';
import type { DocumentFile } from '@/hooks/use-document-files';
import { canWriteDocuments } from '../../files/file-actions';
import { FileTable } from '../../files/file-table';

/**
 * Files of one unit (FILE-S6), opened from View on the roster. The unit's
 * current members read these in their app (the audience rule).
 */
export function UnitFiles({ unitId }: { unitId: string }): ReactNode {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const files = useDocuments({ unit_id: unitId, search: search || undefined, page, limit: pageSize });
  const rows = (files.data?.data ?? []) as unknown as DocumentFile[];
  const here = `/documents/units/${unitId}`;
  const unitLabel = rows[0]?.unit_number;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {unitLabel ? `Files of unit ${unitLabel}.` : 'Files of this unit.'} Its residents can read them in their app.
        </p>
        <div className="flex gap-2">
          <Link href="/documents/units" className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
            Back to units
          </Link>
          {canWriteDocuments() && (
            <Link
              href={`/documents/upload?root=unit&unit_id=${unitId}&return=${encodeURIComponent(here)}`}
              className={buttonVariants()}
              data-slot="button"
              data-size="default"
            >
              Upload File
            </Link>
          )}
        </div>
      </div>
      <FileTable
        title="Unit files"
        rows={rows}
        total={files.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: search, onChange: (value) => { setSearch(value); setPage(1); }, placeholder: 'Search files' }}
        loading={files.isLoading}
        error={files.error}
        onRetry={() => void files.refetch()}
        emptyText="No files for this unit."
        returnTo={here}
      />
    </div>
  );
}
