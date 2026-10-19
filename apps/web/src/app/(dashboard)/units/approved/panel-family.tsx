import Link from 'next/link';
import { type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import type { UnitPanelFamilyMember } from '@/hooks/use-unit-panel';
import { PanelSection } from './panel-section';
import { PanelTable, type PanelColumn } from './panel-table';
import { unitDialogHref } from './panel-members';
import { memberTypeLabel } from './unit-labels';

const COLUMNS: PanelColumn<UnitPanelFamilyMember>[] = [
  { header: 'Name', cell: (row) => row.name ?? 'Unknown' },
  { header: 'Relation', cell: (row) => memberTypeLabel(row.member_type) },
  { header: 'Linked to', cell: (row) => row.linked_to ?? '—' },
];

export function PanelFamily({ family, count, unitId }: { family: UnitPanelFamilyMember[]; count: number; unitId: string }): ReactNode {
  return (
    <PanelSection
      title="Family Members"
      count={count}
      actions={
        <Link href={unitDialogHref(unitId)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Add Family Members
        </Link>
      }
    >
      <PanelTable label="Family Members" columns={COLUMNS} rows={family} rowKey={(row) => row.id} />
    </PanelSection>
  );
}
