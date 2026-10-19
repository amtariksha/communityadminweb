import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffStatusList } from './staff-status-list';

/**
 * Staff Manager › Active and › Retired (STAFF-10, SB-05): the route names
 * the status, the list asks the server for it with the search, Edit opens
 * the form page, and the row button moves an employee between the two.
 */

const nav = vi.hoisted(() => ({ pathname: '/staff/active' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const mocks = vi.hoisted(() => ({ list: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn() }));
vi.mock('@/hooks', () => ({
  useStaffEmployees: (filters: Record<string, unknown>) => mocks.list(filters),
  useDeactivateEmployee: () => ({ mutate: mocks.deactivate }),
  useReactivateEmployee: () => ({ mutate: mocks.reactivate }),
}));

const employee = (overrides: Record<string, unknown> = {}) => ({
  id: 'staff-1',
  tenant_id: 't',
  name: 'Test Gardener',
  phone: '+910000000045',
  staff_type: 'gardener',
  designation: null,
  id_proof_type: null,
  id_proof_number: null,
  address: null,
  emergency_contact: null,
  photo_url: null,
  join_date: '2026-09-01',
  exit_date: null,
  salary: null,
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

const lastFilters = (): Record<string, unknown> => mocks.list.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  nav.pathname = '/staff/active';
  mocks.list.mockReset().mockReturnValue({ data: { data: [employee()], total: 1 }, isLoading: false });
  mocks.deactivate.mockReset();
  mocks.reactivate.mockReset();
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Staff Manager status lists', () => {
  it('Active asks for active staff, with Edit as a page and Retire', () => {
    render(<StaffStatusList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'active', page: 1, limit: 25 }));
    expect(screen.getByRole('heading', { name: 'Active staff' })).toBeTruthy();
    const row = screen.getByText('Test Gardener').closest('tr') as HTMLElement;
    expect(within(row).getByText('Gardener')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/staff/staff-1/edit');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(within(row).getByRole('button', { name: 'Retire' }));
    expect(mocks.deactivate).toHaveBeenCalledWith('staff-1', expect.anything());
  });

  it('Retired lists only retired staff with Since and Reactivate', () => {
    nav.pathname = '/staff/retired';
    mocks.list.mockReturnValue({ data: { data: [employee({ is_active: false, exit_date: '2026-10-10' })], total: 1 }, isLoading: false });
    render(<StaffStatusList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'retired' }));
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Badge No.',
      'Name',
      'Category',
      'Designation',
      'Contact No.',
      'Join Date',
      'Badge Valid Till',
      'Since',
      'Edit',
      'Reactivate',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(mocks.reactivate).toHaveBeenCalledWith('staff-1', expect.anything());
  });

  it('searches on the server by the chosen key and exports that result', async () => {
    vi.useFakeTimers();
    render(<StaffStatusList />);

    fireEvent.click(screen.getByLabelText('Phone'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '0000000045' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();
    expect(lastFilters()).toEqual(expect.objectContaining({ q: '0000000045', search_by: 'phone', page: 1 }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });
    expect(download).toHaveBeenCalledWith('/staff/employees/export', {
      params: { status: 'active', q: '0000000045', search_by: 'phone', format: 'csv' },
    });
  });

  // STAFF-20 / STAFF-21: the badge in the list, and Badge on the search-by row.
  it('shows the badge and searches by it', () => {
    vi.useFakeTimers();
    mocks.list.mockReturnValue({
      data: { data: [employee({ badge_no: '104', badge_valid_until: '2026-06-30' })], total: 1 },
      isLoading: false,
    });
    render(<StaffStatusList />);
    const row = screen.getByText('Test Gardener').closest('tr') as HTMLElement;
    expect(within(row).getByText('104')).toBeTruthy();
    expect(within(row).getByText('30 Jun 2026')).toBeTruthy();

    expect(Array.from(document.querySelectorAll('input[name="staff-search-by"]')).map((input) => (input as HTMLInputElement).value)).toEqual([
      'badge', 'name', 'category', 'phone', 'any',
    ]);
    fireEvent.click(screen.getByLabelText('Badge'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '104' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();
    expect(lastFilters()).toEqual(expect.objectContaining({ q: '104', search_by: 'badge', page: 1 }));
  });
});
