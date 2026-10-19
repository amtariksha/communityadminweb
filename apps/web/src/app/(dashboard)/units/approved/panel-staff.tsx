'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { UnitPanelStaff } from '@/hooks/use-unit-panel';
import { formatDate } from '@/lib/utils';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';
import { StaffForm } from './staff-form';

const COLUMNS: PanelColumn<UnitPanelStaff>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Category', cell: (row) => row.category.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) },
  { header: 'Since', cell: (row) => formatDate(row.since) },
];

/** Staff: the household helpers working at the unit now. */
export function PanelStaff({ staff, count, unitId }: { staff: UnitPanelStaff[]; count: number; unitId: string }): ReactNode {
  const [adding, setAdding] = useState(false);
  return (
    <>
    <PanelSection
      title="Staff"
      count={count}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          + Create New Staff
        </Button>
      }
    >
      <PanelTable label="Staff" columns={COLUMNS} rows={staff} rowKey={(row) => row.worker_id} />
    </PanelSection>
    {adding && <StaffForm unitId={unitId} open onClose={() => setAdding(false)} />}
    </>
  );
}
