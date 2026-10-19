import type { DataTableAction } from '@/components/data-table';
import type { UnitDuesRow } from '@/hooks/use-unit-ledger';
import type { FinanceAccess } from '@/lib/finance-roles';

export const MEMBER_INCOME_BASE = '/income/members';

export const statementHref = (unitId: string): string => `${MEMBER_INCOME_BASE}/${unitId}/statement`;

export interface MemberRowHandlers {
  /** Print: the unit's statement PDF, current financial year to date. */
  print: (row: UnitDuesRow) => void;
}

/**
 * The row buttons of Member Income (INC-S16), each in a column of its own:
 * Account History (View) and Print for every finance reader; Post Invoice
 * and Post Collection, for the finance writers, as their screens ship.
 */
export function memberRowActions(access: FinanceAccess, handlers: MemberRowHandlers): DataTableAction<UnitDuesRow>[] {
  if (!access.canRead) return [];
  return [
    { key: 'history', header: 'Account History', label: 'View', href: (row) => statementHref(row.unit_id) },
    { key: 'print', header: 'Print', label: 'Print', onClick: handlers.print },
  ];
}
