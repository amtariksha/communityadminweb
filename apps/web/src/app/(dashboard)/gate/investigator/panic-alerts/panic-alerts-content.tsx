'use client';

import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { sosListParams, useSosAlertList, type SosAlert, type SosListFilters } from '@/hooks/use-sos';
import { SosTimelineDialog } from '../../../sos/sos-timeline-dialog';
import { DayRangeFilter, REGISTER_PAGE_SIZES, indiaDateTime, useRegisterState } from '../register-kit';

export const SOS_STATUS_LABELS: Readonly<Record<string, string>> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
  false_alarm: 'False alarm',
  cancelled: 'Cancelled',
};

const STATUS_OPTIONS = Object.entries(SOS_STATUS_LABELS).map(([value, label]) => ({ value, label }));

const COLUMNS: DataTableColumn<SosAlert>[] = [
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—', className: 'whitespace-nowrap' },
  { key: 'name', header: 'Resident Name', cell: (row) => row.triggered_by_name ?? '—' },
  { key: 'alert', header: 'Alert Date', cell: (row) => indiaDateTime(row.created_at), className: 'whitespace-nowrap' },
  // Response Date = when a responder acknowledged it (GATE-S6).
  { key: 'response', header: 'Response Date', cell: (row) => indiaDateTime(row.acknowledged_at), className: 'whitespace-nowrap' },
  { key: 'status', header: 'Status', cell: (row) => SOS_STATUS_LABELS[row.status] ?? row.status },
];

/**
 * Gate & Visitors › Incident Investigator › Panic Alerts (GATE-11, screen
 * GATE-S6): every alert as a searchable, exportable table. View opens the
 * incident timeline with Acknowledge / Resolve / False alarm. The live SOS
 * console and the siren stay under More.
 */
export function PanicAlertsContent(): ReactNode {
  const state = useRegisterState('all');
  const [status, setStatus] = useState('');
  const [viewing, setViewing] = useState('');
  const filters: SosListFilters = {
    status,
    date_from: state.range.from,
    date_to: state.range.to,
    q: state.q,
  };
  const query = useSosAlertList({ ...filters, page: state.page, limit: state.pageSize });

  return (
    <>
      <DataTable<SosAlert>
        title="Panic Alerts"
        columns={COLUMNS}
        actions={[{ key: 'view', header: 'View', label: 'View', onClick: (row) => setViewing(row.id) }]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        pageSizeOptions={REGISTER_PAGE_SIZES}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        search={{ value: state.q, onChange: state.setQ, placeholder: 'Block, unit or name' }}
        filters={
          <>
            <DayRangeFilter value={state.range} onChange={state.setRange} />
            <CountedSelect
              id="panic-status"
              label="Status"
              value={status}
              allLabel="All"
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                state.setPage(1);
              }}
            />
          </>
        }
        export={{ path: '/safety/sos/export', params: sosListParams(filters), filename: 'panic-alerts' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No panic alerts in this period."
      />
      <SosTimelineDialog id={viewing} onClose={() => setViewing('')} withActions />
    </>
  );
}
