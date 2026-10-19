'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { prListParams, usePurchaseRequestList, type PRBucket, type PRListRow } from '@/hooks/use-purchase-requests';
import { useRequestActions } from './request-actions';

const PAGE_SIZES = [10, 25, 50] as const;

export interface BucketTableProps {
  title: string;
  bucket: PRBucket;
  level?: number;
  count: number;
  columns: readonly DataTableColumn<PRListRow>[];
  /** Closed: the fetched date range. */
  range?: { from?: string; to?: string };
}

/** One bucket of the purchase request lists: heading with its count and its own SB-04 table. */
export function BucketTable(props: BucketTableProps): ReactNode {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filters = { bucket: props.bucket, level: props.level, search: search || undefined, ...props.range };
  const query = usePurchaseRequestList({ ...filters, page, limit: pageSize });
  const actions = useRequestActions(props.bucket);
  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return (
    <section className="space-y-2" aria-label={props.title}>
      <h3 className="text-sm font-semibold">
        {props.title} ({props.count})
      </h3>
      <DataTable<PRListRow>
        title={props.title}
        columns={props.columns}
        actions={actions}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={{ value: search, onChange: onSearch, placeholder: 'PR no., title or vendor' }}
        export={{ path: '/purchases/requests/export', params: prListParams(filters), filename: `purchase-requests-${props.bucket}` }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No matching rows"
      />
    </section>
  );
}
