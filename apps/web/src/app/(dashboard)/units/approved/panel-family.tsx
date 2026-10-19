import { type ReactNode } from 'react';
import type { UnitPanelFamilyMember } from '@/hooks/use-unit-panel';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';
import { memberTypeLabel } from './unit-labels';

const COLUMNS: PanelColumn<UnitPanelFamilyMember>[] = [
  { header: 'Name', cell: (row) => row.name ?? 'Unknown' },
  { header: 'Relation', cell: (row) => memberTypeLabel(row.member_type) },
  { header: 'Linked to', cell: (row) => row.linked_to ?? '—' },
];

export function PanelFamily({ family, count }: { family: UnitPanelFamilyMember[]; count: number }): ReactNode {
  return (
    <PanelSection title="Family Members" count={count}>
      <PanelTable label="Family Members" columns={COLUMNS} rows={family} rowKey={(row) => row.id} />
    </PanelSection>
  );
}
