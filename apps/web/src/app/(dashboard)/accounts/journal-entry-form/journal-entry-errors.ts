import { ApiError, friendlyError } from '@/lib/api-error';

// GL-S6: the refusals the page explains in its own words, by code.
const BY_CODE: Readonly<Record<string, string>> = {
  financial_year_frozen: 'The financial year holding this date is frozen. Unfreeze it in Settings › Financial Years to post into it.',
  no_financial_year: 'No financial year holds this date. Set one up in Settings › Financial Years first.',
  financial_year_overlap: 'Two financial years overlap on this date. Fix them in Settings › Financial Years first.',
};

export function journalEntryError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : undefined;
  return (code && BY_CODE[code]) || friendlyError(error);
}
