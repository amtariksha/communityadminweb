import { type ReactNode } from 'react';
import type { UnitPanelStaff } from '@/hooks/use-unit-panel';
import { formatDate } from '@/lib/utils';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';

const COLUMNS: PanelColumn<UnitPanelStaff>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Category', cell: (row) => row.category.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) },
  { header: 'Since', cell: (row) => formatDate(row.since) },
];

/** Staff: the household helpers working at the unit now. */
export function PanelStaff({ staff, count }: { staff: UnitPanelStaff[]; count: number }): ReactNode {
  return (
    <PanelSection title="Staff" count={count}>
      <PanelTable label="Staff" columns={COLUMNS} rows={staff} rowKey={(row) => row.worker_id} />
    </PanelSection>
  );
}
