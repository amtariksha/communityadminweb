import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleFrame } from '@/components/layout/classic/module-frame';
import { classicMenu } from '@/components/layout/menu/classic-menu';
import { visibleMenu } from '@/components/layout/menu/menu-access';
import type { Violation, ViolationFilters } from '@/hooks/use-violation-register';
import { AwaitingApprovalPage } from '../_parts/list-pages';

/** RULE-05 — the classic menu of the module and the Open Violations lists. */

const state = vi.hoisted(() => ({ rows: [] as Violation[], filters: [] as ViolationFilters[], pathname: '/violations/open/awaiting-approval' }));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/components/show-logs', () => ({ ShowLogsButton: (): ReactNode => <button type="button">Show Logs</button> }));
vi.mock('@/hooks/use-units', () => ({ useBlocks: () => ({ data: [] }) }));
vi.mock('@/hooks/use-violations', () => ({ useViolationCategories: () => ({ data: { data: [], total: 0 } }) }));
vi.mock('@/hooks/use-violation-register', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-violation-register')>();
  const mutation = () => ({ mutate: vi.fn(), isPending: false });
  return {
    ...actual,
    useViolations: (filters: ViolationFilters) => {
      state.filters.push(filters);
      return { data: { data: state.rows, total: state.rows.length, counts: {} }, isLoading: false, error: null, refetch: vi.fn() };
    },
    useApproveViolation: mutation,
    useRejectViolation: mutation,
  };
});

function violation(number: string, canAct: boolean): Violation {
  return {
    id: `id-${number}`,
    violation_number: number,
    category_id: 'cat-1',
    category_title: 'Gate Entry',
    unit_id: 'unit-1',
    unit_number: '101',
    block: 'A',
    description: 'Visitor car in the fire lane.',
    requested_stage: 'warning',
    status: 'awaiting_approval',
    attachment_urls: [],
    attachment_names: [],
    penalty_amount: '500.00',
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
    can_act: canAct,
  };
}

const menu = visibleMenu(classicMenu, { roleAllowlist: null });

beforeEach(() => {
  state.rows = [];
  state.filters = [];
});

describe('Community Rules & Violations in the classic menu', () => {
  it('has the three children in order, and Open Violations has the three stage tabs', () => {
    const rules = menu.find((node) => node.id === 'rules');

    expect(rules?.children?.map((child) => child.label)).toEqual(['Rules & Violations Set Up', 'Open Violations', 'Closed Violations']);
    expect(rules?.children?.[1].tabs?.map((tab) => tab.label)).toEqual(['Awaiting Approval', 'Warning', 'Penalty']);
    expect(rules?.children?.[0].tabs?.map((tab) => tab.label)).toEqual(['Approvers Set Up', 'Category Set Up']);
  });

  it('offers Create Violation and Show Logs on the Open pages but not on Closed Violations', () => {
    state.pathname = '/violations/open/warning';
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ModuleFrame menu={menu}>body</ModuleFrame>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('link', { name: 'Create Violation' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show Logs' })).toBeTruthy();
    unmount();

    state.pathname = '/violations/closed';
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ModuleFrame menu={menu}>body</ModuleFrame>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('link', { name: 'Create Violation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show Logs' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Close' })).toBeTruthy();
  });
});

describe('Open Violations › Awaiting Approval', () => {
  it('asks the server for the stage and hides Approve / Reject from a viewer with no pending step', () => {
    state.rows = [violation('VIO-0001', false), violation('VIO-0002', false)];
    render(<AwaitingApprovalPage />);

    expect(state.filters.at(-1)?.status).toBe('awaiting_approval');
    expect(screen.getByText('VIO-0001')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject' })).toBeNull();
  });

  it('shows Approve / Reject on the rows the viewer can act on', () => {
    state.rows = [violation('VIO-0001', true), violation('VIO-0002', false)];
    render(<AwaitingApprovalPage />);

    expect(screen.getByRole('columnheader', { name: 'Approve' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
  });

  it('says so when nothing waits', () => {
    render(<AwaitingApprovalPage />);

    expect(screen.getByText('No violations are waiting for approval.')).toBeTruthy();
  });
});
