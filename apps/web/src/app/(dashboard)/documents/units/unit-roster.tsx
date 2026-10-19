'use client';

import { useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { DataTable, type DataTableAction, type DataTableColumn } from '@/components/data-table';
import { unitSummaryParams, useUnitFileSummary, type UnitFileSummaryRow } from '@/hooks/use-document-files';
import { isNotDeployed } from '@/lib/not-deployed';
import { canWriteDocuments } from '../files/file-actions';

const ROSTER = '/documents/units';

const COLUMNS: DataTableColumn<UnitFileSummaryRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name ?? '' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number },
  { key: 'files', header: 'Files', cell: (row) => String(row.files) },
];

function actions(): DataTableAction<UnitFileSummaryRow>[] {
  const view: DataTableAction<UnitFileSummaryRow> = {
    key: 'view',
    header: 'View',
    label: 'View',
    href: (row) => `${ROSTER}/${row.unit_id}`,
  };
  if (!canWriteDocuments()) return [view];
  return [
    {
      key: 'upload',
      header: 'Action',
      label: 'Upload',
      href: (row) => `/documents/upload?root=unit&unit_id=${row.unit_id}&return=${encodeURIComponent(ROSTER)}`,
    },
    view,
  ];
}

/**
 * Admin Files › Unit Specific Files (FILE-S5): every unit of the society,
 * those without files too, with block links above and the total number
 * of files below. Upload and View sit on each unit's row.
 */
export function UnitRoster(): ReactNode {
  const [block, setBlock] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const filters = { block, q, page, limit: pageSize };
  const query = useUnitFileSummary(filters);
  const exportFilters = unitSummaryParams({ block, q, page: 1, limit: pageSize });
  delete exportFilters.page;
  delete exportFilters.limit;

  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">Unit Specific Files is not available yet on this server.</p>;
  }
  return (
    <div className="space-y-3">
      <UnitBlockLinks
        value={block}
        onChange={(next) => {
          setBlock(next);
          setPage(1);
        }}
      />
      <DataTable
        title="Unit Specific Files"
        columns={COLUMNS}
        actions={actions()}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.unit_id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: q, onChange: (value) => { setQ(value); setPage(1); }, placeholder: 'Search unit or name' }}
        export={{ path: '/documents/unit-summary/export', params: exportFilters, filename: 'unit-specific-files' }}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyText="No units match."
      />
      <p className="text-sm font-medium">Total No. of files - {query.data?.total_files ?? 0}</p>
    </div>
  );
}
