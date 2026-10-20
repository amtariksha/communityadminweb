import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MoveIn } from '@/hooks/use-move-ins';
import { ApiError } from '@/lib/api-error';
import { VerifyContent } from './verify-content';

/**
 * Verify Move Ins (MOVE-06, screen MOVE-S6): two stacked queues, Level 1
 * and Level 2, each asking the server for its own level; Approve and
 * Reject go through the approval engine; an older API shows "not available".
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const mocks = vi.hoisted(() => ({ moveIns: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock('@/hooks/use-move-ins', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-move-ins')>()),
  useMoveIns: (filters: Record<string, unknown>) => mocks.moveIns(filters),
}));
vi.mock('@/hooks/use-approvals', () => ({
  useApproveRequest: () => ({ mutate: mocks.approve, isPending: false }),
  useRejectRequest: () => ({ mutate: mocks.reject, isPending: false }),
  useApprovalDetail: () => ({ data: { steps: [] } }),
}));

const MOVE_IN: MoveIn = {
  approval_id: 'ar-1',
  request_type: 'tenant_onboarding',
  onboarding_id: 'on-1',
  name: 'Test Tenant',
  phone: '+910000000051',
  block: 'A',
  unit_number: '101',
  member_type: 'tenant',
  requested_at: '2026-10-18T04:00:00.000Z',
  requested_by_name: 'Test Owner',
  lease_start_date: '2026-11-01',
  lease_end_date: '2027-10-31',
  approved_at: null,
  approved_by_name: null,
  account_created: false,
};

beforeEach(() => {
  mocks.moveIns.mockReset().mockImplementation((filters: { level?: number }) => ({
    data: filters.level === 1 ? { data: [MOVE_IN], total: 1 } : { data: [], total: 0 },
    isLoading: false,
  }));
  mocks.approve.mockReset();
  mocks.reject.mockReset();
});

describe('Verify Move Ins', () => {
  it('stacks Level 1 and Level 2, each asking for its own level', () => {
    render(<VerifyContent />);

    expect(screen.getByRole('heading', { name: 'All Move Ins - Level 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'All Move Ins - Level 2' })).toBeTruthy();
    const levels = mocks.moveIns.mock.calls.map(([filters]) => (filters as { level: number }).level);
    expect(new Set(levels)).toEqual(new Set([1, 2]));
    expect(mocks.moveIns).toHaveBeenCalledWith(expect.objectContaining({ state: 'pending', level: 1, page: 1, limit: 25 }));
    expect(screen.getByText('No move-ins waiting at this level.')).toBeTruthy();
  });

  it('shows the screen’s columns with the row buttons', () => {
    render(<VerifyContent />);
    const table = screen.getByRole('table', { name: 'All Move Ins - Level 1' });

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Name',
      'Phone',
      'Block',
      'Unit',
      'Owner/Tenant',
      'Requested On',
      'Requested By',
      'Checklist',
      'Action',
      '',
      '',
    ]);
    expect(within(table).getByText('Tenant')).toBeTruthy();
  });

  it('Reject needs a reason, then rejects through the approval engine', () => {
    render(<VerifyContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' }));
    expect(mocks.reject).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Documents missing' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' }));
    expect(mocks.reject).toHaveBeenCalledWith({ id: 'ar-1', reason: 'Documents missing' }, expect.anything());
  });

  it('Approve approves through the approval engine', () => {
    render(<VerifyContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }));

    expect(mocks.approve).toHaveBeenCalledWith({ id: 'ar-1', comments: undefined, confirm_incomplete_checklist: false }, expect.anything());
  });

  it('warns about unticked checklist items and approves on confirmation (MOVE-13)', () => {
    mocks.approve.mockImplementationOnce((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(409, { statusCode: 409, error: 'Conflict', request_id: 'r', timestamp: '', message: '1 of 3 checklist items are ticked. Confirm to go on without the rest.', code: 'checklist_incomplete' })),
    );
    render(<VerifyContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('1 of 3 checklist items');

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve anyway' }));
    expect(mocks.approve).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'ar-1', confirm_incomplete_checklist: true }), expect.anything());
  });

  it('shows Checklist (n of m) from the server', () => {
    mocks.moveIns.mockImplementation((filters: { level?: number }) => ({
      data: filters.level === 1 ? { data: [{ ...MOVE_IN, checklist_done: 1, checklist_total: 3 }], total: 1 } : { data: [], total: 0 },
      isLoading: false,
    }));
    render(<VerifyContent />);
    expect(within(screen.getByRole('table', { name: 'All Move Ins - Level 1' })).getByText('1 of 3')).toBeTruthy();
  });

  it('shows Approve and Reject only to the people allowed at the row’s level (MOVE-12)', () => {
    mocks.moveIns.mockImplementation((filters: { level?: number }) => ({
      data: filters.level === 1 ? { data: [{ ...MOVE_IN, can_act: false }], total: 1 } : { data: [], total: 0 },
      isLoading: false,
    }));
    render(<VerifyContent />);

    expect(screen.getByRole('button', { name: 'View' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('searches its own queue on the server', () => {
    vi.useFakeTimers();
    render(<VerifyContent />);

    fireEvent.change(screen.getAllByRole('searchbox')[0], { target: { value: '101' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    expect(mocks.moveIns).toHaveBeenCalledWith(expect.objectContaining({ level: 1, q: '101', page: 1 }));
  });

  it('says the list is not available yet on an older API', () => {
    mocks.moveIns.mockReturnValue({ data: null, isLoading: false });
    render(<VerifyContent />);

    expect(screen.getAllByText('This list is not available yet on this server.')).toHaveLength(2);
  });
});
