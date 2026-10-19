import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestsList } from '../requests-list/requests-list';

/**
 * Open Requests and Closed Requests (HELP-12, screens HELP-S7 / S8): the
 * status comes from the route, the filters read "name (n)" from the
 * server's facets, search and paging happen on the server, and the
 * export strip asks for the whole filtered result.
 */

const nav = vi.hoisted(() => ({ pathname: '/helpdesk/open', search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));

const mocks = vi.hoisted(() => ({
  useTickets: vi.fn(),
  useTicketFacets: vi.fn(),
  detailFor: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useTickets: (filters: Record<string, unknown>) => mocks.useTickets(filters),
  useTicketFacets: (scope: string) => mocks.useTicketFacets(scope),
  ticketListParams: (filters: Record<string, string | undefined>) =>
    Object.fromEntries(Object.entries(filters).filter(([key, value]) => value && key !== 'page' && key !== 'limit')),
}));
vi.mock('../../tickets/ticket-detail-dialog', () => ({
  TicketDetailDialog: ({ ticketId }: { ticketId: string }) => {
    mocks.detailFor(ticketId);
    return ticketId ? <div role="dialog">Request {ticketId}</div> : null;
  },
}));

function request(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    ticket_number: `TKT-${id}`,
    category: 'Plumbing',
    subject: `Leak ${id}`,
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-04T09:00:00Z',
    created_by_name: 'Asha Rao',
    unit_number: 'A-101',
    status: 'open',
    priority: 'medium',
    last_comment_text: 'Plumber visited',
    preferred_service_date: '2026-11-02',
    age_days: 3,
    ...overrides,
  };
}

const FACETS = {
  status: [
    { value: 'open', label: 'open', count: 3 },
    { value: 'in_progress', label: 'in_progress', count: 1 },
  ],
  category: [
    { value: 'c-plumbing', label: 'Plumbing', count: 4 },
    { value: null, label: '(No category)', count: 1 },
  ],
  driven_by: [
    { value: null, label: 'Unassigned', count: 2 },
    { value: 'u-1', label: 'Test Admin', count: 3 },
  ],
  block: [
    { value: 'A', label: 'A', count: 3 },
    { value: null, label: '(No block)', count: 2 },
  ],
  unit: [{ value: 'unit-1', label: 'A-101', count: 2 }],
  type: [
    { value: 'personal', label: 'Resident', count: 3 },
    { value: 'community', label: 'Community', count: 2 },
  ],
  subcategory: [
    { value: 's-leak', label: 'Leak', count: 2 },
    { value: null, label: '(No sub-category)', count: 3 },
  ],
};

function lastFilters(): Record<string, unknown> {
  return mocks.useTickets.mock.calls.at(-1)?.[0] ?? {};
}

beforeEach(() => {
  nav.pathname = '/helpdesk/open';
  nav.search = '';
  nav.replace.mockClear();
  mocks.useTickets.mockReset().mockReturnValue({ data: { data: [request('1'), request('2')], total: 230 }, isLoading: false });
  mocks.useTicketFacets.mockReset().mockReturnValue({ data: FACETS });
  mocks.detailFor.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Open Requests', () => {
  it('lists the open scope, 100 rows a page', () => {
    render(<RequestsList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ scope: 'open', page: 1, limit: 100 }));
    expect(mocks.useTicketFacets).toHaveBeenCalledWith('open');
    expect(screen.getByText('Showing 1 to 100 of 230 entries')).toBeTruthy();
  });

  it('shows the columns of the screen, in order, in the committee’s words', () => {
    render(<RequestsList />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Request No.',
      'Category',
      'Request',
      'Opened On',
      'By',
      'Preferred Service Date',
      'Unit',
      'Status',
      'Last update',
      'Updated On',
      'Days',
      'Action',
    ]);
    const row = screen.getByText('TKT-1').closest('tr') as HTMLElement;
    expect(within(row).getByText('New')).toBeTruthy();
    expect(within(row).getByText('Plumber visited')).toBeTruthy();
    expect(within(row).getByText('3')).toBeTruthy();
    expect(within(row).getByText('02/11/2026')).toBeTruthy();
  });

  it('labels each filter option with its count and filters on the chosen one', () => {
    const { container } = render(<RequestsList />);
    const category = container.querySelector('select#request-category') as HTMLSelectElement;

    expect(Array.from(category.options).map((option) => option.textContent)).toEqual(['All', 'Plumbing (4)']);
    fireEvent.change(category, { target: { value: 'c-plumbing' } });

    expect(lastFilters()).toEqual(expect.objectContaining({ category_id: 'c-plumbing', page: 1 }));
  });

  it('offers Unassigned and No block as choices of their own', () => {
    const { container } = render(<RequestsList />);
    const drivenBy = container.querySelector('select#request-driven-by') as HTMLSelectElement;
    const block = container.querySelector('select#request-block') as HTMLSelectElement;

    expect(Array.from(drivenBy.options).map((option) => [option.value, option.textContent])).toEqual([
      ['', 'All'],
      ['unassigned', 'Unassigned (2)'],
      ['u-1', 'Test Admin (3)'],
    ]);
    fireEvent.change(block, { target: { value: 'none' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ block: 'none' }));
  });

  it('filters by the open statuses with the committee’s words', () => {
    const { container } = render(<RequestsList />);
    const status = container.querySelector('select#request-status') as HTMLSelectElement;

    expect(Array.from(status.options).map((option) => option.textContent)).toEqual([
      'All Open',
      'New (3)',
      'In Progress (1)',
      'On Hold (0)',
      'Awaiting Resident Response (0)',
      'Reopened (0)',
    ]);
    fireEvent.change(status, { target: { value: 'in_progress' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ status: 'in_progress' }));
  });

  it('filters by sub-category, with counts (HELP-17)', () => {
    const { container } = render(<RequestsList />);
    const sub = container.querySelector('select#request-subcategory') as HTMLSelectElement;

    expect(Array.from(sub.options).map((option) => option.textContent)).toEqual(['All', 'Leak (2)']);
    fireEvent.change(sub, { target: { value: 's-leak' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ subcategory_id: 's-leak' }));
  });

  it('filters Resident and Community requests, with their counts (HELP-15)', () => {
    const { container } = render(<RequestsList />);
    const type = container.querySelector('select#request-type') as HTMLSelectElement;

    expect(Array.from(type.options).map((option) => [option.value, option.textContent])).toEqual([
      ['', 'All'],
      ['personal', 'Resident (3)'],
      ['community', 'Community (2)'],
    ]);
    fireEvent.change(type, { target: { value: 'community' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ type: 'community' }));
  });

  it('searches on the server once typing pauses', () => {
    vi.useFakeTimers();
    render(<RequestsList />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'A-101' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(lastFilters()).toEqual(expect.objectContaining({ q: 'A-101', page: 1 }));
  });

  it('continues the serial number on page 2', () => {
    mocks.useTickets.mockImplementation((filters: { page: number }) => ({
      data: filters.page === 2 ? { data: [request('101')], total: 230 } : { data: [request('1')], total: 230 },
      isLoading: false,
    }));
    render(<RequestsList />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const row = screen.getByText('TKT-101').closest('tr') as HTMLElement;
    expect(within(row).getAllByRole('cell')[0].textContent).toBe('101');
  });

  it('exports the whole filtered result with the same filters', async () => {
    download.mockResolvedValue(new Blob(['x']));
    const { container } = render(<RequestsList />);
    fireEvent.change(container.querySelector('select#request-category') as HTMLSelectElement, {
      target: { value: 'c-plumbing' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });

    expect(download).toHaveBeenCalledWith('/tickets/export', {
      params: { scope: 'open', category_id: 'c-plumbing', layout: 'classic', format: 'xlsx' },
    });
  });

  it('opens a request from View', () => {
    render(<RequestsList />);

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);

    expect(screen.getByRole('dialog').textContent).toBe('Request 2');
  });

  it('opens the request named in the link', () => {
    nav.search = 'view=7';
    render(<RequestsList />);

    expect(screen.getByRole('dialog').textContent).toBe('Request 7');
  });

  it('says so when there is nothing open', () => {
    mocks.useTickets.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    render(<RequestsList />);

    expect(screen.getByText('There are no open requests.')).toBeTruthy();
  });
});

describe('Closed Requests', () => {
  beforeEach(() => {
    nav.pathname = '/helpdesk/closed';
  });

  it('lists the closed scope without a Status filter', () => {
    const { container } = render(<RequestsList />);

    expect(lastFilters()).toEqual(expect.objectContaining({ scope: 'closed' }));
    expect(mocks.useTicketFacets).toHaveBeenCalledWith('closed');
    expect(container.querySelector('select#request-status')).toBeNull();
  });

  it('says so when nothing is closed', () => {
    mocks.useTickets.mockReturnValue({ data: { data: [], total: 0 }, isLoading: false });
    render(<RequestsList />);

    expect(screen.getByText('There are no closed requests.')).toBeTruthy();
  });
});
