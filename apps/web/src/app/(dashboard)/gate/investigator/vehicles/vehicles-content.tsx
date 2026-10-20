'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { LockPanel } from '@/components/gate-lock/lock-panel';
import { useGates } from '@/hooks';
import { useVehicleLogs, vehicleLogFilterParams, type VehicleLog, type VehicleLogFilters } from '@/hooks/use-vehicle-logs';
import { isLocked, unlockHeaders } from '@/lib/gate-unlock';
import { DayRangeFilter, REGISTER_PAGE_SIZES, indiaDateTime, useRegisterState } from '../register-kit';

const COLUMNS: DataTableColumn<VehicleLog>[] = [
  { key: 'at', header: 'Date & Time', cell: (row) => indiaDateTime(row.logged_at), className: 'whitespace-nowrap' },
  { key: 'plate', header: 'Plate Number', cell: (row) => row.vehicle_number, className: 'font-mono' },
  { key: 'gate', header: 'Gate', cell: (row) => row.gate_name ?? '—' },
  { key: 'direction', header: 'Direction', cell: (row) => (row.direction === 'exit' ? 'Out' : 'In') },
  { key: 'recognized', header: 'Recognized', cell: (row) => (row.is_recognized ? 'Yes' : 'No') },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number ?? '—' },
];

const RECOGNIZED_OPTIONS = [
  { value: 'true', label: 'Recognized' },
  { value: 'false', label: 'Not recognized' },
];

const DIRECTION_OPTIONS = [
  { value: 'entry', label: 'In' },
  { value: 'exit', label: 'Out' },
];

/**
 * Gate & Visitors › Incident Investigator › Vehicle Logs (GATE-S8, GATE-43):
 * the camera log with an India day range (today by default), gate,
 * direction, recognized and a plate search, the export of the whole result,
 * and View Logs. Behind the investigator lock for an admin without a guard role.
 */
export function VehiclesContent(): ReactNode {
  const state = useRegisterState('today');
  const [gateId, setGateId] = useState('');
  const [direction, setDirection] = useState('');
  const [recognized, setRecognized] = useState('');
  const gates = useGates();
  const filters: Omit<VehicleLogFilters, 'page' | 'limit'> = {
    date_from: state.range.from || undefined,
    date_to: state.range.to || undefined,
    gate_id: gateId || undefined,
    direction: (direction || undefined) as VehicleLogFilters['direction'],
    is_recognized: recognized === '' ? undefined : recognized === 'true',
    q: state.q || undefined,
  };
  const query = useVehicleLogs({ ...filters, page: state.page, limit: state.pageSize });
  const pick = (set: (value: string) => void) => (value: string) => {
    set(value);
    state.setPage(1);
  };

  if (query.isError && isLocked(query.error)) return <LockPanel scope="vehicles" />;

  return (
    <div className="space-y-2">
      <div className="text-right">
        <Link href="/gate/investigator/access-log" className="text-sm text-primary underline">
          View Logs
        </Link>
      </div>
      <DataTable<VehicleLog>
        title="Vehicle Logs"
        columns={COLUMNS}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        pageSizeOptions={REGISTER_PAGE_SIZES}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
        search={{ value: state.q, onChange: state.setQ, placeholder: 'Plate number' }}
        filters={
          <>
            <DayRangeFilter value={state.range} onChange={state.setRange} />
            <CountedSelect
              id="vehicle-gate"
              label="Gate"
              value={gateId}
              allLabel="All gates"
              options={(gates.data ?? []).map((gate) => ({ value: gate.id, label: gate.name }))}
              onChange={pick(setGateId)}
            />
            <CountedSelect id="vehicle-direction" label="Direction" value={direction} allLabel="All" options={DIRECTION_OPTIONS} onChange={pick(setDirection)} />
            <CountedSelect id="vehicle-recognized" label="Recognized" value={recognized} allLabel="All" options={RECOGNIZED_OPTIONS} onChange={pick(setRecognized)} />
          </>
        }
        export={{
          path: '/gate/anpr/logs/export',
          params: vehicleLogFilterParams(filters),
          filename: 'vehicle-logs',
          headers: unlockHeaders('vehicles'),
        }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No vehicles were read at the gates in this period."
      />
    </div>
  );
}
