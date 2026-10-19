import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { UnitDuesStatus } from '@/hooks/use-unit-ledger';

export const DUES_STATUS_LABELS: Record<UnitDuesStatus, string> = {
  defaulter: 'Defaulter',
  due: 'Due',
  advance: 'Advance',
  clear: 'Clear',
};

const VARIANTS: Record<UnitDuesStatus, 'destructive' | 'warning' | 'success' | 'outline'> = {
  defaulter: 'destructive',
  due: 'warning',
  advance: 'success',
  clear: 'outline',
};

/** A unit's dues status (INC-S16) as a badge. */
export function DuesStatusBadge({ status }: { status: UnitDuesStatus }): ReactNode {
  return <Badge variant={VARIANTS[status]}>{DUES_STATUS_LABELS[status]}</Badge>;
}
