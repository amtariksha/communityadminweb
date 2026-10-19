import { currentRole } from './current-role';

/**
 * Who may read and who may post the society's receivables — mirrors the
 * API's FINANCE_READ_ROLES / FINANCE_WRITE_ROLES (`common/roles.ts`). UI
 * shaping only: the server re-checks every request. A platform super admin
 * is reported as `super_admin` by `currentRole()`.
 */
export const FINANCE_WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'accountant']);

export const FINANCE_READ_ROLES: ReadonlySet<string> = new Set([
  ...FINANCE_WRITE_ROLES,
  'committee_member',
  'auditor',
]);

export interface FinanceAccess {
  canRead: boolean;
  canWrite: boolean;
}

export function financeAccessFor(role: string | null): FinanceAccess {
  return {
    canRead: role !== null && FINANCE_READ_ROLES.has(role),
    canWrite: role !== null && FINANCE_WRITE_ROLES.has(role),
  };
}

/** Whether the signed-in user may change billing data in this society. */
export function canWriteFinance(role: string | null = currentRole()): boolean {
  return financeAccessFor(role).canWrite;
}

/** Whether the signed-in user may read the society's billing data. */
export function canReadFinance(role: string | null = currentRole()): boolean {
  return financeAccessFor(role).canRead;
}
