'use client';

import { useState, type ReactNode } from 'react';
import { UnitBlockLinks } from '@/components/block-links';
import { CountedSelect, DataTable, type DataTableColumn } from '@/components/data-table';
import { DayRangeFilter, type DayRange } from '@/components/day-range-filter';
import { gateMoveParams, useGateMoves, type GateMove, type GateMoveFilters } from '@/hooks/use-gate-desk';
import { todayIST } from '@/lib/date';

const TYPE_OPTIONS = [
  { value: 'move_in', label: 'Move-in' },
  { value: 'move_out', label: 'Move-out' },
];

const formatDay = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;

const COLUMNS: DataTableColumn<GateMove>[] = [
  { key: 'date', header: 'Date', cell: (row) => formatDay(row.date), className: 'whitespace-nowrap' },
  { key: 'block', header: 'Block', cell: (row) => row.block ?? '—' },
  { key: 'unit', header: 'Unit', cell: (row) => row.unit_number },
  { key: 'type', header: 'Type', cell: (row) => (row.type === 'move_in' ? 'Move-in' : 'Move-out') },
  { key: 'status', header: 'Status', cell: () => 'Approved' },
];

/** Today and the next seven days, as `YYYY-MM-DD` India days. */
export function defaultMoveWindow(today: string = todayIST()): DayRange {
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  return { from: today, to: end.toISOString().slice(0, 10) };
}

/**
 * Gate & Visitors › Move In/Out (GATE-S2, GATE-45): who is moving in or out,
 * for the gate desk — date, block, unit and type only, never names or the
 * lease. Read-only.
 */
export function MovesContent(): ReactNode {
  const [range, setRange] = useState<DayRange>(() => defaultMoveWindow());
  const [type, setType] = useState('');
  const [block, setBlock] = useState<string | null>(null);
  const filters: GateMoveFilters = {
    date_from: range.from || undefined,
    date_to: range.to || undefined,
    type: (type || undefined) as GateMoveFilters['type'],
    block: block ?? undefined,
  };
  const query = useGateMoves(filters);

  if (query.data === null) return <p className="text-sm text-muted-foreground">Move In/Out for the gate is not available yet.</p>;
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-3">
      <UnitBlockLinks value={block} onChange={setBlock} />
      <DataTable<GateMove>
        title="Move In/Out"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => `${row.type}-${row.id}`}
        total={rows.length}
        // The window is short (a week by default): one page holds it.
        page={1}
        pageSize={Math.max(rows.length, 1)}
        onPageChange={() => undefined}
        filters={
          <>
            <DayRangeFilter value={range} onChange={setRange} />
            <CountedSelect id="move-type" label="Type" value={type} allLabel="All" options={TYPE_OPTIONS} onChange={setType} />
          </>
        }
        export={{ path: '/gate/moves/export', params: gateMoveParams(filters), filename: 'move-in-out' }}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        onRetry={() => void query.refetch()}
        emptyText="No moves scheduled in this period."
      />
    </div>
  );
}
