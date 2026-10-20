'use client';

import { useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { useVisitors, visitorFiltersToParams, type Visitor, type VisitorFilters } from '@/hooks/use-gate';
import { useGateSettings } from '@/hooks/use-gate-settings';
import { useEntryReasons } from '@/hooks/use-gate-lists';
import {
  DayRangeFilter,
  REGISTER_PAGE_SIZES,
  indiaDate,
  indiaTime,
  registerFilters,
  useRegisterState,
} from '../register-kit';
import { VisitorDetailDialog } from './visitor-detail-dialog';
import { VISITOR_STATUS_LABELS, isOverrun } from './visitor-rows';

const STATUS_OPTIONS = Object.entries(VISITOR_STATUS_LABELS).map(([value, label]) => ({ value, label }));

// The society default when the gate settings cannot be read; a visitor's
// entry reason may carry its own stay (GATE-41).
const DEFAULT_STAY_MINUTES = 240;

const COLUMNS: DataTableColumn<Visitor>[] = [
  { key: 'date', header: 'Date', cell: (row) => indiaDate(row.checked_in_at ?? row.created_at), className: 'whitespace-nowrap' },
  { key: 'name', header: 'Visitor Name', cell: (row) => row.visitor_name },
  { key: 'phone', header: 'Phone', cell: (row) => row.visitor_phone ?? '—', className: 'whitespace-nowrap' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—', className: 'whitespace-nowrap' },
  { key: 'reason', header: 'Entry Reason', cell: (row) => row.entry_reason ?? row.purpose ?? '—' },
  { key: 'gate', header: 'Gate', cell: (row) => row.gate_name ?? '—' },
  { key: 'in', header: 'In Time', cell: (row) => indiaTime(row.checked_in_at), className: 'whitespace-nowrap' },
  { key: 'out', header: 'Out Time', cell: (row) => indiaTime(row.checked_out_at), className: 'whitespace-nowrap' },
  { key: 'status', header: 'Status', cell: (row) => VISITOR_STATUS_LABELS[row.status] ?? row.status },
];

/**
 * Gate & Visitors › Incident Investigator › Visitors (GATE-S4, GATE-10):
 * today's visitors by default, From / To, block links, status and a search
 * over name, phone and vehicle; the export holds the whole filtered result.
 * Check-in and check-out stay with the guard app, so rows only open View.
 */
export function VisitorsContent(): ReactNode {
  const state = useRegisterState('today');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const reasons = useEntryReasons(true);
  const [viewing, setViewing] = useState<Visitor | null>(null);
  const settings = useGateSettings();
  const stayMinutes = settings.data?.overstay_threshold_minutes ?? DEFAULT_STAY_MINUTES;

  const filters: VisitorFilters = {
    ...registerFilters(state),
    status: status || undefined,
    entry_reason_id: reason || undefined,
  };
  const query = useVisitors({ ...filters, page: state.page, limit: state.pageSize });

  return (
    <div className="space-y-3">
      <UnitBlockLinks value={state.block} onChange={state.setBlock} />
      <DataTable<Visitor>
        title="Visitors"
        columns={COLUMNS}
        actions={[{ key: 'view', header: 'View', label: 'View', onClick: setViewing }]}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        rowClassName={(row) => (isOverrun(row, stayMinutes) ? 'text-destructive' : undefined)}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        pageSizeOptions={REGISTER_PAGE_SIZES}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        search={{ value: state.q, onChange: state.setQ, placeholder: 'Name, phone or vehicle no.' }}
        filters={
          <>
            <DayRangeFilter value={state.range} onChange={state.setRange} />
            <CountedSelect
              id="visitor-status"
              label="Status"
              value={status}
              allLabel="All"
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                state.setPage(1);
              }}
            />
            {reasons.data && reasons.data.length > 0 ? (
              <CountedSelect
                id="visitor-reason"
                label="Entry Reason"
                value={reason}
                allLabel="All"
                options={reasons.data.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => {
                  setReason(value);
                  state.setPage(1);
                }}
              />
            ) : null}
          </>
        }
        export={{ path: '/gate/visitors/export', params: visitorFiltersToParams(filters) ?? {}, filename: 'visitors' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No visitors in this period."
      />
      <VisitorDetailDialog visitor={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
