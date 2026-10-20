import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { forgetStoredFileLinks } from '@/lib/stored-file';
import { StaffStatusList } from './staff-status-list';

/**
 * Staff Manager › Active, Temp, Retired and Blacklisted (STAFF-10, STAFF-40,
 * STAFF-42, SB-05): the route names the status, the list asks the register
 * for it with the search, Edit opens the form page, Move to… changes the
 * status (with a reason for the blacklist), Reactivate and Remove from
 * blacklist; household help sits in the same list with its flats.
 */

const nav = vi.hoisted(() => ({ pathname: '/staff/active' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const download = vi.hoisted(() => vi.fn());
// POST /upload/download-url signs a stored file (lib/stored-file.ts).
const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download, post } }));
const printHtml = vi.hoisted(() => vi.fn());
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml }));
const badgeSettings = vi.hoisted(() => ({ value: null as null | { badge_header_image_url: string | null; badge_back_text: string } }));
vi.mock('@/hooks/use-staff-settings', () => ({ useStaffSettings: () => ({ data: badgeSettings.value }) }));
vi.mock('@/hooks/use-society-profile', () => ({ useSocietyProfile: () => ({ data: { name: 'Test Heights', display_name: null } }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  deactivate: vi.fn(),
  reactivate: vi.fn(),
  change: vi.fn(),
  changeDomestic: vi.fn(),
  role: 'community_admin',
}));
vi.mock('@/hooks', () => ({
  useDeactivateEmployee: () => ({ mutate: mocks.deactivate, mutateAsync: mocks.deactivate }),
  useReactivateEmployee: () => ({ mutate: mocks.reactivate }),
}));
vi.mock('@/hooks/use-staff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-staff')>()),
  useChangeStaffStatus: () => ({ mutateAsync: mocks.change }),
}));
vi.mock('@/hooks/use-staff-register', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-staff-register')>()),
  useStaffRegister: (filters: Record<string, unknown>) => mocks.list(filters),
  useChangeDomesticStatus: () => ({ mutateAsync: mocks.changeDomestic, mutate: mocks.changeDomestic }),
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));

const employee = (overrides: Record<string, unknown> = {}) => ({
  kind: 'official',
  id: 'staff-1',
  badge_no: null,
  name: 'Test Gardener',
  category_id: null,
  category_name: 'Gardener',
  designation: null,
  phone: '+910000000045',
  status: 'active',
  status_reason: null,
  status_changed_at: null,
  join_date: '2026-09-01',
  exit_date: null,
  badge_valid_until: null,
  shift: null,
  units: null,
  unit_ids: [],
  ...overrides,
});
const page = (rows: unknown[], legacy = false) => ({ data: { data: rows, total: rows.length, counts: null, legacy }, isLoading: false });

const lastFilters = (): Record<string, unknown> => mocks.list.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  nav.pathname = '/staff/active';
  forgetStoredFileLinks();
  post.mockReset();
  printHtml.mockReset();
  mocks.list.mockReset().mockReturnValue(page([employee()]));
  mocks.deactivate.mockReset();
  mocks.reactivate.mockReset();
  mocks.change.mockReset().mockResolvedValue({});
  mocks.changeDomestic.mockReset().mockResolvedValue({});
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
    mocks.list.mockReturnValue(page([employee({ status: 'blacklisted', status_reason: 'Theft', status_changed_at: '2026-10-10T05:00:00Z' })]));
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
    mocks.list.mockReturnValue(page([employee({ status: 'retired', exit_date: '2026-10-10' })]));
    render(<StaffStatusList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'retired' }));
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Badge No.',
      'Name',
      'Category',
      'Type',
      'Units',
      'Contact No.',
      'Shift',
      'Badge Valid Till',
      'Reason',
      'Since',
      'Edit',
      'Badge',
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
    expect(lastFilters()).toEqual(expect.objectContaining({ q: '0000000045', by: 'phone', page: 1 }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });
    expect(download).toHaveBeenCalledWith('/staff/register/export', {
      params: { status: 'active', q: '0000000045', by: 'phone', format: 'csv' },
    });
  });

  // STAFF-20 / STAFF-21: the badge in the list, and Badge on the search-by row.
  it('shows the badge and searches by it', () => {
    vi.useFakeTimers();
    mocks.list.mockReturnValue(page([employee({ badge_no: '104', badge_valid_until: '2026-06-30' })]));
    render(<StaffStatusList />);
    const row = screen.getByText('Test Gardener').closest('tr') as HTMLElement;
    expect(within(row).getByText('104')).toBeTruthy();
    expect(within(row).getByText('30 Jun 2026')).toBeTruthy();

    expect(Array.from(document.querySelectorAll('input[name="staff-search-by"]')).map((input) => (input as HTMLInputElement).value)).toEqual([
      'badge', 'unit', 'name', 'category', 'phone', 'any',
    ]);
    fireEvent.click(screen.getByLabelText('Badge'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '104' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();
    expect(lastFilters()).toEqual(expect.objectContaining({ q: '104', by: 'badge', page: 1 }));
  });

  // STAFF-42: household help in the same list, edited and moved through /workers.
  it('lists household help with Type and flats; Edit and Move to… go to the helper’s record', async () => {
    mocks.list.mockReturnValue(
      page([employee(), employee({ kind: 'domestic', id: 'worker-1', name: 'Test Maid', category_name: 'House Maids', units: 'A - 101, B - 202' })]),
    );
    render(<StaffStatusList />);
    const row = screen.getByText('Test Maid').closest('tr') as HTMLElement;
    expect(within(row).getByText('Domestic')).toBeTruthy();
    expect(within(row).getByText('A - 101, B - 202')).toBeTruthy();
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/staff/domestic/worker-1/edit');
    expect(within(screen.getByText('Test Gardener').closest('tr') as HTMLElement).getByText('Official')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add Household Help' }).getAttribute('href')).toBe('/staff/domestic/new');

    fireEvent.click(within(row).getByRole('button', { name: 'Move to…' }));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'New status' })).getByLabelText('Temp'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(mocks.changeDomestic).toHaveBeenCalledWith({ id: 'worker-1', status: 'temp', reason: undefined });
    expect(mocks.change).not.toHaveBeenCalled();
  });

  // STAFF-43: one badge with the ID card header and the back-side text.
  it('Badge prints the person’s card with the header image’s signed link and the back text', async () => {
    const stored = 'https://files.example.test/meraghar/tenants/t/header.png';
    const signed = 'https://files.example.test/meraghar/tenants/t/header.png?X-Signature=abc';
    post.mockResolvedValue({ data: { downloadUrl: signed, expiresAt: new Date(Date.now() + 3_600_000).toISOString() } });
    badgeSettings.value = { badge_header_image_url: stored, badge_back_text: 'Return to the office' };
    mocks.list.mockReturnValue(page([employee({ badge_no: '104' })]));
    render(<StaffStatusList />);
    fireEvent.click(screen.getByRole('button', { name: 'Badge' }));
    await waitFor(() => expect(printHtml).toHaveBeenCalled());
    const html = printHtml.mock.calls.at(-1)?.[0] as string;
    // The bucket is private: the card draws the signed link, never the stored address.
    expect(html).toContain('src="https://files.example.test/meraghar/tenants/t/header.png?X-Signature=abc"');
    expect(html).not.toContain(`src="${stored}"`);
    expect(post).toHaveBeenCalledWith('/upload/download-url', expect.objectContaining({ file_url: stored }), undefined);
    expect(html).toContain('104');
    expect(html).toContain('Return to the office');
    badgeSettings.value = null;
  });

  it('Badge prints the society’s name when the header image is not available', async () => {
    post.mockRejectedValue(new ApiError(404, { statusCode: 404, message: 'No', code: 'file_not_found' } as never));
    badgeSettings.value = { badge_header_image_url: 'https://files.example.test/meraghar/tenants/t/gone.png', badge_back_text: '' };
    mocks.list.mockReturnValue(page([employee({ badge_no: '105' })]));
    render(<StaffStatusList />);
    fireEvent.click(screen.getByRole('button', { name: 'Badge' }));
    await waitFor(() => expect(printHtml).toHaveBeenCalled());
    const html = printHtml.mock.calls.at(-1)?.[0] as string;
    expect(html).not.toContain('<img');
    expect(html).toContain('Test Heights');
    badgeSettings.value = null;
  });

  it('an older API (society staff only) exports through /staff/employees', async () => {
    mocks.list.mockReturnValue(page([employee()], true));
    render(<StaffStatusList />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });
    expect(download).toHaveBeenCalledWith('/staff/employees/export', { params: { status: 'active', format: 'csv' } });
  });
});
