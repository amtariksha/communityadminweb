import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { earlierApprovalRule, PurchaseApprovalsCard } from './purchase-approvals-card';

/** Settings › Purchase Request Approvals: a pointer to Setup › Purchase Request; the old levels and roles are read-only. */

const mocks = vi.hoisted(() => ({ configured: false }));
vi.mock('@/hooks/use-approver-grid', () => ({
  useApproverGrid: () => ({ data: { configured: mocks.configured, people: [], levels: [] } }),
}));

describe('PurchaseApprovalsCard', () => {
  it('links to Setup › Purchase Request and has no levels or roles to edit', () => {
    render(<PurchaseApprovalsCard settings={{ pr_approval_levels: 2, pr_approval_roles: ['committee_member', 'community_admin'] }} />);
    expect(screen.getByRole('link', { name: 'Expense Tracker › Setup › Purchase Request' }).getAttribute('href')).toBe('/expense-tracker/setup/purchase-request');
    expect(screen.queryByLabelText('Approval Levels')).toBeNull();
    expect(screen.queryByLabelText('Approver Roles')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/requests are approved in 2 levels: Committee Member, then Community Admin/)).toBeTruthy();
  });

  it('says requests need no approval when the earlier setting was 0 levels, and names nobody once approvers are set', () => {
    mocks.configured = false;
    const { unmount } = render(<PurchaseApprovalsCard settings={{ pr_approval_levels: 0 }} />);
    expect(screen.getByText(/approved as soon as they are sent/)).toBeTruthy();
    unmount();
    mocks.configured = true;
    render(<PurchaseApprovalsCard settings={{ pr_approval_levels: 0 }} />);
    expect(screen.getByText('Approvers are named there, so they approve every request.')).toBeTruthy();
  });

  it('reads the API defaults when nothing was saved', () => {
    expect(earlierApprovalRule(undefined)).toEqual({ levels: 1, roles: ['community_admin'] });
  });
});
