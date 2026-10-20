import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NumberingRow } from '@/hooks/use-billing-documents';
import { ApiError } from '@/lib/api-error';
import { NumberingCard } from './numbering-card';

/** INC-41 — Setup › Other › Numbering: prefixes, digits and next numbers, forward only. */

const mocks = vi.hoisted(() => ({
  numbering: { data: undefined as unknown, error: null as unknown, dataUpdatedAt: 1 },
  save: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-billing-documents', () => ({
  useNumbering: () => mocks.numbering,
  useSaveNumbering: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

const row = (series: NumberingRow['series'], label: string, prefix: string, last: number, sharesWith: NumberingRow['shares_with'] = null): NumberingRow => ({
  series,
  label,
  prefix,
  pad: 4,
  last_issued: last,
  next: last + 1,
  shares_with: sharesWith,
});

const ROWS: NumberingRow[] = [
  row('member_invoice', 'Invoice', 'INV-', 1200),
  row('member_receipt', 'Receipt', 'RCT-', 50),
  row('credit_note', 'Credit Note', 'CN-', 3),
  row('debit_note', 'Debit Note', 'DN-', 0),
  row('non_member_invoice', 'Non-member Invoice', 'INV-', 1200, 'member_invoice'),
  row('non_member_receipt', 'Non-member Receipt', 'NMR-', 7),
  row('non_member_credit_note', 'Non-member Credit Note', 'CN-', 3, 'credit_note'),
];

const saveButton = () => screen.getByRole('button', { name: 'Save numbering' }) as HTMLButtonElement;

beforeEach(() => {
  mocks.numbering = { data: ROWS, error: null, dataUpdatedAt: 1 };
  mocks.save.mockResolvedValue(ROWS);
});
afterEach(() => vi.clearAllMocks());

describe('Numbering (INC-41)', () => {
  it('lists every series; a non-member series not set up says it shares the member series', () => {
    render(<NumberingCard canWrite />);

    expect((screen.getByLabelText('Next number, Invoice') as HTMLInputElement).value).toBe('1201');
    expect(screen.getByText('Shares the Invoice series (INV-)')).toBeTruthy();
    expect(screen.getByText('Shares the Credit Note series (CN-)')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Use its own series' })).toHaveLength(2);
    expect(saveButton().disabled).toBe(true);
  });

  it('refuses a next number at or below the last one issued', () => {
    render(<NumberingCard canWrite />);

    fireEvent.change(screen.getByLabelText('Next number, Invoice'), { target: { value: '1200' } });

    expect(screen.getByText('Next number must be greater than 1200.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('sends the changed series only, with the next number when it moved', async () => {
    render(<NumberingCard canWrite />);

    fireEvent.change(screen.getByLabelText('Prefix, Invoice'), { target: { value: 'MF/' } });
    fireEvent.change(screen.getByLabelText('Next number, Invoice'), { target: { value: '1301' } });
    fireEvent.change(screen.getByLabelText('Prefix, Receipt'), { target: { value: 'MR/' } });
    expect(screen.getByText('Next: MF/1301')).toBeTruthy();
    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({
      member_invoice: { prefix: 'MF/', pad: 4, next_number: 1301 },
      member_receipt: { prefix: 'MR/', pad: 4 },
    });
  });

  it('sets a non-member series up on its own, and puts another back on its member series', async () => {
    render(<NumberingCard canWrite />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Use its own series' })[0]);
    expect((screen.getByLabelText('Prefix, Non-member Invoice') as HTMLInputElement).value).toBe('NMI-');
    fireEvent.click(screen.getByRole('button', { name: 'Share the member series' }));
    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({ non_member_invoice: { prefix: 'NMI-', pad: 4 }, non_member_receipt: null });
  });

  it('shows the server refusal on its series', async () => {
    mocks.save.mockRejectedValue(
      new ApiError(400, { message: 'MF/1301 is already used', code: 'next_number_taken', errors: { member_invoice: ['MF/1301 is already used'] } } as never),
    );
    render(<NumberingCard canWrite />);

    fireEvent.change(screen.getByLabelText('Next number, Invoice'), { target: { value: '1301' } });
    fireEvent.click(saveButton());

    expect(await screen.findByText('MF/1301 is already used')).toBeTruthy();
  });

  it('shows the numbers without controls to roles that cannot change them', () => {
    render(<NumberingCard canWrite={false} />);

    expect((screen.getByLabelText('Next number, Invoice') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save numbering' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Use its own series' })).toBeNull();
  });

  it('says "not available yet" on a server without the route', () => {
    mocks.numbering = { data: undefined, error: new ApiError(404, { message: 'Cannot GET' } as never), dataUpdatedAt: 0 };
    render(<NumberingCard canWrite />);

    expect(screen.getByText('Numbering is not available yet on this server.')).toBeTruthy();
  });
});
