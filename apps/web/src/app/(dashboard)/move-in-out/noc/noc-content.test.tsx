import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MoveOut } from '@/hooks/use-move-outs';
import { ApiError } from '@/lib/api-error';
import { NocContent } from './noc-content';
import { startMoveOutError } from './start-move-out-rules';

/**
 * MOVE-18 — NOC Initiated · Sent · Submitted (MOVE-S11): each list asks for
 * its state; the row buttons follow the state; Issue NOC waits for the
 * approvals and shows the dues gate (MOVE-16).
 */

const mocks = vi.hoisted(() => ({
  moveOuts: vi.fn(),
  issue: vi.fn(),
  submit: vi.fn(),
  role: 'community_admin',
}));

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/block-links/block-links', () => ({ UnitBlockLinks: (): ReactNode => <nav aria-label="Blocks" /> }));
vi.mock('@/components/move-checklist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/move-checklist')>()),
  canTickChecklists: () => true,
}));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('./start-move-out-dialog', () => ({ StartMoveOutDialog: ({ open }: { open: boolean }): ReactNode => (open ? <p>Start form</p> : null) }));
vi.mock('./noc-view-dialog', () => ({ NocViewDialog: (): ReactNode => null }));
vi.mock('@/hooks/use-move-outs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-move-outs')>()),
  useMoveOuts: (filters: Record<string, unknown>) => mocks.moveOuts(filters),
  useIssueNoc: () => ({ mutate: mocks.issue, isPending: false }),
  useMarkSubmitted: () => ({ mutate: mocks.submit, isPending: false }),
  useCompleteMoveOut: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelMoveOut: () => ({ mutate: vi.fn(), isPending: false }),
  useResendNoc: () => ({ mutate: vi.fn(), isPending: false }),
}));

const ROW: MoveOut = {
  exit_id: 'e-1', unit_id: 'u-1', block: 'B', unit_number: '204', member_id: 'm-1', name: 'Test Tenant', member_type: 'tenant',
  exit_date: '2026-11-15', initiated_by: 'admin', initiated_by_name: 'Test Secretary', initiated_on: '2026-10-20T05:00:00.000Z',
  status: 'noc_initiated', approved: true, dues: '1500.00', dues_at_noc: null, checklist_done: 1, checklist_total: 2,
  noc_sent_at: null, noc_submitted_at: null,
};

const rows = (list: MoveOut[]) => mocks.moveOuts.mockReturnValue({ data: { data: list, total: list.length }, isLoading: false });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'community_admin';
  rows([ROW]);
});

describe('NOC lists', () => {
  it('asks for its own state and shows the screen’s columns', () => {
    render(<NocContent state="initiated" />);
    expect(mocks.moveOuts).toHaveBeenCalledWith(expect.objectContaining({ state: 'initiated', page: 1, limit: 25 }));
    const table = screen.getByRole('table', { name: 'NOC Initiated' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No', 'Unit', 'Name', 'Owner/Tenant', 'Exit Date', 'Initiated By', 'Initiated On', 'Dues', 'Checklist', 'Status', 'Action', '', '',
    ]);
    expect(within(table).getByText('B-204')).toBeTruthy();
    expect(within(table).getByText('1 of 2')).toBeTruthy();
  });

  it('offers Issue NOC only once the move-out is approved', () => {
    rows([{ ...ROW, approved: false }]);
    render(<NocContent state="initiated" />);
    expect(screen.queryByRole('button', { name: 'Issue NOC' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('shows the dues gate: the amount, and the community admin’s reason to issue anyway', () => {
    mocks.issue.mockImplementationOnce((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(409, { statusCode: 409, error: 'Conflict', request_id: 'r', timestamp: '', message: 'Dues', code: 'dues_outstanding', details: { dues: '1500.00' } })),
    );
    render(<NocContent state="initiated" />);
    fireEvent.click(screen.getByRole('button', { name: 'Issue NOC' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Issue NOC' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('₹1,500.00');

    const issueAnyway = within(screen.getByRole('dialog')).getByRole('button', { name: 'Issue with dues' }) as HTMLButtonElement;
    expect(issueAnyway.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Reason for issuing with dues'), { target: { value: 'Owner settles at the sale' } });
    fireEvent.click(issueAnyway);
    expect(mocks.issue).toHaveBeenLastCalledWith({ exitId: 'e-1', override_reason: 'Owner settles at the sale' }, expect.anything());
  });

  it('a committee member is told only a community admin can issue with dues open', () => {
    mocks.role = 'committee_member';
    mocks.issue.mockImplementationOnce((_input: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(new ApiError(409, { statusCode: 409, error: 'Conflict', request_id: 'r', timestamp: '', message: 'Dues', code: 'dues_outstanding', details: { dues: '10.00' } })),
    );
    render(<NocContent state="initiated" />);
    fireEvent.click(screen.getByRole('button', { name: 'Issue NOC' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Issue NOC' }));
    expect(screen.getByRole('alert').textContent).toContain('Only a community admin');
    expect(screen.queryByLabelText('Reason for issuing with dues')).toBeNull();
  });

  it('NOC Sent offers Resend, Mark Submitted and the NOC; NOC Submitted offers Complete Move-Out', () => {
    rows([{ ...ROW, status: 'noc_sent', noc_sent_at: '2026-10-21T05:00:00.000Z' }]);
    const { unmount } = render(<NocContent state="sent" />);
    for (const name of ['View', 'Resend NOC', 'Mark Submitted', 'NOC']) expect(screen.getByRole('button', { name })).toBeTruthy();
    unmount();
    rows([{ ...ROW, status: 'noc_submitted' }]);
    render(<NocContent state="submitted" />);
    expect(screen.getByRole('button', { name: 'Complete Move-Out' })).toBeTruthy();
  });

  it('Start Move-Out opens the form; an older API says not available', () => {
    render(<NocContent state="initiated" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Move-Out' }));
    expect(screen.getByText('Start form')).toBeTruthy();
    mocks.moveOuts.mockReturnValue({ data: null, isLoading: false });
    render(<NocContent state="sent" />);
    expect(screen.getByText('This list is not available yet on this server.')).toBeTruthy();
  });

  it('checks the Start Move-Out form: unit, member and an exit date at most 30 days back', () => {
    const now = new Date('2026-10-20T06:00:00Z');
    const base = { unitId: 'u-1', memberId: 'm-1', memberType: 'tenant' as const, exitDate: '2026-10-20', reason: '' };
    expect(startMoveOutError(base, now)).toBeNull();
    expect(startMoveOutError({ ...base, unitId: '' }, now)).toBe('Choose the unit.');
    expect(startMoveOutError({ ...base, exitDate: '2026-09-19' }, now)).toBe('The exit date can be at most 30 days back.');
    expect(startMoveOutError({ ...base, exitDate: '2026-09-20' }, now)).toBeNull();
  });
});
