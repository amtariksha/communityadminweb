'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { Input } from '@/components/ui/input';
import { useStaffAttendance } from '@/hooks';
import type { Attendance } from '@/hooks/use-staff';
import { todayIST } from '@/lib/date';
import { indiaTime } from '@/lib/india-time';
import { formatDuration } from '../staff-fields';

const PAGE_SIZES = [25, 50, 100] as const;

const STATUS_LABELS: Readonly<Record<string, string>> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
};

const COLUMNS: DataTableColumn<Attendance>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.staff_name ?? '—' },
  { key: 'shift', header: 'Shift', cell: (row) => row.shift_name ?? '—' },
  { key: 'gate', header: 'Gate', cell: (row) => row.gate_name ?? '—' },
  { key: 'in', header: 'Check In', cell: (row) => indiaTime(row.clock_in), className: 'whitespace-nowrap' },
  { key: 'out', header: 'Check Out', cell: (row) => indiaTime(row.clock_out), className: 'whitespace-nowrap' },
  { key: 'duration', header: 'Duration', cell: (row) => formatDuration(row.duration_minutes) },
  { key: 'status', header: 'Status', cell: (row) => STATUS_LABELS[row.status] ?? row.status },
];

/**
 * Staff Manager › Attendance (STAFF-10): one day's clock-ins, today by
 * default. The range matrix with Fetch is STAFF-S4 (a later ticket); Clock
 * In stays on the standard Staff page and the guard app.
 */
export function AttendanceContent(): ReactNode {
  const [date, setDate] = useState(todayIST());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const query = useStaffAttendance({ date, page, limit: pageSize });

  return (
    <DataTable<Attendance>
      title="Attendance"
      columns={COLUMNS}
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
      filters={
        <label className="flex items-center gap-1 text-sm">
          Date
          <Input
            type="date"
            aria-label="Date"
            className="w-36"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
      }
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      onRetry={() => void query.refetch()}
      emptyText="No one clocked in on this day."
    />
  );
}
