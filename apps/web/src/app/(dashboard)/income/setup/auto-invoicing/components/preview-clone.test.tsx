import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { RuleLinePreview } from '@/hooks/use-billing-rules';
import { CloneRulesForm } from './clone-rules-form';
import { PreviewInvoiceForm } from './preview-invoice-form';

const mocks = vi.hoisted(() => ({
  previewParams: [] as unknown[],
  preview: null as RuleLinePreview | null,
  clone: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-units', () => ({
  useUnits: () => ({
    data: {
      data: [
        { id: 'u1', unit_number: '101', block: 'A', billing_category_id: 'general' },
        { id: 'u2', unit_number: 'PH1', block: 'A', billing_category_id: 'penthouse' },
      ],
    },
  }),
}));
vi.mock('@/hooks/use-billing-rules', () => ({
  useRulePreview: (params: unknown) => {
    mocks.previewParams.push(params);
    return { data: params ? mocks.preview : undefined, isError: false };
  },
  downloadPreviewPdf: vi.fn(),
  useCloneRules: () => ({ mutateAsync: mocks.clone, isPending: false }),
}));

const PREVIEW: RuleLinePreview = {
  unit: { id: 'u1', unit_number: '101', category_id: 'general' },
  invoice_date: '2026-11-01',
  due_date: '2026-11-11',
  period: { from: '2026-11-01', to: '2026-11-30', months: 1, label: 'Nov 2026' },
  lines: [
    { rule_line_id: 'l1', account_name: 'Maintenance Income', description: 'Maintenance Income - Nov 2026', amount: '3300.40', gst_rate: '0.00', gst_amount: '0.00', total: '3300.40', round_off: false },
    { rule_line_id: null, account_name: 'Round Off', description: 'Round Off', amount: '-0.40', gst_rate: '0.00', gst_amount: '0.00', total: '-0.40', round_off: true },
  ],
  subtotal: '3300.00',
  gst_total: '0.00',
  round_off: '-0.40',
  total: '3300.00',
  warnings: [],
};

afterEach(() => {
  vi.clearAllMocks();
  mocks.previewParams = [];
});

describe('Preview Invoice (INC-18)', () => {
  it('offers the units of the type only and previews with the chosen date and grace days', () => {
    mocks.preview = PREVIEW;
    render(<PreviewInvoiceForm mode="page" onClose={vi.fn()} category={{ id: 'general', name: 'General' }} defaultDate="2026-11-01" defaultGraceDays={10} />);
    const options = Array.from((screen.getByLabelText('Unit') as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options).toEqual(['Pick a unit', 'A-101']);
    expect((screen.getByLabelText('Grace days') as HTMLInputElement).value).toBe('10');

    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'u1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(mocks.previewParams.at(-1)).toEqual({ unit_id: 'u1', invoice_date: '2026-11-01', grace_days: 10 });
    const table = screen.getByRole('table', { name: 'Preview invoice' });
    expect(table.textContent).toContain('Maintenance Income - Nov 2026');
    expect(table.textContent).toContain('Invoice total');
    expect(table.textContent).toContain('2026-11-11');
    expect(screen.getByRole('button', { name: 'Download PDF preview' })).toBeTruthy();
  });

  it('says which GST method above ₹7,500 the financial year priced it by', () => {
    mocks.preview = { ...PREVIEW, gst_threshold_method: 'whole_amount' };
    render(<PreviewInvoiceForm mode="page" onClose={vi.fn()} category={{ id: 'general', name: 'General' }} defaultDate="2026-11-01" defaultGraceDays={10} />);
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'u1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText(/GST above ₹7,500 a month: on the whole amount \(this financial year's setting/)).toBeTruthy();
  });
});

describe('Clone Rules (INC-18)', () => {
  const types = [
    { id: 'general', name: 'General', gst_threshold_applies: true, sort_order: 10 },
    { id: 'penthouse', name: 'Penthouse', gst_threshold_applies: true, sort_order: 20 },
  ];

  it('copies to another type, Replace as ticked', async () => {
    mocks.clone.mockResolvedValue({ copied: 2, ended: 0 });
    const onCloned = vi.fn();
    render(<CloneRulesForm mode="page" onClose={vi.fn()} onCloned={onCloned} source={types[0]} types={types} />);
    const options = Array.from((screen.getByLabelText('Copy rules to') as HTMLSelectElement).options).map((o) => o.textContent);
    expect(options).toEqual(['Pick a unit type', 'Penthouse']);
    fireEvent.change(screen.getByLabelText('Copy rules to'), { target: { value: 'penthouse' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }));
    await vi.waitFor(() => expect(onCloned).toHaveBeenCalled());
    expect(mocks.clone).toHaveBeenCalledWith({ from_category_id: 'general', to_category_id: 'penthouse', effective_from: '2026-12-01', replace: false });
  });

  it('shows why a target with lines is refused', async () => {
    mocks.clone.mockRejectedValue(
      new ApiError(409, { message: 'The target unit type already has lines. Tick Replace to end them the day before.', code: 'clone_target_has_lines' } as never),
    );
    render(<CloneRulesForm mode="page" onClose={vi.fn()} source={types[0]} types={types} />);
    fireEvent.change(screen.getByLabelText('Copy rules to'), { target: { value: 'penthouse' } });
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Tick Replace/);
  });
});
