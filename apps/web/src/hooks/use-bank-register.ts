'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { bankKeys } from './use-bank';

/** One line of GET /bank/register/:accountId (BANK-08). Money is text, e.g. "500.00". */
export interface BankRegisterRow {
  id: string;
  journal_entry_id: string;
  entry_date: string;
  entry_number: number;
  document_no: string;
  particulars: string;
  instrument_no: string | null;
  deposit: string;
  withdrawal: string;
  balance: string;
  bank_date: string | null;
  is_reconciled: boolean;
  is_reversed: boolean;
}

export interface BankRegister {
  bank_account: { id: string; account_name: string | null; bank_name: string; account_number: string };
  from: string;
  to: string;
  opening_balance: string;
  closing_balance: string;
  book_balance: number;
  bank_balance: number;
  rows: BankRegisterRow[];
}

/** The register of one account for a period; kept under the bank keys, so a reconcile refetches it. */
export interface BankRegisterQuery {
  accountId: string;
  from: string;
  to: string;
  // BANK-09: scope and search-in; absent = every line.
  scope?: string;
  q?: string;
  searchIn?: string;
}

function registerParams(query: BankRegisterQuery | null): Record<string, string> {
  const params: Record<string, string> = { from: query?.from ?? '', to: query?.to ?? '' };
  if (query?.scope) params.scope = query.scope;
  if (query?.q) Object.assign(params, { q: query.q, search_in: query.searchIn ?? 'any' });
  return params;
}

export function useBankRegister(query: BankRegisterQuery | null) {
  return useQuery({
    queryKey: [...bankKeys.all, 'register', query],
    queryFn: () =>
      api
        .get<{ data: BankRegister }>(`/bank/register/${query?.accountId}`, { params: registerParams(query) })
        .then((res) => res.data),
    enabled: query !== null,
  });
}
