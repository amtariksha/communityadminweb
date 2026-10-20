'use client';

import { useState, type ReactNode } from 'react';
import { DataTable, FetchPanel, type DataTableColumn } from '@/components/data-table';
import type { FetchCriteria } from '@/components/data-table/fetch-criteria';
import {
  MATRIX_MAX_DAYS,
  matrixParams,
  rangeDays,
  useAttendanceMatrix,
  type AttendanceCell,
  type AttendanceMatrixQuery,
  type AttendanceMatrixRow,
} from '@/hooks/use-attendance-matrix';
import type { RegisterSearchKey } from '@/hooks/use-staff-register';
import { ApiError } from '@/lib/api-error';
import { StaffSearchBy } from '../staff-search';

const PAGE_SIZES = [40, 80, 160] as const;

const dayHeader = (isoDay: string): string => `${isoDay.slice(8, 10)}/${isoDay.slice(5, 7)}`;

function cellText(cell: AttendanceCell | undefined, times: boolean): string {
  if (!cell?.mark) return '';
  if (!times || cell.mark === 'LV') return cell.mark;
  return `${cell.mark} ${cell.first_in ?? ''}–${cell.last_out ?? ''}`;
}

/** Sl.No (the table's own) · Category / Badge · Name · one column per day · Total In Hours. */
export function matrixColumns(days: readonly string[], times: boolean): DataTableColumn<AttendanceMatrixRow>[] {
  return [
    { key: 'category', header: 'Category / Badge', cell: (row) => [row.category_name, row.badge_no].filter(Boolean).join(' / ') },
    { key: 'name', header: 'Name', cell: (row) => row.name },
    ...days.map((each, index) => ({
      key: `day-${each}`,
      header: dayHeader(each),
      cell: (row: AttendanceMatrixRow) => cellText(row.cells[index], times),
      className: 'whitespace-nowrap text-center',
    })),
    { key: 'total', header: 'Total In Hours', cell: (row) => String(row.total_hours) },
  ];
}

function SourceChoice(): ReactNode {
  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-sm">
      <legend className="sr-only">Source</legend>
      <label className="flex items-center gap-1 text-muted-foreground">
        <input type="radio" name="attendance-source" disabled />
        Device Check-in/out
      </label>
      <label className="flex items-center gap-1">
        <input type="radio" name="attendance-source" defaultChecked />
        Manual Check-in/out
      </label>
    </fieldset>
  );
}

/**
 * Staff Manager › Attendance (STAFF-44, screen STAFF-S4): opens empty
 * (SB-09); pick From / To (at most 62 days), a search and the timings tick,
 * then Fetch. Against an API without the matrix the page shows `fallback`
 * (today's one-day list) under a "not available yet" line.
 */
export function AttendanceMatrix({ fallback }: { fallback?: ReactNode }): ReactNode {
  const [q, setQ] = useState('');
  const [searchBy, setSearchBy] = useState<RegisterSearchKey>('any');
  const [times, setTimes] = useState(false);
  const [query, setQuery] = useState<AttendanceMatrixQuery | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const matrix = useAttendanceMatrix(query, { page, limit: pageSize });
  const missing = matrix.error instanceof ApiError && matrix.error.status === 404;
  const rows = matrix.data?.data ?? [];
  const first = rows.length ? (page - 1) * pageSize + 1 : 0;

  function fetch(criteria: FetchCriteria): void {
    if (rangeDays(criteria.from, criteria.to) > MATRIX_MAX_DAYS) {
      setRangeError(`Choose at most ${MATRIX_MAX_DAYS} days.`);
      return;
    }
    setRangeError(null);
    setQuery({ from: criteria.from, to: criteria.to, q: q.trim() || undefined, by: searchBy, times });
    setPage(1);
  }

  const extra = (
    <>
      <SourceChoice />
      <div className="space-y-1">
        <label className="text-sm" htmlFor="attendance-search">
          Search
        </label>
        <input id="attendance-search" type="search" className="flex h-10 w-48 rounded-md border px-3 text-sm" value={q} onChange={(event) => setQ(event.target.value)} />
      </div>
      <StaffSearchBy value={searchBy} onChange={setSearchBy} />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={times} onChange={(event) => setTimes(event.target.checked)} />
        Show Check In and Check Out Timings
      </label>
    </>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">Attendance</h3>
      {missing && (
        <p role="alert" className="text-sm text-muted-foreground">
          The attendance matrix is not available yet on this server.
        </p>
      )}
      {rangeError && (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      )}
      <DataTable<AttendanceMatrixRow>
        title="Staff Attendance"
        serialHeader="Sl.No"
        columns={matrixColumns(matrix.data?.days ?? [], query?.times ?? false)}
        rows={rows}
        rowKey={(row) => `${row.kind}:${row.id}`}
        total={matrix.data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        filters={rows.length > 0 ? <span className="text-sm text-muted-foreground">{`Rows ${first} to ${first + rows.length - 1}`}</span> : undefined}
        export={query ? { path: '/staff/attendance/matrix/export', params: matrixParams(query), filename: 'staff-attendance' } : undefined}
        loading={matrix.isLoading}
        error={missing ? undefined : matrix.error ?? undefined}
        onRetry={() => void matrix.refetch()}
        emptyText="No working staff match."
        fetchMode={{
          fetched: query !== null,
          prompt: 'Choose a date range and press Fetch.',
          panel: (
            <FetchPanel
              title="Fetch attendance"
              range="date"
              requireRange
              extra={extra}
              onFetch={fetch}
              busy={matrix.isFetching}
            />
          ),
        }}
      />
      {missing && fallback}
    </div>
  );
}
