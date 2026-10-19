'use client';

import { type ReactNode } from 'react';
import { useUnitDuesRow } from '@/hooks/use-unit-posting';
import { formatCurrency } from '@/lib/utils';

/** The unit, its billing name and what it owes, above every posting form of the unit. */
export function UnitPostingHeader({ unitId }: { unitId: string }): ReactNode {
  const row = useUnitDuesRow(unitId).data;
  if (!row) return null;
  const unit = row.block ? `${row.block}-${row.unit_number}` : row.unit_number;
  return (
    <dl className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Unit</dt>
        <dd className="font-medium">{unit}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Billing Name</dt>
        <dd className="font-medium">{row.billing_name ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Current Due</dt>
        <dd className="font-medium">{formatCurrency(Number(row.due))}</dd>
      </div>
    </dl>
  );
}
