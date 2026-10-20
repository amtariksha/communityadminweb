import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { UnidentifiedFilters } from '@/hooks/use-unidentified-collections';
import { UnidentifiedContent } from './unidentified-content';
import { recordErrors, toRecordPayload } from './record-form';
import { emptyCollectionForm } from '@/components/unit-posting/collection-state';

/** INC-48 — Member Income › Unidentified Collection: list, filters, Record and Identify by role. */

const mocks = vi.hoisted(() => ({
  access: { canRead: true, canWrite: true },
  layout: 'classic' as 'classic' | 'standard',
  push: vi.fn(),
  calls: [] as UnidentifiedFilters[],
  result: { data: undefined as unknown, isLoading: false, error: null as unknown, refetch: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => mocks.access }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => mocks.layout }));
vi.mock('@/hooks/use-unidentified-collections', () => ({
  useUnidentifiedCollections: (filters: UnidentifiedFilters) => {
    mocks.calls.push(filters);
    return mocks.result;
  },
}));
vi.mock('./identify-dialog', () => ({ IdentifyDialog: ({ collection }: { collection: { receipt_number: string } }) => <p>Identify {collection.receipt_number}</p> }));
vi.mock('./record-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./record-form')>()),
  RecordUnidentifiedForm: () => <p>Record dialog</p>,
}));

const row = (patch: Record<string, unknown>) => ({
  id: 'r-1',
  receipt_number: 'RCT-0090',
  receipt_date: '2026-10-12',
  amount: '4000.00',
  payment_mode: 'bank_transfer',
  reference_number: 'UTR-77',
  bank_account_name: 'Bank Account',
  narration: 'NEFT without reference',
  status: 'open',
  unit_id: null,
  unit_number: null,
  block: null,
  identified_at: null,
  ...patch,
});

describe('Unidentified Collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = { canRead: true, canWrite: true };
    mocks.layout = 'classic';
    mocks.calls = [];
    mocks.result = {
      data: { data: [row({}), row({ id: 'r-2', receipt_number: 'RCT-0091', reference_number: 'UTR-78', status: 'identified', unit_number: '101', block: 'A' })], total: 2 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it('lists open collections by default, Identify on open rows only', () => {
    render(<UnidentifiedContent />);

    expect(mocks.calls[0]).toEqual({ status: 'open', from: '', to: '', search: '' });
    const identified = screen.getByText('UTR-78').closest('tr') as HTMLElement;
    expect(within(identified).getByText('A-101')).toBeTruthy();
    expect(within(identified).queryByRole('button', { name: 'Identify' })).toBeNull();
    fireEvent.click(within(screen.getByText('UTR-77').closest('tr') as HTMLElement).getByRole('button', { name: 'Identify' }));
    expect(screen.getByText('Identify RCT-0090')).toBeTruthy();
  });

  it('asks the server for the status and dates chosen', () => {
    render(<UnidentifiedContent />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'identified' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });

    expect(mocks.calls[mocks.calls.length - 1]).toMatchObject({ status: 'identified', from: '2026-10-01' });
  });

  it('records as a page in classic and as a dialog in standard', () => {
    render(<UnidentifiedContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Record unidentified collection' }));
    expect(mocks.push).toHaveBeenCalledWith('/income/members/unidentified/new');
  });

  it('opens the record dialog in standard', () => {
    mocks.layout = 'standard';
    render(<UnidentifiedContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Record unidentified collection' }));
    expect(screen.getByText('Record dialog')).toBeTruthy();
  });

  it('leaves a finance reader the list only', () => {
    mocks.access = { canRead: true, canWrite: false };
    render(<UnidentifiedContent />);

    expect(screen.queryByRole('button', { name: 'Record unidentified collection' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Identify' })).toBeNull();
  });

  it('says it is not available yet when the route is missing', () => {
    mocks.result = { data: undefined, isLoading: false, error: new ApiError(404, { message: 'Cannot GET' } as never), refetch: vi.fn() };
    render(<UnidentifiedContent />);

    expect(screen.getByText('Unidentified collections are not available yet on this server.')).toBeTruthy();
  });

  it('records the amount, mode, number and narration', () => {
    const form = { ...emptyCollectionForm('2026-10-12', null), mode: 'bank_transfer' as const, amount: '4000', reference: 'UTR-77', comments: 'NEFT without reference' };
    expect(recordErrors(form)).toEqual({});
    expect(toRecordPayload(form)).toEqual({
      receipt_date: '2026-10-12',
      amount: 4000,
      mode: 'bank_transfer',
      bank_account_id: null,
      reference_number: 'UTR-77',
      payment_bank: null,
      narration: 'NEFT without reference',
    });
    expect(recordErrors({ ...form, reference: '' }).reference).toBeTruthy();
  });
});
