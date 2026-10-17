import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApprovalsContent from './approvals-content';

/**
 * UNIT-02 — the approvals queue could not filter, and did not name, three
 * request types the app produces: resident self-signup, agreement renewal
 * and the older join-unit request.
 */

function approval(id: string, requestType: string) {
  return {
    id,
    request_type: requestType,
    entity_summary: `Summary ${id}`,
    requester_name: 'Test Resident',
    approval_level: 1,
    max_levels: 2,
    status: 'pending',
    created_at: '2026-10-01T09:00:00Z',
  };
}

const mocks = vi.hoisted(() => ({
  useApprovalRequests: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useApprovalRequests: (filters: Record<string, unknown>) => mocks.useApprovalRequests(filters),
  useApprovalDetail: () => ({ data: undefined }),
  useMyPendingCount: () => ({ data: { count: 3 }, isLoading: false }),
  useApproveRequest: () => ({ mutate: vi.fn() }),
  useRejectRequest: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/ui/export-button', () => ({ ExportButton: () => null }));
vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

describe('ApprovalsContent request types', () => {
  beforeEach(() => {
    mocks.useApprovalRequests.mockReset();
    mocks.useApprovalRequests.mockReturnValue({
      data: {
        data: [
          approval('a1', 'tenant_self_onboard'),
          approval('a2', 'agreement_renewal'),
          approval('a3', 'join_request'),
        ],
        total: 3,
      },
      isLoading: false,
    });
  });

  it('offers the three types in the Type filter', () => {
    render(<ApprovalsContent />);

    const filter = screen.getByLabelText('Type') as HTMLSelectElement;
    // The app's Select keeps a visually hidden native <select> in sync.
    const labels = Array.from(filter.querySelectorAll('option')).map(
      (option) => option.textContent,
    );

    expect(labels).toEqual(
      expect.arrayContaining(['Resident Self-Signup', 'Agreement Renewal', 'Join Unit Request']),
    );
  });

  it('asks the server for self-signups only when that type is chosen', () => {
    render(<ApprovalsContent />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'tenant_self_onboard' } });

    expect(mocks.useApprovalRequests).toHaveBeenLastCalledWith(
      expect.objectContaining({ request_type: 'tenant_self_onboard', page: 1 }),
    );
  });

  it('names each of the three types in the table instead of the raw code', () => {
    render(<ApprovalsContent />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Resident Self-Signup')).toBeTruthy();
    expect(within(table).getByText('Agreement Renewal')).toBeTruthy();
    expect(within(table).getByText('Join Unit Request')).toBeTruthy();
    expect(within(table).queryByText('Tenant Self Onboard')).toBeNull();
  });
});
