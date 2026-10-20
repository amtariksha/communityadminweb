import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '@/hooks';
import { RequestRecord } from './request-record';
import { recordChanges, recordValuesOf } from './record-values';

/**
 * The request record (HELP-19, screen HELP-S9): one Save Changes sending
 * exactly what changed, both threads with images, Print without the
 * internal thread, and the resident's rating (HELP-20).
 */

const mocks = vi.hoisted(() => ({
  role: 'community_admin',
  ticket: null as unknown,
  isError: false,
  assetsError: false,
  update: vi.fn(),
  comment: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: ({ label }: { label: string }) => <button type="button">{label}</button> }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/hooks', () => ({
  useTicket: () => ({ data: mocks.ticket, isLoading: false, isError: mocks.isError, error: null }),
  useUpdateTicket: () => ({ mutateAsync: mocks.update, isPending: false }),
  useAddTicketComment: () => ({ mutateAsync: mocks.comment, isPending: false }),
  useHelpdeskTemplates: () => ({ data: [] }),
  useHelpdeskCategories: () => ({
    data: [
      { id: 'c-plumbing', name: 'Plumbing', display_order: 10, default_priority: 'medium', subcategories: [{ id: 's-leak', name: 'Leak', display_order: 10 }] },
      { id: 'c-electrical', name: 'Electrical', display_order: 20, default_priority: 'high', subcategories: [] },
    ],
  }),
  useHelpdeskAssignees: () => ({ data: [{ user_id: 'admin-1', name: 'Test Admin', roles: ['community_admin'] }] }),
  useServicedByOptions: () => ({ isSuccess: true, data: [{ id: 'staff-1', name: 'Test Plumber', staff_type: 'plumber', designation: null }] }),
  useAssets: () => ({ isError: mocks.assetsError, data: mocks.assetsError ? undefined : { data: [{ id: 'asset-1', name: 'Lift 2' }] } }),
  useConvertToCommunity: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFileToS3: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 't-1',
    tenant_id: 'society-1',
    ticket_number: 'TKT-0042',
    unit_id: 'unit-1',
    created_by: 'resident-1',
    assigned_to: 'admin-1',
    category: 'Plumbing',
    category_id: 'c-plumbing',
    subcategory_id: 's-leak',
    subject: 'Kitchen tap leaking',
    description: 'Kitchen tap leaking\nSince last night',
    priority: 'medium',
    status: 'open',
    sla_due_at: null,
    resolved_at: null,
    closed_at: null,
    created_at: '2026-10-15T05:00:00Z',
    updated_at: '2026-10-15T05:00:00Z',
    unit_number: 'A-101',
    created_by_name: 'Asha Rao',
    request_type: 'personal',
    raised_on_behalf: false,
    serviced_by_staff_id: null,
    preferred_service_date: null,
    survey: null,
    comments: [
      { id: 'c1', ticket_id: 't-1', author_id: 'admin-1', author_name: 'Test Admin', message: 'Plumber booked', is_internal: false, created_at: '2026-10-15T06:00:00Z' },
      { id: 'c2', ticket_id: 't-1', author_id: 'admin-1', author_name: 'Test Admin', message: 'Spare key at the desk', is_internal: true, created_at: '2026-10-15T07:00:00Z' },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mocks.role = 'community_admin';
  mocks.ticket = ticket();
  mocks.isError = false;
  mocks.assetsError = false;
  mocks.update.mockReset().mockResolvedValue({ data: {} });
  mocks.comment.mockReset().mockResolvedValue({ data: {} });
});

const renderRecord = () => render(<RequestRecord ticketId="t-1" onClose={vi.fn()} />);

describe('RequestRecord', () => {
  it('shows the summary in the committee’s words', () => {
    renderRecord();

    const summary = screen.getByRole('region', { name: 'Request summary' });
    expect(within(summary).getByText('TKT-0042')).toBeTruthy();
    expect(within(summary).getByText('Asha Rao')).toBeTruthy();
    expect(within(summary).getByText('A-101')).toBeTruthy();
    expect(within(summary).getByText('Personal')).toBeTruthy();
  });

  it('sends one PATCH with exactly the three fields changed', async () => {
    renderRecord();
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c-electrical' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    fireEvent.change(screen.getByLabelText('Serviced By'), { target: { value: 'staff-1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      id: 't-1',
      category_id: 'c-electrical',
      status: 'in_progress',
      serviced_by_staff_id: 'staff-1',
    });
  });

  it('keeps the internal thread off the printed page, and the resident one on it', () => {
    renderRecord();

    expect(screen.getByRole('region', { name: 'Admin Internal Communication' }).className).toContain('print:hidden');
    expect(screen.getByRole('region', { name: 'Resident Communication' }).className).not.toContain('print:hidden');
    expect(screen.getByRole('region', { name: 'Edit request' }).className).toContain('print:hidden');
  });

  it('posts an internal note with its images', async () => {
    renderRecord();
    const internal = screen.getByRole('region', { name: 'Admin Internal Communication' });
    fireEvent.change(within(internal).getByLabelText('Write to Admin Internal Communication'), { target: { value: 'Photos attached' } });

    await act(async () => {
      fireEvent.click(within(internal).getByRole('button', { name: /Comment/ }));
    });

    expect(mocks.comment).toHaveBeenCalledWith({ ticket_id: 't-1', message: 'Photos attached', is_internal: true });
  });

  it('shows the resident’s rating and feedback (HELP-20)', () => {
    mocks.ticket = ticket({ status: 'resolved', survey: { rating: 4, feedback: 'Quick fix', submitted_at: '2026-10-16T05:00:00Z' } });
    renderRecord();

    const feedback = screen.getByRole('region', { name: 'Resident feedback' });
    expect(within(feedback).getByLabelText('Rated 4 of 5')).toBeTruthy();
    expect(within(feedback).getByText('Quick fix')).toBeTruthy();
  });

  it('is read-only for a committee member', () => {
    mocks.role = 'committee_member';
    renderRecord();

    expect(screen.queryByRole('button', { name: /Save Changes/ })).toBeNull();
    expect((screen.getByLabelText('Status') as HTMLSelectElement).disabled).toBe(true);
  });

  it('shows a committee member both threads without reply boxes (decision 7)', () => {
    mocks.role = 'committee_member';
    renderRecord();

    expect(screen.getByText('Plumber booked')).toBeTruthy();
    expect(screen.getByText('Spare key at the desk')).toBeTruthy();
    expect(screen.queryByLabelText('Write to Resident Communication')).toBeNull();
    expect(screen.queryByLabelText('Write to Admin Internal Communication')).toBeNull();
    expect(screen.queryByRole('button', { name: /Comment/ })).toBeNull();
  });

  it('keeps the reply boxes for the desk', () => {
    renderRecord();
    expect(screen.getByLabelText('Write to Resident Communication')).toBeTruthy();
  });

  const LINKED = {
    id: 'asset-9',
    name: 'Booster pump 2',
    asset_code: 'PMP-002',
    asset_type: 'plumbing',
    status: 'active',
    condition: null,
    location: 'Basement',
    site: null,
    building: 'Tower A',
    wing: null,
    floor: 'B1',
    room: null,
  };

  it('shows the linked asset from the request read in the summary', () => {
    mocks.ticket = ticket({ related_to_type: 'asset', related_to_id: 'asset-9', related_to_name: 'Booster pump 2', linked_asset: LINKED });
    renderRecord();

    const summary = screen.getByRole('region', { name: 'Request summary' });
    expect(within(summary).getByText('PMP-002 Booster pump 2 · Basement, Tower A, B1 · active')).toBeTruthy();
  });

  it('gives a role that cannot search the asset register the asset fields, not only its name', () => {
    mocks.role = 'facility_supervisor';
    mocks.assetsError = true;
    mocks.ticket = ticket({ related_to_type: 'asset', related_to_id: 'asset-9', related_to_name: 'Booster pump 2', linked_asset: LINKED });
    renderRecord();

    expect(screen.getAllByText('PMP-002 Booster pump 2 · Basement, Tower A, B1 · active')).toHaveLength(2);
  });

  it('says "Request not found" for an unknown request', () => {
    mocks.ticket = undefined;
    mocks.isError = true;
    renderRecord();

    expect(screen.getByText('Request not found.')).toBeTruthy();
  });
});

describe('recordChanges', () => {
  const loaded = recordValuesOf(ticket({ priority: 'urgent', category_id: 'c-plumbing', subcategory_id: 's-leak' }));
  const defaults = (categoryId: string) => (categoryId === 'c-electrical' ? 'high' : 'medium');

  it('sends nothing when nothing changed', () => {
    expect(recordChanges(loaded, loaded, defaults)).toEqual({});
  });

  it('lets the server clear the sub-category when the category changes', () => {
    expect(recordChanges(loaded, { ...loaded, categoryId: 'c-electrical', subcategoryId: '' }, defaults)).toEqual({
      category_id: 'c-electrical',
    });
  });

  it('gives back the category’s default priority when "This is urgent!" is unticked', () => {
    expect(recordChanges(loaded, { ...loaded, urgent: false }, defaults)).toEqual({ priority: 'medium' });
  });

  it('clears a date, Serviced By and the asset with null', () => {
    const withAll = { ...loaded, serviceDate: '2026-11-02', servicedBy: 'staff-1', assetId: 'asset-1' };
    expect(recordChanges(withAll, { ...withAll, serviceDate: '', servicedBy: '', assetId: '' }, defaults)).toEqual({
      preferred_service_date: null,
      serviced_by_staff_id: null,
      linked_asset_id: null,
    });
  });
});
