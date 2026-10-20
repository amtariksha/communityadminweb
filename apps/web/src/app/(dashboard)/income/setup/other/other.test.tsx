import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import OtherSetupPage from './page';

/** INC-42 — Setup › Other: entity names, ticks, payment instructions, excluded banks, letter head. */

const TENANT = '11111111-1111-4111-8111-111111111111';
const PREVIEW = 'https://objects.example.test/society-files/tenants/t/billing/letterhead-1.png';

const mocks = vi.hoisted(() => ({
  settings: { data: undefined as unknown, error: null as unknown },
  save: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-billing-documents', () => ({
  useDocumentSettings: () => mocks.settings,
  useSaveDocumentSettings: () => ({ mutateAsync: mocks.save, isPending: false }),
  useUploadLetterhead: () => ({ mutateAsync: mocks.upload, isPending: false }),
  useRemoveLetterhead: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));
// Numbering has its own tests (numbering.test.tsx).
vi.mock('./numbering-card', () => ({ NumberingCard: () => <section>Numbering card</section> }));
vi.mock('@/hooks/use-bank', () => ({
  useBankAccounts: () => ({
    data: [
      { id: 'bank-1', bank_name: 'Lakeview Co-op Bank', account_number: '110012345678', is_active: true },
      { id: 'bank-2', bank_name: 'Hillside Bank', account_number: '220098765432', is_active: true },
      { id: 'bank-3', bank_name: 'Closed Bank', account_number: '330011112222', is_active: false },
    ],
    error: null,
    isLoading: false,
  }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Test User', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }),
  );
}

const view = (stored: Record<string, unknown>, letterhead: string | null = null) => ({
  data: { stored, look: { letterheadKey: letterhead ? 'tenants/t/billing/letterhead-1.png' : null }, letterhead_url: letterhead },
  error: null,
});
const saveButton = () => screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement;
const chooseFile = (file: File) => fireEvent.change(screen.getByLabelText('Letter head image'), { target: { files: [file] } });

beforeEach(() => {
  signIn('community_admin');
  mocks.settings = view({});
  mocks.save.mockResolvedValue({});
  mocks.upload.mockResolvedValue({});
  mocks.remove.mockResolvedValue({});
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Setup › Other document options (INC-42)', () => {
  it('starts from the defaults and lists the active bank accounts', () => {
    render(<OtherSetupPage />);

    expect((screen.getByLabelText('Name for maintenance documents') as HTMLInputElement).value).toBe('Maintenance Charges');
    expect((screen.getByLabelText('Publish dues to residents') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText('Hillside Bank ····5432')).toBeTruthy();
    expect(screen.queryByText(/Closed Bank/)).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it('sends the names whole, the ticks, the instructions as paragraphs and the excluded banks', async () => {
    render(<OtherSetupPage />);

    fireEvent.change(screen.getByLabelText('Name for maintenance documents'), { target: { value: 'Maintenance Dues' } });
    fireEvent.click(screen.getByLabelText('Publish dues to residents'));
    fireEvent.change(screen.getByLabelText('Payment Instructions'), { target: { value: 'Pay by NEFT.\nQuote your flat number.' } });
    fireEvent.click(screen.getByLabelText('Hillside Bank ····5432'));
    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({
      entity_names: { maintenance: 'Maintenance Dues', utility: 'Utility', non_member: 'Non Member Income' },
      publish_dues: false,
      show_interest_breakup: false,
      logo_on_receipt: false,
      payment_instructions_html: '<p>Pay by NEFT.</p><p>Quote your flat number.</p>',
      excluded_bank_account_ids: ['bank-2'],
    });
  });

  it('sends untouched instructions back exactly as stored', async () => {
    const stored = '<p>Pay at the office.</p><ul><li>Cash</li></ul>';
    mocks.settings = view({ payment_instructions_html: stored });
    render(<OtherSetupPage />);

    fireEvent.click(screen.getByLabelText('Logo on receipt'));
    fireEvent.click(saveButton());

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ logo_on_receipt: true, payment_instructions_html: stored });
  });

  it('shows an accountant the values without the controls', () => {
    signIn('accountant');
    render(<OtherSetupPage />);

    expect(screen.getByRole('note').textContent).toMatch(/Only the society's community admin/);
    expect((screen.getByLabelText('Name for utility documents') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Upload letter head/ })).toBeNull();
  });

  it('says "not available yet" on a server without the route', () => {
    mocks.settings = { data: undefined, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<OtherSetupPage />);

    expect(screen.getByText('Document options are not available yet on this server.')).toBeTruthy();
    expect(screen.getByText('Numbering card')).toBeTruthy();
  });
});

describe('Setup › Other letter head (INC-42)', () => {
  it('refuses a file that is not a JPG or PNG, or is over 1 MB, before uploading', () => {
    render(<OtherSetupPage />);

    chooseFile(new File(['%PDF'], 'letterhead.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert').textContent).toBe('Use a JPG or PNG image up to 1 MB.');

    const big = new File(['x'], 'letterhead.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 2 * 1024 * 1024 });
    chooseFile(big);

    expect(screen.getByRole('alert').textContent).toBe('Use a JPG or PNG image up to 1 MB.');
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('uploads a PNG and shows the saved letter head, which can be removed', async () => {
    const file = new File(['png'], 'letterhead.png', { type: 'image/png' });
    const { unmount } = render(<OtherSetupPage />);
    chooseFile(file);
    await vi.waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(file));
    unmount();

    mocks.settings = view({}, PREVIEW);
    render(<OtherSetupPage />);
    expect(screen.getByRole('img', { name: 'Letter head' }).getAttribute('src')).toBe(PREVIEW);
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
  });
});
