'use client';

import { useState, type ReactNode } from 'react';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { useGates } from '@/hooks';
import { useVehicleLogs, type VehicleLog } from '@/hooks/use-vehicle-logs';
import { todayIST } from '@/lib/date';
import { REGISTER_PAGE_SIZES, indiaDateTime } from '../register-kit';

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

/**
 * Gate & Visitors › Incident Investigator › Vehicle Logs (GATE-S8 over the
 * camera log we hold): one day, gate and recognized. The range, plate search
 * and export join with the investigator lock (GATE-43).
 */
export function VehiclesContent(): ReactNode {
  const [date, setDate] = useState(todayIST());
  const [gateId, setGateId] = useState('');
  const [recognized, setRecognized] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(REGISTER_PAGE_SIZES[0]);
  const gates = useGates();
  const query = useVehicleLogs({
    date: date || undefined,
    gate_id: gateId || undefined,
    is_recognized: recognized === '' ? undefined : recognized === 'true',
    page,
    limit: pageSize,
  });
  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  return (
    <DataTable<VehicleLog>
      title="Vehicle Logs"
      columns={COLUMNS}
      rows={query.data?.data ?? []}
      rowKey={(row) => row.id}
      total={query.data?.total ?? 0}
      page={page}
      pageSize={pageSize}
      pageSizeOptions={REGISTER_PAGE_SIZES}
      onPageChange={setPage}
      onPageSizeChange={reset(setPageSize)}
      filters={
        <>
          <label className="flex items-center gap-1 text-sm">
            Date
            <Input type="date" aria-label="Date" className="w-36" value={date} onChange={(event) => reset(setDate)(event.target.value)} />
          </label>
          <CountedSelect
            id="vehicle-gate"
            label="Gate"
            value={gateId}
            allLabel="All gates"
            options={(gates.data ?? []).map((gate) => ({ value: gate.id, label: gate.name }))}
            onChange={reset(setGateId)}
          />
          <CountedSelect
            id="vehicle-recognized"
            label="Recognized"
            value={recognized}
            allLabel="All"
            options={RECOGNIZED_OPTIONS}
            onChange={reset(setRecognized)}
          />
        </>
      }
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText="No vehicles were read at the gates on this day."
    />
  );
}
