import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VendorsContent from './vendors-content';

/**
 * VEND-02 / VEND-03 — the vendor form sends the TDS section and rate,
 * contact name, address and branch; the tiles count from the API totals;
 * an edit sends only what changed, so re-activating sends is_active alone.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/user-search-select', () => ({ UserSearchSelect: () => null }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('./vendor-ratings-tab', () => ({ VendorRatingsTab: () => null }));
vi.mock('@/hooks/use-vendor-bills', () => ({ useInvoiceHeads: () => ({ data: undefined }) }));

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), listCalls: [] as Array<Record<string, unknown>> }));
const vendor = vi.hoisted(() => ({
  id: 'v1',
  tenant_id: 't1',
  name: 'Brightline Electricals',
  contact_person: null,
  phone: null,
  email: null,
  address: null,
  gstin: null,
  pan: null,
  bank_details: { bank_name: 'Canara Bank', bank_branch: null, account_number: '1234567890', ifsc: 'CNRB0000123' },
  tds_section: null,
  tds_rate: null,
  is_active: false,
}));

vi.mock('@/hooks', () => ({
  useVendors: (filters: Record<string, unknown>) => {
    mocks.listCalls.push(filters);
    const total = filters.is_active === true ? 60 : filters.is_active === false ? 4 : 64;
    return { data: { data: filters.limit === 1 ? [] : [vendor], total }, isLoading: false };
  },
  useVendor: (id: string) => ({ data: id ? vendor : undefined, isLoading: false }),
  useCreateVendor: () => ({ mutate: mocks.create, isPending: false, error: null }),
  useUpdateVendor: () => ({ mutate: mocks.update, isPending: false, error: null }),
  useDeactivateVendor: () => ({ mutate: vi.fn(), isPending: false }),
  useTdsConfig: () => ({
    data: { config: { enabled: true, default_threshold: 0, default_rate: 1, sections: [{ code: '393(1)', label: 'Contractors', threshold: 0, rate: 2 }] } },
  }),
}));

function type(label: string | RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('Vendors page', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.listCalls.length = 0;
  });

  it('counts active and in-active vendors from the API totals', () => {
    render(<VendorsContent />);
    expect(mocks.listCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({ is_active: true, limit: 1 }),
      expect.objectContaining({ is_active: false, limit: 1 }),
    ]));
    expect(screen.getByText('60')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('adds a vendor with TDS section and rate, contact name, address and branch', async () => {
    render(<VendorsContent />);
    fireEvent.click(screen.getByRole('button', { name: /Add Vendor/ }));
    type('Vendor Name', 'Greenleaf Gardening');
    type('Contact Name', 'Ravi Kumar');
    type('Billing Address', '12 Market Road');
    type('Bank Branch', 'Indiranagar');
    type('TDS Section', '393(1)');
    await act(async () => {
      fireEvent.submit(screen.getByLabelText('Vendor Name').closest('form')!);
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Greenleaf Gardening',
        contact_person: 'Ravi Kumar',
        address: '12 Market Road',
        bank_branch: 'Indiranagar',
        tds_section: '393(1)',
        tds_rate: 2,
      }),
      expect.anything(),
    );
  });

  it('re-activates a vendor without touching its bank details', async () => {
    render(<VendorsContent />);
    fireEvent.click(screen.getByTitle('Edit vendor'));
    fireEvent.click(screen.getByLabelText(/^Active/));
    await act(async () => {
      fireEvent.submit(screen.getByLabelText('Vendor Name').closest('form')!);
    });
    expect(mocks.update).toHaveBeenCalledWith({ id: 'v1', data: { is_active: true } }, expect.anything());
  });
});
