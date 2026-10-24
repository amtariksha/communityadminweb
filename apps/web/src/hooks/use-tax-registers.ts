'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { bankKeys } from './use-bank';
import { ledgerKeys } from './use-ledger';
import { taxKeys } from './use-tax';

export type TaxRegisterKind = 'tds' | 'sgst' | 'cgst' | 'igst';

/** GET /bank/tax-registers/:register (BANK-15). Balances signed: debit positive. */
export interface TaxRegisterRow {
  journal_line_id: string;
  journal_entry_id: string;
  date: string;
  voucher_no: string;
  particulars: string;
  party: string | null;
  section: string | null;
  ledger: 'input' | 'output' | 'tds';
  debit: string;
  credit: string;
  balance: string;
  challan_no: string | null;
}

export interface TaxRegisterResult {
  register: TaxRegisterKind;
  opening_balance: string;
  closing_balance: string;
  rows: TaxRegisterRow[];
}

export interface TaxRegisterParams {
  register: TaxRegisterKind;
  ledger: 'all' | 'input' | 'output';
  from: string;
  to: string;
}

/** null on an API older than BANK-15 (the page says not available yet). */
export function useTaxRegister(params: TaxRegisterParams | null) {
  return useQuery({
    queryKey: [...bankKeys.all, 'tax-register', params],
    enabled: params !== null,
    queryFn: async (): Promise<TaxRegisterResult | null> => {
      const p = params as TaxRegisterParams;
      try {
        return (await api.get<{ data: TaxRegisterResult }>(`/bank/tax-registers/${p.register}`, { params: { ledger: p.ledger, from: p.from, to: p.to } })).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export type RemitInput =
  | { register: 'tds'; tds_section: string; amount: number; payment_date: string; bank_account_id: string; challan_number: string; bsr_code?: string }
  | {
      register: 'sgst' | 'cgst' | 'igst';
      period_from: string;
      period_to: string;
      output_settled: number;
      input_used: number;
      cash_paid: number;
      payment_date: string;
      bank_account_id?: string;
      reference_number?: string;
    };

function useTaxWrite<Input>(call: (input: Input) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankKeys.all });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.reports() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.journalEntries() });
    },
  });
}

/** POST /bank/tax-registers/remit (BANK-16): the journal and the challan / remittance together. */
export function useRemitTax() {
  return useTaxWrite((input: RemitInput) => api.post('/bank/tax-registers/remit', input));
}

/** The answer of a reversal; `note` is set when no journal was reversed (the remittance posted none). */
export interface ReversedRemittance {
  id: string;
  reversed: true;
  reversal_journal_entry_id?: string | null;
  note?: string | null;
}

/**
 * POST /bank/tax-registers/remittances/:id/reverse (BANK-16): the inverse
 * entry of a challan or remittance, or — one recorded without a journal
 * (before migration 266, or PF / ESI / PT / other) — its withdrawal from
 * the tax figures. Never deleted.
 */
export function useReverseRemittance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<{ data: ReversedRemittance }>(`/bank/tax-registers/remittances/${id}/reverse`, { reason }).then((res) => res.data),
    onSuccess: () => {
      for (const queryKey of [taxKeys.all, bankKeys.all, ledgerKeys.reports(), ledgerKeys.journalEntries()]) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
