import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiLineInvoiceForm } from './multi-line-invoice-form';
import { PostInvoiceForm } from './post-invoice-form';

/**
 * INC-23 / INC-24 — the Post Invoice forms: the GST option follows Setup ›
 * GST, the due date defaults from the society's due days, and Post amount
 * sends what was typed.
 */

const mocks = vi.hoisted(() => ({
  options: { show_gst_on_adhoc: true, gst_rates: [5, 18, 40], due_days: 10, date: '2026-10-15' },
  adhoc: { mutate: vi.fn(), isPending: false },
  multi: { mutate: vi.fn(), isPending: false },
  addToast: vi.fn(),
}));

vi.mock('@/hooks/use-unit-posting', () => ({
  usePostingOptions: () => ({ data: mocks.options }),
  usePostAdhocInvoice: () => mocks.adhoc,
  usePostMultiLineInvoice: () => mocks.multi,
  useUnitDuesRow: () => ({ data: { unit_id: 'u-1', unit_number: '101', block: 'A', billing_name: 'Asha Rao', due: '2000.00' } }),
}));
vi.mock('@/components/ui/account-search-select', () => ({
  AccountSearchSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <select aria-label="Account" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pick</option>
      <option value="acct-fine">Fine</option>
    </select>
  ),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('next/link', () => ({ default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));

function renderInvoice(): void {
  render(<PostInvoiceForm unitId="u-1" mode="page" today="2026-10-15" onClose={vi.fn()} onPosted={vi.fn()} moreActions={[{ label: 'Post Multi-Line Invoice', href: '/x/multi-line' }]} />);
}

describe('PostInvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.options = { show_gst_on_adhoc: true, gst_rates: [5, 18, 40], due_days: 10, date: '2026-10-15' };
  });

  it('heads the form with the unit, its billing name and what it owes', () => {
    renderInvoice();

    expect(screen.getByText('A-101')).toBeTruthy();
    expect(screen.getByText('Asha Rao')).toBeTruthy();
    expect(screen.getByText('₹2,000')).toBeTruthy();
    expect((screen.getByLabelText('Due Date') as HTMLInputElement).value).toBe('2026-10-25');
    expect(screen.getByRole('link', { name: 'Post Multi-Line Invoice' }).getAttribute('href')).toBe('/x/multi-line');
  });

  it('posts the amount to the account chosen, with GST when ticked', () => {
    renderInvoice();

    fireEvent.change(screen.getByLabelText('Invoice Amount'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Account'), { target: { value: 'acct-fine' } });
    fireEvent.click(screen.getByLabelText('Apply GST'));
    fireEvent.change(screen.getByLabelText('GST rate'), { target: { value: '18' } });
    fireEvent.click(screen.getByLabelText('Post as Debit Note'));
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.adhoc.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ unit_id: 'u-1', amount: 5000, ledger_account_id: 'acct-fine', apply_gst: true, gst_rate: 18, as_debit_note: true }),
      expect.anything(),
    );
  });

  it('hides Apply GST when Setup › GST has it off', () => {
    mocks.options = { ...mocks.options, show_gst_on_adhoc: false };
    renderInvoice();

    expect(screen.queryByLabelText('Apply GST')).toBeNull();
  });

  it('does not post with the amount missing', () => {
    renderInvoice();

    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));

    expect(mocks.adhoc.mutate).not.toHaveBeenCalled();
  });
});

describe('MultiLineInvoiceForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the used lines of the GST page with their totals shown', () => {
    render(<MultiLineInvoiceForm unitId="u-1" withGst today="2026-10-15" onClose={vi.fn()} onPosted={vi.fn()} />);

    fireEvent.change(screen.getAllByLabelText('Account')[0], { target: { value: 'acct-fine' } });
    fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Amount 1'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('GST 1'), { target: { value: '18' } });

    expect(screen.getByText('Subtotal ₹1,000 · GST ₹180 · Total ₹1,180')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post amount' }));
    expect(mocks.multi.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        with_gst: true,
        due_date: '2026-10-25',
        lines: [expect.objectContaining({ ledger_account_id: 'acct-fine', quantity: 2, amount: 500, gst_rate: 18 })],
      }),
      expect.anything(),
    );
  });

  it('has no GST column on the plain page', () => {
    render(<MultiLineInvoiceForm unitId="u-1" withGst={false} today="2026-10-15" onClose={vi.fn()} onPosted={vi.fn()} />);

    expect(screen.queryByLabelText('GST 1')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Post Multi-Line Invoice' })).toBeTruthy();
  });
});
