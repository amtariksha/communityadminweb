import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartyList } from '../party-list';

/**
 * Vendor Master › Vendors For Expense (VEND-06, screen VEND-S1): the wide
 * list in order, Active / In-Active from the route, a whole-result export
 * from the server, Edit opening the form page. Vendors for Non Member
 * Income (VEND-07, VEND-S3) is the same list over customers.
 */

const nav = vi.hoisted(() => ({ pathname: '/vendor-master/expense' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(value: T): T => value }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => 'accountant' }));
const api = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));

const mocks = vi.hoisted(() => ({ vendors: vi.fn(), customers: vi.fn() }));
vi.mock('@/hooks/use-vendors', () => ({ useVendors: (filters: unknown) => mocks.vendors(filters) }));
vi.mock('@/hooks/use-customers', () => ({ useCustomers: (filters: unknown) => mocks.customers(filters) }));

const LIFTS = {
  id: 'v-1',
  name: 'Acme Lifts',
  contact_person: 'Ravi Test',
  phone: '+910000000051',
  email: 'lifts@example.test',
  tds_rate: 2,
  tds_section: '393(1)',
  gstin: '29ABCDE1234F1Z5',
  default_igst_rate: null,
  default_cgst_rate: '9.00',
  default_sgst_rate: '9.00',
  is_active: true,
};

const headers = () => [...screen.getByRole('table').querySelectorAll('thead th')].map((th) => th.textContent);

describe('PartyList', () => {
  beforeEach(() => {
    nav.pathname = '/vendor-master/expense';
    api.download.mockReset().mockResolvedValue(new Blob(['x']));
    mocks.vendors.mockReset().mockReturnValue({ isLoading: false, data: { data: [LIFTS], total: 60 } });
    mocks.customers.mockReset().mockReturnValue({
      isLoading: false,
      data: { data: [{ id: 'c-1', name: 'Tower Rentals', party_code: 'NM-01', tds_rate: '10.00', tds_section: '393(1)', notes: 'Roof lease', is_active: true }], total: 1 },
    });
  });

  it('lists active vendors with the tax set-up at a glance, counted by the server', () => {
    render(<PartyList kind="expense" />);

    expect(headers()).toEqual(['S.No', 'Name', 'Contact', 'Phone', 'Email', 'TDS', 'GSTIN', 'IGST', 'CGST', 'SGST', 'Edit']);
    expect(screen.getByRole('heading', { name: 'Active Vendors for Expense Tracker (60)' })).toBeTruthy();
    expect(screen.getByText('2% (393(1))')).toBeTruthy();
    expect(mocks.vendors).toHaveBeenLastCalledWith(expect.objectContaining({ is_active: true, page: 1 }));
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/vendor-master/vendors/v-1/edit?list=expense');
  });

  it('exports the whole filtered list as a real Excel file from the server', async () => {
    render(<PartyList kind="expense" />);
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));

    await waitFor(() => expect(api.download).toHaveBeenCalled());
    expect(api.download).toHaveBeenCalledWith('/vendors/export', { params: { is_active: 'true', format: 'xlsx' } });
  });

  it('reads In-Active from the route', () => {
    nav.pathname = '/vendor-master/expense/inactive';
    render(<PartyList kind="expense" />);
    expect(mocks.vendors).toHaveBeenLastCalledWith(expect.objectContaining({ is_active: false }));
  });

  it('lists non-member-income parties with Id, TDS and Comments from customers', () => {
    nav.pathname = '/vendor-master/non-member-income';
    render(<PartyList kind="income" />);

    expect(headers()).toEqual(['S.No', 'Id', 'Name', 'Contact', 'Phone', 'Email', 'TDS', 'GSTIN', 'Comments', 'Edit']);
    expect(screen.getByText('NM-01')).toBeTruthy();
    expect(screen.getByText('10% (393(1))')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add Vendor' }).getAttribute('href')).toBe('/vendor-master/vendors/new?list=income');
    expect(mocks.vendors).not.toHaveBeenCalled();
  });
});
