'use client';

import { type ReactNode } from 'react';
import { DocumentAllocationDialog } from '@/components/income-registers/allocation-dialog';
import type { StatementRow } from '@/hooks/use-unit-statement';
import { allocationTarget } from './statement-actions';

/** View Allocation on a statement row (INC-21/22). */
export function AllocationDialog({ row, onClose }: { row: StatementRow; onClose: () => void }): ReactNode {
  return <DocumentAllocationDialog target={allocationTarget(row)} number={row.receipt_no ?? row.invoice_no ?? ''} onClose={onClose} />;
}
