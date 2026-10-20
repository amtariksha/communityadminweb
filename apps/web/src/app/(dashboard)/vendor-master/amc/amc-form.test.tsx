import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmcContractDetail } from '@/hooks/use-amc-contracts';
import { AmcForm } from './amc-form';
import { amcFormError, amcFormValues, amcPayload, renewalDates, renewalValues } from './amc-form-values';
import { calendarYears } from './amc-calendar';

/**
 * Create Contract (VEND-11, VEND-S8): "+ Add Vendor" comes back to the form
 * with the new vendor selected and what was typed kept; Renew opens the next
 * period of the same length; the checks and the body sent.
 */

const mocks = vi.hoisted(() => ({ create: vi.fn(), renew: vi.fn() }));
const mutation = (fn: ReturnType<typeof vi.fn>) => ({ mutateAsync: fn, mutate: vi.fn(), isPending: false });
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-vendors', () => ({
  useVendors: () => ({ data: { data: [{ id: 'v-1', name: 'Vendor A Lifts' }], total: 1 } }),
}));
vi.mock('@/hooks/use-asset-categories', () => ({
  useAssetCategories: () => ({ data: [{ id: 'c-1', name: 'Elevator' }] }),
  useAddAssetCategory: () => mutation(vi.fn()),
}));
vi.mock('@/hooks/use-asset-register', () => ({ useAssetRegister: () => ({ data: { data: [{ id: 'a-1', name: 'Lift A', location: 'Tower A' }], total: 1 } }) }));
vi.mock('@/hooks/use-documents', () => ({ useUploadFileToS3: () => mutation(vi.fn()) }));
vi.mock('@/hooks/use-amc-contracts', () => ({
  useCreateAmc: () => mutation(mocks.create),
  useUpdateAmcContract: () => mutation(vi.fn()),
  useRenewAmc: () => mutation(mocks.renew),
  useAmcAttachments: () => ({ data: [] }),
  useAddAmcAttachment: () => mutation(vi.fn()),
  useRemoveAmcAttachment: () => mutation(vi.fn()),
}));
// The vendor form itself is Vendor Master's; here it only reports the vendor it saved.
vi.mock('../../vendors/vendor-form-dialog', () => ({
  AddVendorDialog: ({ open, onCreated, onOpenChange }: { open: boolean; onCreated: (v: { id: string; name: string }) => void; onOpenChange: (o: boolean) => void }) =>
    open ? (
      <button type="button" onClick={() => { onCreated({ id: 'v-new', name: 'New Vendor Co' }); onOpenChange(false); }}>
        Save new vendor
      </button>
    ) : null,
}));

const ENDED: AmcContractDetail = {
  id: 'amc-1',
  title: 'Lift AMC',
  vendor_id: 'v-1',
  vendor_name: 'Vendor A Lifts',
  vendor_contact: null,
  contract_number: null,
  asset_category_id: 'c-1',
  asset_id: 'a-1',
  assets: [{ id: 'a-1', name: 'Lift A' }],
  start_date: '2025-04-01',
  end_date: '2026-03-31',
  cost: '40000.00',
  status: 'expired',
  reminder_days: 30,
  payment_frequency: 'quarterly',
  payment_start_date: '2025-04-01',
};

const value = (label: RegExp): string => (screen.getByLabelText(label) as HTMLInputElement).value;

describe('AmcForm', () => {
  beforeEach(() => {
    mocks.create.mockReset().mockResolvedValue({ data: { id: 'amc-new' } });
    mocks.renew.mockReset().mockResolvedValue({ data: { id: 'amc-2' } });
  });

  it('comes back from "+ Add Vendor" with that vendor selected and the typed fields intact', () => {
    render(<AmcForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/contract title/i), { target: { value: 'Pump AMC' } });
    fireEvent.change(screen.getByLabelText(/contract start date/i), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Vendor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save new vendor' }));

    expect(value(/vendor name/i)).toBe('v-new');
    expect(screen.getByRole('option', { name: 'New Vendor Co' })).toBeTruthy();
    expect(value(/contract title/i)).toBe('Pump AMC');
    expect(value(/contract start date/i)).toBe('2026-04-01');
  });

  it('opens Renew with start = old end + 1 day and the same length, and saves it as a renewal', async () => {
    const onSaved = vi.fn();
    render(<AmcForm mode="page" renewFrom={ENDED} onClose={vi.fn()} onSaved={onSaved} />);
    expect(value(/contract start date/i)).toBe('2026-04-01');
    expect(value(/contract end date/i)).toBe('2027-03-31');
    expect(value(/starting date for payment/i)).toBe('2026-04-01');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.renew).toHaveBeenCalledTimes(1));
    expect(mocks.renew.mock.calls[0][0]).toMatchObject({ id: 'amc-1', vendor_id: 'v-1', asset_ids: ['a-1'], start_date: '2026-04-01', end_date: '2027-03-31' });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('ticks the assets of the chosen category', () => {
    render(<AmcForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Choose an asset category to pick its assets.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/asset category/i), { target: { value: 'c-1' } });
    expect(screen.getByRole('checkbox', { name: /Lift A/ })).toBeTruthy();
  });
});

describe('AMC form values', () => {
  it('renews whole months for the same months, other periods for the same days', () => {
    expect(renewalDates('2026-04-01', '2027-03-31')).toEqual({ start: '2027-04-01', end: '2028-03-31' });
    expect(renewalDates('2026-04-10', '2026-04-19')).toEqual({ start: '2026-04-20', end: '2026-04-29' });
    expect(renewalValues(ENDED)).toMatchObject({ startDate: '2026-04-01', endDate: '2027-03-31', paymentStart: '2026-04-01', title: 'Lift AMC' });
  });

  it('checks the title, the vendor, the dates and each schedule start', () => {
    const base = { ...amcFormValues(), title: 'Lift AMC', vendorId: 'v-1', startDate: '2026-04-01', endDate: '2027-03-31' };
    expect(amcFormError({ ...base, title: 'AB' })).toBe('The contract title is 3 to 255 characters.');
    expect(amcFormError({ ...base, vendorId: '' })).toBe('Choose the vendor.');
    expect(amcFormError({ ...base, endDate: '2026-03-01' })).toBe('End date must be after the start date');
    expect(amcFormError({ ...base, paymentFrequency: 'monthly' })).toBe('Give the starting date for the payment instalments.');
    expect(amcFormError({ ...base, serviceFrequency: 'yearly', serviceStart: '2027-05-01' })).toBe('The service instalments start within the contract dates.');
    expect(amcFormError(base)).toBeNull();
  });

  it('sends the vendor id with its name and the first asset, for an API older than VEND-10 too', () => {
    const body = amcPayload({ ...amcFormValues(ENDED), cost: '', paymentFrequency: '' });
    expect(body).toMatchObject({ vendor_id: 'v-1', vendor_name: 'Vendor A Lifts', asset_ids: ['a-1'], asset_id: 'a-1', cost: null, payment_frequency: null, payment_start_date: null });
  });

  it('offers the calendar this year ± 25', () => {
    const years = calendarYears(2026);
    expect([years[0], years[years.length - 1], years.length]).toEqual([2001, 2051, 51]);
  });
});
