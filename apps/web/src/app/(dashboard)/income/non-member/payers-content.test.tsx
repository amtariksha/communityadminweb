import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PayersContent } from './payers-content';

/** INC-46 — Non Member Income › By Vendors: Due per payer, Total Due, and the row buttons. */

const mocks = vi.hoisted(() => ({
  access: { canRead: true, canWrite: true },
  layout: 'classic' as 'classic' | 'standard',
  push: vi.fn(),
  list: { data: undefined as unknown, isLoading: false, error: null as unknown, refetch: vi.fn() },
  invoiceFor: null as unknown,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/hooks/use-finance-access', () => ({ useFinanceAccess: () => mocks.access }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => mocks.layout }));
vi.mock('@/hooks/use-customers', () => ({ useCustomers: () => mocks.list }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/unit-posting/payer-collection-form', () => ({
  PayerCollectionFormView: ({ customerId }: { customerId: string }) => <p>Collection dialog for {customerId}</p>,
}));
vi.mock('../../invoices/custom-invoice-dialog', () => ({
  CustomInvoiceDialog: ({ open, initialCustomer }: { open: boolean; initialCustomer?: { name: string } }) =>
    open ? <p>Invoice dialog for {initialCustomer?.name}</p> : null,
}));

const PAYERS = {
  data: [
    { id: 'c-1', name: 'Sunrise Events', outstanding: '5000.00', is_active: true },
    { id: 'c-2', name: 'Tower Rentals', outstanding: '0.00', is_active: true },
  ],
  total: 2,
  total_due: 5000,
};

describe('Non Member Income payers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = { canRead: true, canWrite: true };
    mocks.layout = 'classic';
    mocks.list = { data: PAYERS, isLoading: false, error: null, refetch: vi.fn() };
  });

  it('lists both payers with what each owes and the Total Due', () => {
    render(<PayersContent />);

    expect(screen.getByText('Total Due ₹5,000')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Due of Sunrise Events' }).textContent).toBe('₹5,000');
    expect(screen.getByRole('link', { name: 'Due of Tower Rentals' }).textContent).toBe('₹0');
    expect(screen.getByRole('link', { name: 'Sunrise Events' }).getAttribute('href')).toBe('/income/non-member/payers/c-1/statement');
    expect(screen.getByRole('link', { name: 'Add Payer' })).toBeTruthy();
  });

  it('opens the invoice from the payer and its collection as a page in classic', () => {
    render(<PayersContent />);
    const row = screen.getByRole('link', { name: 'Sunrise Events' }).closest('tr') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'Invoice' }));
    expect(screen.getByText('Invoice dialog for Sunrise Events')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Collection' }));
    expect(mocks.push).toHaveBeenCalledWith('/income/non-member/payers/c-1/collection');
  });

  it('opens the collection as a dialog in standard', () => {
    mocks.layout = 'standard';
    render(<PayersContent />);
    const row = screen.getByRole('link', { name: 'Tower Rentals' }).closest('tr') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'Collection' }));
    expect(screen.getByText('Collection dialog for c-2')).toBeTruthy();
  });

  it('leaves a finance reader View only, without Add Payer', () => {
    mocks.access = { canRead: true, canWrite: false };
    render(<PayersContent />);

    expect(screen.queryByRole('button', { name: 'Invoice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Collection' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Add Payer' })).toBeNull();
    expect(screen.getAllByRole('link', { name: 'View' })).toHaveLength(2);
  });

  it('says so when there are no payers', () => {
    mocks.list = { data: { data: [], total: 0, total_due: 0 }, isLoading: false, error: null, refetch: vi.fn() };
    render(<PayersContent />);

    expect(screen.getByText('No payers yet — add one.')).toBeTruthy();
  });
});
