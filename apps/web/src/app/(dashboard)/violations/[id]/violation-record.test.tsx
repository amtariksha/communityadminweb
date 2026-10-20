import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViolationDetail } from '@/hooks/use-violation-register';
import { creditNoteNotice } from './close-dialog';
import { ViolationRecord } from './violation-record';

/** RULE-05 — the violation record (RULE-S8): the actions its status allows. */

const state = vi.hoisted(() => ({ violation: null as ViolationDetail | null, role: 'community_admin' }));

vi.mock('next/navigation', () => ({ usePathname: () => '/violations/vio-1', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => state.role }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/hooks/use-documents', () => ({ fetchPresignedDownloadUrl: vi.fn() }));
vi.mock('@/hooks/use-violation-register', () => {
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useViolation: () => ({ data: state.violation, isLoading: false, error: null }),
    useApproveViolation: mutation,
    useRejectViolation: mutation,
    useMoveToPenalty: mutation,
    useCloseViolation: mutation,
  };
});

function detail(extra: Partial<ViolationDetail>): ViolationDetail {
  return {
    id: 'vio-1',
    violation_number: 'VIO-0001',
    category_id: 'cat-1',
    category_title: 'Gate Entry',
    category_description: null,
    unit_id: 'unit-1',
    unit_number: '101',
    block: 'A',
    description: 'Visitor car in the fire lane.',
    requested_stage: 'warning',
    status: 'awaiting_approval',
    attachment_urls: [],
    attachment_names: [],
    penalty_amount: '1000.00',
    apply_gst: true,
    gst_amount: null,
    warning_ends_on: null,
    days_left: null,
    warning_period_over: false,
    penalty_due_on: null,
    invoice_id: null,
    invoice_number: null,
    balance_due: null,
    approval_request_id: 'req-1',
    current_level: 1,
    raised_by: 'user-1',
    raised_by_name: 'Asha Menon',
    closed_at: null,
    close_outcome: null,
    close_note: null,
    created_at: '2026-10-01T05:00:00Z',
    can_act: false,
    events: [{ id: 'e1', event: 'raised', from_status: null, to_status: 'awaiting_approval', actor_name: 'Asha Menon', note: null, created_at: '2026-10-01T05:00:00Z' }],
    steps: [{ level: 1, approver_user_id: 'user-2', approver_name: 'Ravi Shah', decision: 'pending', decided_by_name: null, decided_at: null, comments: null }],
    ...extra,
  };
}

const button = (name: string) => screen.queryByRole('button', { name });

beforeEach(() => {
  state.role = 'community_admin';
});

describe('Violation record', () => {
  it('offers Approve and Reject only to a current-level approver', () => {
    state.violation = detail({ can_act: false });
    const { unmount } = render(<ViolationRecord id="vio-1" />);
    expect(button('Approve')).toBeNull();
    expect(screen.getByText('Ravi Shah')).toBeTruthy();
    unmount();

    state.violation = detail({ can_act: true });
    render(<ViolationRecord id="vio-1" />);
    expect(button('Approve')).toBeTruthy();
    expect(button('Reject')).toBeTruthy();
    expect(button('Move to Penalty')).toBeNull();
  });

  it('offers Move to Penalty and Close on a warning to the community admin only', () => {
    state.violation = detail({ status: 'warning' });
    const { unmount } = render(<ViolationRecord id="vio-1" />);
    expect(button('Move to Penalty')).toBeTruthy();
    expect(button('Close Violation')).toBeTruthy();
    unmount();

    state.role = 'committee_member';
    render(<ViolationRecord id="vio-1" />);
    expect(button('Move to Penalty')).toBeNull();
    expect(button('Close Violation')).toBeNull();
  });

  it('closes a penalty as Paid, Waived or Withdrawn', () => {
    state.violation = detail({ status: 'penalty', balance_due: '1180.00', invoice_number: 'INV-0009', invoice_id: 'inv-9' });
    render(<ViolationRecord id="vio-1" />);
    expect(button('Move to Penalty')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close Violation' }));

    expect(screen.getAllByRole('radio').map((radio) => radio.parentElement?.textContent)).toEqual(['Paid', 'Waived', 'Withdrawn']);
    fireEvent.click(screen.getByLabelText('Waived'));
    expect(screen.getByRole('note').textContent).toMatch(/credit note of ₹1,180.00/);
  });

  it('shows a closed violation without actions', () => {
    state.violation = detail({ status: 'closed', close_outcome: 'complied', closed_at: '2026-10-10T05:00:00Z' });
    render(<ViolationRecord id="vio-1" />);

    expect(button('Approve')).toBeNull();
    expect(button('Close Violation')).toBeNull();
    expect(screen.getByText(/Complied/)).toBeTruthy();
  });
});

describe('creditNoteNotice', () => {
  it('explains the credit note only for a waived or withdrawn penalty with a balance', () => {
    expect(creditNoteNotice('penalty', 'waived', '1180.00')).toMatch(/credit note/);
    expect(creditNoteNotice('penalty', 'paid', '1180.00')).toBeNull();
    expect(creditNoteNotice('penalty', 'withdrawn', '0.00')).toBeNull();
    expect(creditNoteNotice('warning', 'withdrawn', null)).toBeNull();
  });
});
