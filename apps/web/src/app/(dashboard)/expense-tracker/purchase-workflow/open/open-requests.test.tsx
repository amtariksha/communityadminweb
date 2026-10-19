import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as baseRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PRListFilters, PRListResponse } from '@/hooks/use-purchase-requests';
import { currentMonthRange } from '../closed/closed-requests';
import { OpenRequests, shownLevels } from './open-requests';

/** EXP-09 / EXP-S4 — stacked buckets with counts; level buckets where the grid has approvers. */

const render = (ui: ReactElement) => baseRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const COUNTS = { drafts: 1, mine: 2, level_1: 3, level_2: 0, level_3: 0, open: 3, closed: 4 };
const ROW = {
  id: 'pr-1',
  pr_number: 'PR-00007',
  title: 'Pump repair',
  status: 'pending_approval',
  estimated_amount: '2360.00',
  vendor_id: 'v-1',
  vendor_name: 'Mumbai Pumps',
  requested_by: 'someone',
  requested_by_name: 'Asha',
  request_date: '2026-10-05',
  created_at: '2026-10-05T05:00:00Z',
  approved_at: null,
  current_level: 1,
  approvals_needed: 1,
  voted_by_me: true,
  expense_category_name: 'Repairs',
  extra_heads_count: 1,
};

const mocks = vi.hoisted(() => ({ calls: [] as PRListFilters[], available: true }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/auth', () => ({ getUser: () => ({ id: 'me' }) }));
vi.mock('@/hooks/use-purchases', () => ({
  useApprovePR: () => ({ mutate: vi.fn() }),
  useRejectPR: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/use-approver-grid', () => ({
  useApproverGrid: () => ({ data: { levels: [{ level: 1, approver_count: 2 }, { level: 2, approver_count: 0 }, { level: 3, approver_count: 0 }] } }),
}));
vi.mock('@/hooks/use-purchase-requests', async (original) => ({
  ...(await original<typeof import('@/hooks/use-purchase-requests')>()),
  useSubmitPurchaseRequest: () => ({ mutate: vi.fn() }),
  useWithdrawPurchaseRequest: () => ({ mutate: vi.fn() }),
  usePurchaseRequestList: (filters: PRListFilters) => {
    mocks.calls.push(filters);
    if (!mocks.available) return { isLoading: false, data: null };
    const data: PRListResponse = { data: filters.bucket === 'level' ? [ROW] : [], total: filters.bucket === 'level' ? 1 : 0, counts: COUNTS };
    return { isLoading: false, data };
  },
}));

afterEach(() => {
  mocks.calls = [];
  mocks.available = true;
});

describe('Open Purchase Request', () => {
  it('stacks Drafts, My approval required and Level 1 with their counts', () => {
    render(<OpenRequests />);

    expect(screen.getByRole('heading', { name: 'Drafts (1)' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'My approval required (2)' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'All open purchase requests — Level 1 (3)' })).toBeTruthy();
    expect(screen.queryByText(/Level 2/)).toBeNull();
    expect(mocks.calls).toContainEqual(expect.objectContaining({ bucket: 'level', level: 1 }));
  });

  it('shows Approvals Needed, Voted and the head with "+n"; empty buckets say so', () => {
    render(<OpenRequests />);

    const level = within(screen.getByRole('region', { name: 'All open purchase requests — Level 1' }));
    expect(level.getByText('Repairs +1')).toBeTruthy();
    expect(level.getByText('Yes')).toBeTruthy();
    expect(level.getByText('₹2,360.00')).toBeTruthy();
    const drafts = within(screen.getByRole('region', { name: 'Drafts' }));
    expect(drafts.getByText('No matching rows')).toBeTruthy();
  });

  it('says the lists are not available before the API has buckets', () => {
    mocks.available = false;
    render(<OpenRequests />);
    expect(screen.getByText('Purchase request lists are not available yet.')).toBeTruthy();
  });

  it('shows a level bucket that holds requests even when the grid has nobody there', () => {
    expect(shownLevels(undefined, { ...COUNTS, level_2: 1 })).toEqual([1, 2]);
  });

  it('Closed defaults to the current month in India', () => {
    expect(currentMonthRange(new Date('2026-10-31T20:00:00Z'))).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(currentMonthRange(new Date('2026-02-10T00:00:00Z'))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});
