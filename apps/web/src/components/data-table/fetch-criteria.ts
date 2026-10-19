/**
 * What a register is fetched by in the classic layout (requirements
 * SB-09): a date range or a number range, and one of the register's
 * radio choices (e.g. All / Reconciled / Reversed).
 */
export type FetchRangeKind = 'date' | 'number';

export interface FetchCriteria {
  from: string;
  to: string;
  // The chosen radio value; '' when the register has no choices.
  choice: string;
}

export interface FetchRules {
  range: FetchRangeKind;
  // Refuse a fetch with no range at all (most registers allow "everything").
  requireRange?: boolean;
}

const WHOLE_NUMBER = /^\d+$/;

/** The message to show, or null when the criteria may be fetched. */
export function fetchCriteriaError(criteria: FetchCriteria, rules: FetchRules): string | null {
  const from = criteria.from.trim();
  const to = criteria.to.trim();
  if (rules.requireRange && (!from || !to)) {
    return rules.range === 'date' ? 'Choose a from and a to date.' : 'Enter a from and a to number.';
  }
  if (rules.range === 'number') {
    if ((from && !WHOLE_NUMBER.test(from)) || (to && !WHOLE_NUMBER.test(to))) {
      return 'Numbers must be whole numbers.';
    }
    if (from && to && Number(from) > Number(to)) return 'The from number is after the to number.';
    return null;
  }
  // ISO dates (yyyy-mm-dd) compare as text.
  if (from && to && from > to) return 'The from date is after the to date.';
  return null;
}

/** Query parameters for the list route: `from`/`to` (or the names given) and the choice. */
export function fetchParams(
  criteria: FetchCriteria,
  names: { from?: string; to?: string; choice?: string } = {},
): Record<string, string> {
  const params: Record<string, string> = {};
  if (criteria.from.trim()) params[names.from ?? 'from'] = criteria.from.trim();
  if (criteria.to.trim()) params[names.to ?? 'to'] = criteria.to.trim();
  if (criteria.choice && names.choice !== '') params[names.choice ?? 'status'] = criteria.choice;
  return params;
}
