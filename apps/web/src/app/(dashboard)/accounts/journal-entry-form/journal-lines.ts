/**
 * Lines of a manual journal entry, kept free of React (GL-11). The dialog
 * edits a Dr/Cr side and an amount per line; the page (GL-S6) a fixed grid
 * with a Debit and a Credit column. Both become the API's lines here.
 */

export interface EntryLine {
  // Local only, for stable React keys.
  key: string;
  ledger_account_id: string;
  debit: string;
  credit: string;
  // The dialog's Dr/Cr choice for a line with no amount yet.
  side?: 'debit' | 'credit';
}

export interface ApiLine {
  ledger_account_id: string;
  debit: number;
  credit: number;
}

let counter = 0;

export function blankLine(): EntryLine {
  counter += 1;
  return { key: `line-${counter}`, ledger_account_id: '', debit: '', credit: '' };
}

export function blankLines(count: number): EntryLine[] {
  return Array.from({ length: count }, blankLine);
}

const amount = (text: string): number => {
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** A line the operator has typed into; the rest of the grid is ignored. */
export function isUsed(line: EntryLine): boolean {
  return line.ledger_account_id !== '' || line.debit.trim() !== '' || line.credit.trim() !== '';
}

/** Paise, so the sums are exact. */
const paise = (value: number): number => Math.round(value * 100);

export interface EntryTotals {
  debit: number;
  credit: number;
  difference: number;
}

export function entryTotals(lines: readonly EntryLine[]): EntryTotals {
  const debit = lines.reduce((sum, line) => sum + paise(amount(line.debit)), 0);
  const credit = lines.reduce((sum, line) => sum + paise(amount(line.credit)), 0);
  return { debit: debit / 100, credit: credit / 100, difference: (debit - credit) / 100 };
}

const TWO_DECIMALS = /^\d+(\.\d{1,2})?$/;

/** What is wrong with a line, or null (1-based `position` for the message). */
export function lineProblem(line: EntryLine, position: number): string | null {
  const debit = line.debit.trim();
  const credit = line.credit.trim();
  if (!line.ledger_account_id) return `Choose an account on line ${position}.`;
  if (debit === '' && credit === '') return `Enter a debit or a credit on line ${position}.`;
  if (debit !== '' && credit !== '') return `Enter either a debit or a credit on line ${position}, not both.`;
  const value = debit || credit;
  if (!TWO_DECIMALS.test(value) || amount(value) === 0) {
    return `The amount on line ${position} must be more than 0, with at most 2 decimals.`;
  }
  return null;
}

/** Problems of the whole entry, first one per line, then the entry's own. */
export function entryProblems(lines: readonly EntryLine[]): string[] {
  const used = lines.map((line, index) => ({ line, position: index + 1 })).filter(({ line }) => isUsed(line));
  const problems = used.flatMap(({ line, position }) => lineProblem(line, position) ?? []);
  if (used.length < 2) problems.push('An entry needs at least two lines.');
  else if (problems.length === 0 && entryTotals(lines).difference !== 0) {
    problems.push('Total debit and total credit must be equal.');
  }
  return problems;
}

export function apiLines(lines: readonly EntryLine[]): ApiLine[] {
  return lines.filter(isUsed).map((line) => ({
    ledger_account_id: line.ledger_account_id,
    debit: amount(line.debit),
    credit: amount(line.credit),
  }));
}
