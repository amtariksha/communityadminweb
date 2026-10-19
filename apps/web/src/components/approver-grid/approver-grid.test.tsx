import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApproverGrid } from '@/hooks/use-approver-grid';
import { ApproverGridEditor } from './approver-grid';

/** SB-11 — people down the side, No Access / Level 1–3 across, minimum per level, one Save Changes. */

const mocks = vi.hoisted(() => ({
  grid: undefined as ApproverGrid | null | undefined,
  save: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-approver-grid', () => ({
  useApproverGrid: () => ({ isLoading: false, isError: false, data: mocks.grid }),
  useSaveApproverGrid: () => ({ mutate: mocks.save, isPending: false }),
}));

const GRID: ApproverGrid = {
  request_type: 'purchase_request',
  configured: true,
  people: [
    { user_id: 'u-anil', name: 'Anil Kumar', roles: ['committee_member'], level: 1 },
    { user_id: 'u-bina', name: 'Bina Rao', roles: ['accountant'], level: 0 },
  ],
  levels: [
    { level: 1, min_approvals: 1, approver_count: 1 },
    { level: 2, min_approvals: 1, approver_count: 0 },
    { level: 3, min_approvals: 1, approver_count: 0 },
  ],
};

afterEach(() => vi.clearAllMocks());

describe('ApproverGridEditor', () => {
  it('saves every person’s level and every level’s minimum in one request', () => {
    mocks.grid = GRID;
    render(<ApproverGridEditor type="purchase_request" peopleHeader="Purchase Request Approvers" canEdit />);

    fireEvent.click(screen.getByLabelText('Bina Rao: Level 1'));
    fireEvent.change(screen.getByLabelText('Level 1 minimum approvals'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0][0]).toEqual({
      people: [
        { user_id: 'u-anil', level: 1 },
        { user_id: 'u-bina', level: 1 },
      ],
      levels: [
        { level: 1, min_approvals: 2 },
        { level: 2, min_approvals: 1 },
        { level: 3, min_approvals: 1 },
      ],
    });
  });

  it('refuses a minimum above the approvers on the level', () => {
    mocks.grid = GRID;
    render(<ApproverGridEditor type="purchase_request" peopleHeader="Approvers" canEdit />);

    fireEvent.change(screen.getByLabelText('Level 1 minimum approvals'), { target: { value: '3' } });

    expect(screen.getByRole('alert').textContent).toBe('Level 1 needs 3 approvals but has 1 approvers');
    expect((screen.getByRole('button', { name: 'Save Changes' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('is read-only without the right to edit', () => {
    mocks.grid = GRID;
    render(<ApproverGridEditor type="purchase_request" peopleHeader="Approvers" canEdit={false} />);

    expect((screen.getByLabelText('Anil Kumar: Level 2') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });

  it('says so before the API has the grid, and when nobody holds an office', () => {
    mocks.grid = null;
    const { unmount } = render(<ApproverGridEditor type="purchase_request" peopleHeader="Approvers" canEdit />);
    expect(screen.getByText('Approver levels are not available yet.')).toBeTruthy();
    unmount();

    mocks.grid = { ...GRID, people: [] };
    render(<ApproverGridEditor type="purchase_request" peopleHeader="Approvers" canEdit />);
    expect(screen.getByText('Add committee or office users in Units & Users first.')).toBeTruthy();
  });
});
