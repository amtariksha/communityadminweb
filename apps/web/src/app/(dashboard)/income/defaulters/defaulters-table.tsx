'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { defaulterParams, type DefaulterFilters, type DefaulterRow } from '@/hooks/use-defaulters';
import { formatCurrency } from '@/lib/utils';

const unitLabel = (row: DefaulterRow): string => (row.block ? `${row.block}-${row.unit_number}` : row.unit_number);

interface DefaultersTableProps {
  rows: readonly DefaulterRow[];
  filters: DefaulterFilters;
  selected: ReadonlySet<string>;
  onToggle: (unitId: string) => void;
  onSearch: (q: string) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Sl.No · Type · Unit · Primary Contact · Bill to Party Name · Email · Phone · Due · Select (INC-S29). */
export function DefaultersTable(props: DefaultersTableProps): ReactNode {
  const { rows, selected, onToggle } = props;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const columns = useMemo<DataTableColumn<DefaulterRow>[]>(
    () => [
      { key: 'type', header: 'Type', cell: (r) => r.type ?? '', text: (r) => r.type ?? '' },
      { key: 'unit', header: 'Unit', cell: unitLabel, text: unitLabel },
      { key: 'contact', header: 'Primary Contact', cell: (r) => r.primary_contact_name ?? '', text: (r) => r.primary_contact_name ?? '' },
      { key: 'bill-to', header: 'Bill to Party Name', cell: (r) => r.bill_to_name ?? '', text: (r) => r.bill_to_name ?? '' },
      { key: 'email', header: 'Email', cell: (r) => r.email ?? '', text: (r) => r.email ?? '' },
      { key: 'phone', header: 'Phone', cell: (r) => r.phone ?? '', text: (r) => r.phone ?? '' },
      {
        key: 'due',
        header: 'Due',
        className: 'text-right',
        cell: (r) => formatCurrency(Number(r.total_due)),
        text: (r) => Number(r.total_due).toFixed(2),
      },
      {
        key: 'select',
        header: 'Select',
        cell: (r) => (
          <input type="checkbox" aria-label={`Select ${unitLabel(r)}`} checked={selected.has(r.unit_id)} onChange={() => onToggle(r.unit_id)} />
        ),
        text: () => '',
      },
    ],
    [selected, onToggle],
  );
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <DataTable
      title="Defaulters"
      serialHeader="Sl.No"
      columns={columns}
      rows={visible}
      rowKey={(r) => r.unit_id}
      total={rows.length}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      search={{ value: props.filters.q ?? '', onChange: (q) => { setPage(1); props.onSearch(q); }, placeholder: 'Search unit, contact or bill-to name' }}
      export={{ path: '/invoices/defaulters/export', params: defaulterParams(props.filters), filename: 'defaulters' }}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      emptyText="No defaulters for these filters"
    />
  );
}
