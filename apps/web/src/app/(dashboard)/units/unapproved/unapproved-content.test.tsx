import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import { UnapprovedContent } from './unapproved-content';

/**
 * Units & Users › Unapproved Users (UNIT-13, screen UNIT-S1): two tables,
 * ticks with Select All, Approve Selected Users reporting each row, Edit
 * as a page, View with Decline, and the Users Log.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({
  ShowLogsButton: ({ label, action }: { label?: string; action?: string }): ReactNode => (
    <button type="button" data-action={action}>{label ?? 'Show Logs'}</button>
  ),
}));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));

const state = vi.hoisted(() => ({
  lists: {} as Record<string, unknown>,
  bulk: vi.fn(),
  reject: vi.fn(),
  approve: vi.fn(),
}));

vi.mock('@/hooks/use-unapproved-users', () => ({
  useUnapprovedUsers: (filters: { table: string }) => state.lists[filters.table],
  useBulkApprove: () => ({ mutateAsync: state.bulk, isPending: false }),
  unapprovedParams: (filters: { table: string; search: string }) => ({ table: filters.table }),
}));
vi.mock('@/hooks', () => ({
  useApprovalDetail: (id: string) => ({
    isLoading: false,
    data: id
      ? { request: { id, entity_summary: 'Test Applicant asks to join', metadata: { name: 'Test Applicant' }, created_at: '2026-10-01T10:00:00Z' }, steps: [] }
      : undefined,
  }),
  useApproveRequest: () => ({ mutateAsync: state.approve, isPending: false }),
  useRejectRequest: () => ({ mutateAsync: state.reject, isPending: false }),
}));

function request(n: number, overrides: Record<string, unknown> = {}) {
  return {
    approval_id: `a-${n}`,
    onboarding_id: `o-${n}`,
    name: `Test Applicant ${n}`,
    phone: `+9100000000${10 + n}`,
    email: null,
    waiting_for: 'society',
    block: 'A',
    unit_id: `u-${n}`,
    unit_number: String(100 + n),
    member_type: 'tenant',
    approval_level: 2,
    created_at: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

const list = (data: unknown[]) => ({ isLoading: false, data: { data, total: data.length, counts: { new: 4, join: 1 } } });

describe('UnapprovedContent', () => {
  beforeEach(() => {
    state.lists = {
      new: list([request(1), request(2), request(3), request(4, { waiting_for: 'owner' })]),
      join: list([request(9, { name: 'Test Neighbour' })]),
    };
    state.bulk.mockReset();
    state.reject.mockReset().mockResolvedValue({});
  });

  it('shows both tables with their columns and the Users Log', () => {
    render(<UnapprovedContent />);

    const first = screen.getByRole('table', { name: 'Unapproved Users' });
    expect(within(first).getAllByRole('row')).toHaveLength(5);
    expect(within(first).getByText('Waiting for unit owner')).toBeTruthy();
    expect(within(first).getAllByRole('link', { name: 'Edit' })[0].getAttribute('href')).toBe('/units/unapproved/o-1/edit');
    const second = screen.getByRole('table', { name: 'Unapproved Join Unit Requests' });
    expect(within(second).getByText('Test Neighbour')).toBeTruthy();
    expect(within(second).queryByRole('checkbox')).toBeNull();
    expect(within(second).queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Declined Records' }).getAttribute('data-action')).toBe('reject');
    expect(screen.getByRole('button', { name: 'Approval Records' })).toBeTruthy();
  });

  it('approves the ticked rows in one call and reports each: three approved, one skipped', async () => {
    state.bulk.mockResolvedValue([
      { id: 'a-1', status: 'approved', message: 'Approved' },
      { id: 'a-2', status: 'approved', message: 'Approved' },
      { id: 'a-3', status: 'approved', message: 'Approved' },
      { id: 'a-4', status: 'skipped', message: 'Waiting for unit owner' },
    ]);
    render(<UnapprovedContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve Selected Users (4)' }));
    await act(async () => {});

    expect(state.bulk).toHaveBeenCalledWith(['a-1', 'a-2', 'a-3', 'a-4']);
    expect(screen.getByText('3 approved, 1 skipped — waiting for unit owner')).toBeTruthy();
    expect(screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked)).toHaveLength(0);
  });

  it('keeps the tick and shows the error under a row that failed', async () => {
    state.bulk.mockResolvedValue([
      { id: 'a-1', status: 'approved', message: 'Approved' },
      { id: 'a-2', status: 'error', message: 'This approval step has already been decided' },
    ]);
    render(<UnapprovedContent />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Approve Test Applicant 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Approve Test Applicant 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve Selected Users (2)' }));
    await act(async () => {});

    const failed = screen.getByRole('checkbox', { name: 'Approve Test Applicant 2' }) as HTMLInputElement;
    expect(failed.checked).toBe(true);
    expect(screen.getByText('This approval step has already been decided')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'Approve Test Applicant 1' }) as HTMLInputElement).checked).toBe(false);
  });

  it('disables Approve Selected Users with nothing ticked, and Deselect All clears the ticks', () => {
    render(<UnapprovedContent />);

    expect((screen.getByRole('button', { name: 'Approve Selected Users' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deselect All' }));
    expect((screen.getByRole('button', { name: 'Approve Selected Users' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps Decline disabled until a reason is written, then declines with it', async () => {
    render(<UnapprovedContent />);

    fireEvent.click(within(screen.getByRole('table', { name: 'Unapproved Users' })).getAllByRole('button', { name: 'View' })[0]);
    const decline = screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement;
    expect(decline.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Decline reason'), { target: { value: '   ' } });
    expect(decline.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Decline reason'), { target: { value: 'Not living in this unit' } });
    fireEvent.click(decline);
    await act(async () => {});

    expect(state.reject).toHaveBeenCalledWith({ id: 'a-1', reason: 'Not living in this unit' });
  });

  it('says the screen is not available on an API without it', () => {
    state.lists.new = { isLoading: false, error: new ApiError(404, { message: 'Cannot GET' } as never) };
    render(<UnapprovedContent />);

    expect(screen.getByText('Unapproved Users is not available yet on this server.')).toBeTruthy();
  });
});
