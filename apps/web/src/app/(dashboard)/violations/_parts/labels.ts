import type { CloseOutcome, Violation, ViolationStage, ViolationStatus } from '@/hooks/use-violation-register';

export const VIOLATION_STATUS_LABELS: Readonly<Record<ViolationStatus, string>> = {
  awaiting_approval: 'Awaiting Approval',
  warning: 'Warning',
  penalty: 'Penalty',
  closed: 'Closed',
  rejected: 'Rejected',
};

export const STAGE_LABELS: Readonly<Record<ViolationStage, string>> = { warning: 'Warning', penalty: 'Penalty' };

export const OUTCOME_LABELS: Readonly<Record<CloseOutcome, string>> = {
  complied: 'Complied',
  paid: 'Paid',
  waived: 'Waived',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
};

/** Close's choices at each stage (RULE-S8). */
export const CLOSE_CHOICES: Readonly<Record<'warning' | 'penalty', readonly CloseOutcome[]>> = {
  warning: ['complied', 'withdrawn'],
  penalty: ['paid', 'waived', 'withdrawn'],
};

export function unitLabel(row: Pick<Violation, 'unit_number' | 'block'>): string {
  return row.block ? `${row.block} - ${row.unit_number}` : row.unit_number;
}

/** "3", or "Over by 2 days" once the warning period has passed (RULE-S5). */
export function daysLeftText(daysLeft: number | null): string {
  if (daysLeft === null) return '';
  if (daysLeft >= 0) return String(daysLeft);
  const over = -daysLeft;
  return `Over by ${over} day${over === 1 ? '' : 's'}`;
}

export function rupees(value: string | null): string {
  if (value === null) return '';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** The stage a closed violation sat in before Close (Awaiting Approval when it was rejected). */
export function finalStage(row: Pick<Violation, 'final_stage'>): string {
  const stage = row.final_stage;
  return stage ? VIOLATION_STATUS_LABELS[stage as ViolationStatus] ?? stage : '';
}
