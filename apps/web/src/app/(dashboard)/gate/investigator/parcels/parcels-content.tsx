'use client';

import { useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { parcelFiltersToParams, useParcels, type Parcel, type ParcelFilters } from '@/hooks/use-gate';
import { PARCEL_STATUS_BADGE, PARCEL_STATUS_OPTIONS } from '../../gate-lists';
import { DayRangeFilter, REGISTER_PAGE_SIZES, indiaDateTime, registerFilters, useRegisterState } from '../register-kit';

const DELIVERY_MODES: Readonly<Record<string, string>> = {
  normal: 'Normal',
  leave_at_gate: 'Leave at Gate',
  give_to_security: 'Give to Security',
};

const COLUMNS: DataTableColumn<Parcel>[] = [
  { key: 'received', header: 'Received At', cell: (row) => indiaDateTime(row.received_at), className: 'whitespace-nowrap' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—', className: 'whitespace-nowrap' },
  { key: 'courier', header: 'Courier', cell: (row) => row.courier_name ?? '—' },
  { key: 'tracking', header: 'Tracking No.', cell: (row) => row.tracking_number ?? '—', className: 'font-mono text-xs' },
  { key: 'mode', header: 'Delivery Mode', cell: (row) => DELIVERY_MODES[row.delivery_mode ?? 'normal'] ?? row.delivery_mode ?? '—' },
  { key: 'status', header: 'Status', cell: (row) => PARCEL_STATUS_BADGE[row.status]?.label ?? row.status },
  { key: 'collected', header: 'Collected At', cell: (row) => indiaDateTime(row.collected_at), className: 'whitespace-nowrap' },
  { key: 'by', header: 'Collected By', cell: (row) => row.collected_by_display ?? '—' },
];

/** Gate & Visitors › Incident Investigator › Parcels (GATE-S10, GATE-10). */
export function ParcelsContent(): ReactNode {
  const state = useRegisterState('all');
  const [status, setStatus] = useState('');
  const filters: ParcelFilters = { ...registerFilters(state), status: status || undefined };
  const query = useParcels({ ...filters, page: state.page, limit: state.pageSize });

  return (
    <div className="space-y-3">
      <UnitBlockLinks value={state.block} onChange={state.setBlock} />
      <DataTable<Parcel>
        title="Parcels"
        columns={COLUMNS}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        pageSizeOptions={REGISTER_PAGE_SIZES}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        search={{ value: state.q, onChange: state.setQ, placeholder: 'Courier, tracking no. or unit' }}
        filters={
          <>
            <DayRangeFilter value={state.range} onChange={state.setRange} />
            <CountedSelect
              id="parcel-status"
              label="Status"
              value={status}
              allLabel="All"
              options={PARCEL_STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                state.setPage(1);
              }}
            />
          </>
        }
        export={{ path: '/gate/parcels/export', params: parcelFiltersToParams(filters) ?? {}, filename: 'parcels' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No parcels in this period."
      />
    </div>
  );
}
