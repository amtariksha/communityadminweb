import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffStatusList } from './staff-status-list';

/**
 * Staff Manager › Active, Temp, Retired and Blacklisted (STAFF-10, STAFF-40,
 * SB-05): the route names the status, the list asks the server for it with
 * the search, Edit opens the form page, Move to… changes the status (with a
 * reason for the blacklist), Reactivate and Remove from blacklist.
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

const mocks = vi.hoisted(() => ({ list: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn(), change: vi.fn(), role: 'community_admin' }));
vi.mock('@/hooks', () => ({
  useStaffEmployees: (filters: Record<string, unknown>) => mocks.list(filters),
  useDeactivateEmployee: () => ({ mutate: mocks.deactivate, mutateAsync: mocks.deactivate }),
  useReactivateEmployee: () => ({ mutate: mocks.reactivate }),
}));
vi.mock('@/hooks/use-staff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-staff')>()),
  useChangeStaffStatus: () => ({ mutateAsync: mocks.change }),
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));

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
  mocks.change.mockReset().mockResolvedValue({});
  mocks.role = 'community_admin';
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Staff Manager status lists', () => {
  it('Active asks for active staff, with Edit as a page and Move to… with a reason for the blacklist', async () => {
    render(<StaffStatusList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'active', page: 1, limit: 25 }));
    expect(screen.getByRole('heading', { name: 'Active staff' })).toBeTruthy();
    const row = screen.getByText('Test Gardener').closest('tr') as HTMLElement;
    expect(within(row).getByText('Gardener')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/staff/staff-1/edit');

    fireEvent.click(within(row).getByRole('button', { name: 'Move to…' }));
    const statuses = screen.getByRole('radiogroup', { name: 'New status' });
    expect(within(statuses).getAllByRole('radio').map((radio) => radio.parentElement?.textContent)).toEqual(['Temp', 'Retired', 'Blacklisted']);
    fireEvent.click(within(statuses).getByLabelText('Blacklisted'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(screen.getByRole('alert').textContent).toContain('reason');
    expect(mocks.change).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Theft reported' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(mocks.change).toHaveBeenCalledWith({ id: 'staff-1', status: 'blacklisted', reason: 'Theft reported' });
  });

  it('Blacklisted shows Reason and Since, and Remove from blacklist for the community admin only', () => {
    nav.pathname = '/staff/blacklisted';
    mocks.list.mockReturnValue({
      data: { data: [employee({ is_active: false, status: 'blacklisted', status_reason: 'Theft', status_changed_at: '2026-10-10T05:00:00Z' })], total: 1 },
      isLoading: false,
    });
    const { unmount } = render(<StaffStatusList />);
    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'blacklisted' }));
    expect(screen.getByText('Theft')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    unmount();

    mocks.role = 'accountant';
    render(<StaffStatusList />);
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('Temp reactivates through the status change', async () => {
    nav.pathname = '/staff/temp';
    render(<StaffStatusList />);
    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'temp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(mocks.change).toHaveBeenCalledWith({ id: 'staff-1', status: 'active', reason: undefined });
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
      'Reason',
      'Since',
      'Edit',
      'Reactivate',
      'Move to…',
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
