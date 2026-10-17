import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TicketsContent from './tickets-content';

/**
 * The /tickets page had controls that showed nothing or failed: a Golden
 * Queue tab and card fed by flags nothing writes, an SLA Overdue tab that
 * filtered one page in the browser, a Bulk Reassign that offered staff-
 * register ids, and a "Helpdesk SLA Setup" dialog that only displayed.
 */

function ticket(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    ticket_number: `TKT-${id}`,
    subject: `Request ${id}`,
    category: 'plumbing',
    priority: 'medium',
    status: 'open',
    created_at: '2026-10-01T09:00:00Z',
    is_overdue: false,
    ...overrides,
  };
}

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  useTickets: vi.fn(),
  bulkReassign: vi.fn(),
  assigneesSucceeded: true,
  exportColumns: [] as Array<{ key: string; label: string }>,
  mutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('@/hooks', () => ({
  useTickets: (filters: Record<string, unknown>) => mocks.useTickets(filters),
  useTicket: () => ({ data: undefined, isLoading: false }),
  useTicketStats: () => ({ data: { open: 5, in_progress: 0, resolved: 0, closed: 0 }, isLoading: false }),
  useTicketCategories: () => ({ data: ['plumbing'] }),
  useHelpdeskCategories: () => ({ data: [] }),
  useHelpdeskAssignees: () => ({
    data: [
      { user_id: 'admin-1', name: 'Test Admin One', roles: ['community_admin'] },
      { user_id: 'admin-2', name: 'Test Admin Two', roles: ['manager'] },
    ],
    isSuccess: mocks.assigneesSucceeded,
  }),
  useCreateTicket: () => mocks.mutation(),
  useUpdateTicket: () => mocks.mutation(),
  useAddTicketComment: () => mocks.mutation(),
  useBulkCloseTickets: () => mocks.mutation(),
  useBulkReassignTickets: () => ({ mutate: mocks.bulkReassign, isPending: false }),
  useUploadFileToS3: () => mocks.mutation(),
  fetchPresignedDownloadUrl: vi.fn(),
  useHelpdeskKpi: () => ({
    data: {
      total_tickets: 5,
      open_tickets: 5,
      in_progress_tickets: 0,
      resolved_tickets: 0,
      closed_tickets: 0,
      sla_breached: 3,
      avg_resolution_hours: 12,
    },
  }),
  useHelpdeskTemplates: () => ({ data: [] }),
  useCreateHelpdeskTemplate: () => mocks.mutation(),
}));

vi.mock('@/hooks/use-list-url-state', () => ({
  useListUrlState: () => ({ state: { page: 1, sort: null, dir: 'desc' }, setPage: vi.fn() }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));
vi.mock('@/components/ui/export-button', () => ({
  ExportButton: ({ columns }: { columns: Array<{ key: string; label: string }> }) => {
    mocks.exportColumns = columns;
    return <button type="button">Export</button>;
  },
}));
// The app's Select draws its options in a portal; a native select is enough here.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const THREE_OVERDUE = [
  ticket('1', { is_overdue: true }),
  ticket('2', { is_overdue: true }),
  ticket('3', { is_overdue: true }),
];
const ALL_FIVE = [...THREE_OVERDUE, ticket('4'), ticket('5')];

beforeEach(() => {
  mocks.assigneesSucceeded = true;
  mocks.bulkReassign.mockClear();
  mocks.useTickets.mockReset().mockImplementation((filters: { overdue?: boolean }) =>
    filters.overdue
      ? { data: { data: THREE_OVERDUE, total: 3 }, isLoading: false }
      : { data: { data: ALL_FIVE, total: 5 }, isLoading: false },
  );
});

describe('Tickets page — dead controls', () => {
  it('has no Golden Queue tab or card', () => {
    render(<TicketsContent />);

    expect(screen.queryByText(/Golden/i)).toBeNull();
  });

  it('asks the server for overdue requests when the SLA Overdue tab is chosen', () => {
    render(<TicketsContent />);

    fireEvent.click(screen.getByRole('button', { name: /SLA Overdue/ }));

    const lastFilters = mocks.useTickets.mock.calls.at(-1)?.[0];
    expect(lastFilters.overdue).toBe(true);
    expect(screen.getAllByRole('checkbox', { name: /^Select ticket/ })).toHaveLength(3);
    expect(screen.getByText('3 total')).toBeTruthy();
  });

  it('shows the same overdue count on the tab as on the SLA Breached card', () => {
    render(<TicketsContent />);

    expect(screen.getByRole('button', { name: 'SLA Overdue (3)' })).toBeTruthy();
    const card = screen.getByText('SLA Breached').closest('div')?.parentElement as HTMLElement;
    expect(within(card).getByText('3')).toBeTruthy();
  });

  it('asks the server for every request on the All tab', () => {
    render(<TicketsContent />);

    expect(mocks.useTickets.mock.calls.at(-1)?.[0].overdue).toBeFalsy();
    expect(screen.getAllByRole('checkbox', { name: /^Select ticket/ })).toHaveLength(5);
  });

  it('replaces the SLA setup dialog with a Setup link to the categories', () => {
    render(<TicketsContent />);

    expect(screen.queryByText('Helpdesk SLA Setup')).toBeNull();
    expect(screen.getByRole('link', { name: 'Setup' }).getAttribute('href')).toBe('/helpdesk/setup/categories');
  });

  it('shows no Setup link while the server cannot serve the setup screens', () => {
    mocks.assigneesSucceeded = false;
    render(<TicketsContent />);

    expect(screen.queryByRole('link', { name: 'Setup' })).toBeNull();
  });

  it('adds Unit, Raised By, Assigned To and Overdue to the export', () => {
    render(<TicketsContent />);

    const labels = mocks.exportColumns.map((column) => column.label);
    expect(labels).toEqual(expect.arrayContaining(['Unit', 'Raised By', 'Assigned To', 'Overdue']));
  });
});

describe('Tickets page — Bulk Reassign', () => {
  function openBulkReassign(): HTMLElement {
    render(<TicketsContent />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select ticket TKT-1' }));
    fireEvent.click(screen.getByRole('button', { name: /Bulk Reassign/ }));
    return screen.getByRole('dialog');
  }

  it('offers the admins of this society under "Assign To"', () => {
    const dialog = openBulkReassign();

    expect(within(dialog).getByText('Assign To')).toBeTruthy();
    const options = within(dialog).getAllByRole('option').map((option) => option.textContent);
    expect(options.some((text) => text?.includes('Test Admin One'))).toBe(true);
    expect(options.some((text) => text?.includes('Test Admin Two'))).toBe(true);
    expect(within(dialog).queryByText(/staff member/i)).toBeNull();
  });

  it('sends the admin\'s user id', () => {
    const dialog = openBulkReassign();

    fireEvent.change(within(dialog).getByLabelText('Assign To'), { target: { value: 'admin-2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reassign' }));

    expect(mocks.bulkReassign).toHaveBeenCalledTimes(1);
    expect(mocks.bulkReassign.mock.calls[0][0]).toEqual({ ticket_ids: ['1'], assigned_to: 'admin-2' });
  });
});
