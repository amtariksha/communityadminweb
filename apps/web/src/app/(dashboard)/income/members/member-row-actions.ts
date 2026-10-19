import type { DataTableAction } from '@/components/data-table';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import type { FinanceAccess } from '@/lib/finance-roles';

export const MEMBER_INCOME_BASE = '/income/members';

/**
 * The row buttons of Member Income (INC-S16), each in a column of its own.
 * A button appears once the screen it opens has shipped; posting buttons
 * are for the finance writers only.
 */
export function memberRowActions(_access: FinanceAccess): DataTableAction<UnitDuesRow>[] {
  return [];
}
