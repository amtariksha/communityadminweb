import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReceivedCheque } from '@/hooks/use-received-cheques';
import { chequeActions, chequeColumns } from './cheque-columns';
import { chequeFormErrors, emptyChequeForm, toChequePayload } from './register-cheque-dialog';
import { actionErrors } from './cheque-action-dialog';

// INC-64: the received post-dated cheques screen.

const mocks = vi.hoisted(() => ({ error: null as unknown }));
vi.mock('@/hooks/use-received-cheques', () => ({
  useReceivedCheques: () => ({ data: undefined, error: mocks.error, isLoading: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => ({ canRead: true, canWrite: true }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'standard' }));

const TODAY = '2026-10-20';
const cheque = (patch: Partial<ReceivedCheque>): ReceivedCheque =>
  ({ id: 'c1', unit_id: 'u1', unit_number: 'A-101', block: 'A', cheque_number: '100001', bank: 'Test Bank', cheque_date: TODAY, amount: 3000, received_on: TODAY, notes: null, status: 'pending', receipt_id: null, receipt_number: null, deposited_on: null, bounced_on: null, bounce_reason: null, bounce_charge_invoice_id: null, cancelled_on: null, cancel_reason: null, ...patch }) as ReceivedCheque;

describe('Post-dated cheques', () => {
  it('offers Deposit once the cheque date has come, Bounce on a deposited one and Cancel on a pending one', () => {
    const actions = chequeActions({ canRead: true, canWrite: true }, TODAY, vi.fn());
    const shown = (row: ReceivedCheque) => actions.filter((action) => !action.hidden?.(row)).map((action) => action.key);
    expect(shown(cheque({}))).toEqual(['deposit', 'cancel']);
    expect(shown(cheque({ cheque_date: '2026-11-10' }))).toEqual(['cancel']);
    expect(shown(cheque({ status: 'deposited' }))).toEqual(['bounce']);
    expect(shown(cheque({ status: 'bounced' }))).toEqual([]);
    expect(chequeActions({ canRead: true, canWrite: false }, TODAY, vi.fn())).toEqual([]);
  });

  it('shows a pending cheque whose date has come as Due', () => {
    const status = chequeColumns(TODAY).find((column) => column.key === 'status')!;
    expect(status.cell(cheque({}))).toBe('Due');
    expect(status.cell(cheque({ cheque_date: '2026-11-10' }))).toBe('Pending');
  });

  it('checks the register form as the API does', () => {
    expect(Object.keys(chequeFormErrors(emptyChequeForm()))).toEqual(['unitId', 'number', 'bank', 'date', 'amount']);
    const form = { unitId: 'u1', number: ' 100001 ', bank: 'Test Bank', date: '2026-11-10', amount: '3000.10', notes: '' };
    expect(chequeFormErrors(form)).toEqual({});
    expect(toChequePayload(form)).toEqual({ unit_id: 'u1', cheque_number: '100001', bank: 'Test Bank', cheque_date: '2026-11-10', amount: 3000.1 });
  });

  it('keeps a deposit between the cheque date and today, and a bounce charge with its account', () => {
    const form = { date: '2026-10-01', bankAccountId: '', reason: '', chargeAmount: '', chargeAccountId: '' };
    expect(actionErrors('deposit', form, cheque({}), TODAY).date).toBeTruthy();
    expect(actionErrors('deposit', { ...form, date: TODAY }, cheque({}), TODAY)).toEqual({});
    expect(actionErrors('bounce', { ...form, reason: 'Funds', chargeAmount: '500' }, cheque({ status: 'deposited' }), TODAY)).toEqual({ chargeAccountId: 'Pick the account for the charge' });
  });

  it('says not available yet while the API has no cheques', async () => {
    mocks.error = { status: 404 };
    const { ChequesContent } = await import('./cheques-content');
    render(<ChequesContent />);
    expect(screen.getByText('Post-dated cheques are not available yet on this server.')).toBeTruthy();
  });
});
