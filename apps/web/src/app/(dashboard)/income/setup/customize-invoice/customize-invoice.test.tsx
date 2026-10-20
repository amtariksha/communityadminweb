import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import CustomizeInvoiceSetupPage from './page';

/** INC-39 — Setup › Customize Invoice: titles, issuer block and the Sample PDFs. */

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  settings: { data: undefined as unknown, error: null as unknown, isLoading: false },
  save: vi.fn(),
  sample: vi.fn(),
}));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../../../settings/tax-registration-card', () => ({ TaxRegistrationCard: () => <section>Tax registration card</section> }));
// The range tables have their own tests (ranges/ranges.test.tsx).
vi.mock('./range-sections', () => ({ RangeSections: () => <section>Range sections</section> }));
vi.mock('@/hooks/use-billing-documents', () => ({
  useDocumentSettings: () => mocks.settings,
  useSaveDocumentSettings: () => ({ mutateAsync: mocks.save, isPending: false }),
  useDownloadSample: () => ({ mutateAsync: mocks.sample, isPending: false }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Test User', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }),
  );
}

const view = (stored: Record<string, unknown>) => ({ data: { stored, look: {}, letterhead_url: null }, error: null, isLoading: false });
const saveButton = () => screen.getByRole('button', { name: 'Save document titles' }) as HTMLButtonElement;

beforeEach(() => {
  signIn('community_admin');
  mocks.settings = view({ title_with_gst: 'TAX INVOICE', issuer_name: 'Green Acres Owners Association' });
  mocks.save.mockResolvedValue({});
  mocks.sample.mockResolvedValue(undefined);
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Customize Invoice › Document titles & issuer (INC-39)', () => {
  it('shows what is saved, with the defaults for what is not', () => {
    render(<CustomizeInvoiceSetupPage />);

    expect((screen.getByLabelText('Invoice Name without GST') as HTMLInputElement).value).toBe('INVOICE');
    expect((screen.getByLabelText('Association Name') as HTMLInputElement).value).toBe('Green Acres Owners Association');
    expect((screen.getByLabelText('Show Last Receipts in Invoice') as HTMLInputElement).value).toBe('0');
    expect(screen.getByText('Tax registration card')).toBeTruthy();
    expect(screen.getByText('Range sections')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('sends its own fields, blanks as null and the address block whole', async () => {
    render(<CustomizeInvoiceSetupPage />);

    fireEvent.change(screen.getByLabelText('Invoice Name without GST'), { target: { value: 'BILL' } });
    fireEvent.change(screen.getByLabelText('PinCode'), { target: { value: '560001' } });
    fireEvent.change(screen.getByLabelText('GSTIN Effective From'), { target: { value: '2017-07-01' } });
    fireEvent.change(screen.getByLabelText('Show Last Receipts in Invoice'), { target: { value: '3' } });
    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({
      title_without_gst: 'BILL',
      title_with_gst: 'TAX INVOICE',
      issuer_name: 'Green Acres Owners Association',
      issuer_address: { line1: null, line2: null, city: null, state: null, pincode: '560001', phone: null },
      service_tax_no: null,
      gstin_effective_from: '2017-07-01',
      show_last_receipts: 3,
    });
  });

  it('will not save a bad PinCode or more than 10 receipts', () => {
    render(<CustomizeInvoiceSetupPage />);

    fireEvent.change(screen.getByLabelText('PinCode'), { target: { value: '5600' } });
    fireEvent.change(screen.getByLabelText('Show Last Receipts in Invoice'), { target: { value: '11' } });

    expect(screen.getByText('PinCode is 6 digits.')).toBeTruthy();
    expect(screen.getByText('Enter 0 to 10.')).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it('shows an accountant the values without the save', () => {
    signIn('accountant');
    render(<CustomizeInvoiceSetupPage />);

    expect((screen.getByLabelText('Invoice Name with GST') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save document titles' })).toBeNull();
    expect(screen.getByText("Only the society's community admin can change these.")).toBeTruthy();
  });

  it('says "not available yet" on a server without the route', () => {
    mocks.settings = { data: undefined, error: new ApiError(404, { message: 'Cannot GET' } as never), isLoading: false };
    render(<CustomizeInvoiceSetupPage />);

    expect(screen.getByText('Document titles are not available yet on this server.')).toBeTruthy();
  });
});

describe('Customize Invoice › Sample', () => {
  it('downloads the sample of the type asked for', async () => {
    render(<CustomizeInvoiceSetupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Sample Receipt' }));

    await vi.waitFor(() => expect(mocks.sample).toHaveBeenCalledWith('receipt'));
  });

  it('says "Post one first" when the society has no such document yet', async () => {
    mocks.sample.mockRejectedValue(new ApiError(404, { message: 'Post one first to see a sample.', code: 'no_sample_document' } as never));
    render(<CustomizeInvoiceSetupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Sample Credit Note' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Post one first to see a sample.');
  });
});
