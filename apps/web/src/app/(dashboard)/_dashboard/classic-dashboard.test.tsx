import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSummary } from '@/hooks/use-analytics';
import { ClassicDashboard } from './classic-dashboard';

/**
 * DASH-08 — the classic dashboard: module cards in bands, counts on the
 * buttons, cards hidden by feature and by role. One request
 * (`/analytics/dashboard-summary`) supplies every figure.
 */

const mocks = vi.hoisted(() => ({
  summary: null as unknown,
  status: 'success' as 'pending' | 'error' | 'success',
  refetch: vi.fn(),
  features: undefined as string[] | undefined,
  role: 'community_admin',
}));

vi.mock('@/hooks', () => ({
  useDashboardSummary: () => ({
    data: mocks.status === 'success' ? mocks.summary : undefined,
    isLoading: mocks.status === 'pending',
    isError: mocks.status === 'error',
    refetch: mocks.refetch,
  }),
  useEnabledFeatures: () => ({ data: mocks.features }),
}));

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  getUser: () => ({ isSuperAdmin: false, societies: [{ id: 'society-1', role: mocks.role }] }),
  getCurrentTenant: () => 'society-1',
}));

vi.mock('recharts', () => {
  const Nothing = (): null => null;
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="donut">{children}</div>,
    Pie: Nothing,
    Cell: Nothing,
  };
});

const SUMMARY: DashboardSummary = {
  period: { fy_id: 'fy-1', label: '2026 to 2027', start_date: '2026-04-01', end_date: '2027-03-31' },
  units: { total: 40, occupied: 30 },
  users: { members: 71, admins: 5, never_logged_in: null },
  helpdesk: { open: 4, overdue: 1 },
  latest_updates: [
    { id: 'a-1', title: 'Water tank cleaning on Sunday', published_at: '2026-10-15T10:00:00.000Z' },
    { id: 'a-2', title: 'Diwali celebrations', published_at: '2026-10-10T10:00:00.000Z' },
  ],
  income: { collected: '5000.00', outstanding: '1500.00', defaulters: 12, paid_intimations: null },
  expense: { total: '3000.00', open_purchase_requests: 3, variance: null },
  bank: {
    total: '15250.00',
    accounts: [
      { id: 'b-1', name: 'Test Bank (…1111)', balance: '1000.00' },
      { id: 'b-2', name: 'Other Bank (…2222)', balance: '2000.00' },
    ],
    more: 2,
  },
  utility: { pending_bills: 6, billed_amount: '400.00' },
  gate: { visitors_today: 17, staff_today: 6, open_overstays: 2 },
};

function link(name: string | RegExp): HTMLAnchorElement {
  return screen.getByRole('link', { name }) as HTMLAnchorElement;
}

function card(title: string): HTMLElement {
  return screen.getByRole('heading', { name: title }).closest('[data-dash-card]') as HTMLElement;
}

describe('ClassicDashboard', () => {
  beforeEach(() => {
    mocks.summary = SUMMARY;
    mocks.status = 'success';
    mocks.features = undefined;
    mocks.role = 'community_admin';
    mocks.refetch.mockClear();
  });

  it('lays the bands out in order', () => {
    render(<ClassicDashboard />);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(['Send now', 'Summary', 'ACCOUNTING', 'GATE & VISITORS', 'MANAGEMENT']);
  });

  it('puts the accounting cards in order under the period label', () => {
    render(<ClassicDashboard />);

    expect(screen.getByText('2026 to 2027')).toBeTruthy();
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
      .filter((text) =>
        ['Income Tracker', 'Expense Tracker', 'Bank & Cash', 'General Ledger', 'Utility Tracker'].includes(text ?? ''),
      );

    expect(titles).toEqual(['Income Tracker', 'Expense Tracker', 'Bank & Cash', 'General Ledger', 'Utility Tracker']);
  });

  it('shows the defaulter count on a button that opens the Defaulters list', () => {
    render(<ClassicDashboard />);

    expect(link('12 Defaulters').getAttribute('href')).toBe('/invoices?filter=defaulters');
  });

  it('still shows a zero count as a count', () => {
    mocks.summary = {
      ...SUMMARY,
      income: { collected: '0.00', outstanding: '0.00', defaulters: 0, paid_intimations: null },
      expense: { total: '0.00', open_purchase_requests: 0, variance: null },
    };
    render(<ClassicDashboard />);

    expect(link('0 Defaulters')).toBeTruthy();
    expect(link('0 Open Purchase Requests')).toBeTruthy();
  });

  it('labels the figures and links the actions', () => {
    render(<ClassicDashboard />);

    expect(within(card('Units & Users')).getByText(/Units: 40/).textContent).toContain('30 occupied');
    expect(within(card('Units & Users')).getByText(/Users: 71/)).toBeTruthy();
    expect(link('5 Admins').getAttribute('href')).toBe('/settings');
    expect(within(card('HelpDesk Tracker')).getByText(/Open Requests: 4/)).toBeTruthy();
    expect(within(card('HelpDesk Tracker')).getByText(/1 overdue/)).toBeTruthy();
    expect(link('HelpDesk Tracker').getAttribute('href')).toBe('/helpdesk/open');
    expect(link('Create New Request').getAttribute('href')).toBe('/helpdesk/new');
    expect(link('3 Open Purchase Requests').getAttribute('href')).toBe('/purchases');
    expect(link('Trial Balance').getAttribute('href')).toBe('/reports?report=trial-balance');
    expect(link('Financial Statements').getAttribute('href')).toBe('/reports?report=balance-sheet');
  });

  it('shows collected and outstanding with a donut, and the expense figure', () => {
    render(<ClassicDashboard />);

    const income = card('Income Tracker');
    expect(income.textContent).toContain('₹5,000');
    expect(income.textContent).toContain('₹1,500');
    expect(within(income).getByTestId('donut')).toBeTruthy();
    expect(card('Expense Tracker').textContent).toContain('₹3,000');
  });

  it('lists the bank rows and counts the rest', () => {
    render(<ClassicDashboard />);

    const bank = card('Bank & Cash');
    expect(bank.textContent).toContain('₹15,250');
    expect(bank.textContent).toContain('Test Bank (…1111) — ₹1,000');
    expect(bank.textContent).toContain('+2 more');
  });

  it('lists the latest updates with a View all link', () => {
    render(<ClassicDashboard />);

    expect(screen.getByText('Water tank cleaning on Sunday')).toBeTruthy();
    expect(screen.getByText('Diwali celebrations')).toBeTruthy();
    expect(link('View all').getAttribute('href')).toBe('/announcements');
  });

  it('shows the gate figures', () => {
    render(<ClassicDashboard />);

    const gate = card('Gate & Visitors');
    expect(gate.textContent).toContain('Visitors today: 17');
    expect(gate.textContent).toContain('Staff entries today: 6');
    expect(gate.textContent).toContain('Open overstay alerts: 2');
  });

  it('puts the management buttons and tiles in the last band', () => {
    render(<ClassicDashboard />);

    expect(link('Book Facilities').getAttribute('href')).toBe('/amenities?new=1');
    expect(link('Create Meeting').getAttribute('href')).toBe('/governance?new=1');
    expect(link('Create Announcement').getAttribute('href')).toBe('/announcements?new=1');
    expect(link('Vendor Master').getAttribute('href')).toBe('/vendors');
    expect(link('Admin Files').getAttribute('href')).toBe('/documents');
    expect(link('Society Profile').getAttribute('href')).toBe('/settings');
  });

  it('sends a notification or an announcement from the send-now row', () => {
    render(<ClassicDashboard />);

    const sendNow = screen.getByRole('heading', { name: 'Send now' }).closest('section') as HTMLElement;
    const sends = within(sendNow).getAllByRole('link', { name: 'Send' });

    expect(sends.map((send) => send.getAttribute('href'))).toEqual(['/notifications', '/announcements?new=1']);
    expect(within(sendNow).queryByText('SMS')).toBeNull();
  });

  it('leaves out tiles whose screen does not exist yet', () => {
    render(<ClassicDashboard />);

    expect(screen.queryByText('Admin Reports')).toBeNull();
    expect(screen.queryByText(/Paid Intimations/)).toBeNull();
    expect(screen.queryByText(/Never Logged In/)).toBeNull();
    expect(screen.queryByText(/Variance/)).toBeNull();
  });

  it('has no Utility Tracker card when the utilities feature is off', () => {
    mocks.features = ['units', 'tickets', 'invoices', 'purchases', 'bank', 'reports', 'gate', 'announcements', 'amenities', 'vendors', 'documents'];
    render(<ClassicDashboard />);

    expect(screen.queryByRole('heading', { name: 'Utility Tracker' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Bank & Cash' })).toBeTruthy();
  });

  it('has no gate band when the gate feature is off', () => {
    mocks.features = ['units', 'tickets', 'invoices', 'announcements'];
    render(<ClassicDashboard />);

    expect(screen.queryByRole('heading', { name: 'GATE & VISITORS' })).toBeNull();
  });

  it('has no announcement tiles, buttons or updates when announcements are off', () => {
    mocks.features = ['units', 'tickets', 'invoices'];
    render(<ClassicDashboard />);

    expect(screen.queryByRole('heading', { name: 'Latest Updates' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Create Announcement' })).toBeNull();
    expect(screen.queryByText('Post Announcement')).toBeNull();
  });

  it('does not render the accounting band for another admin role, but keeps the operational cards', () => {
    mocks.role = 'moderator';
    render(<ClassicDashboard />);

    expect(screen.queryByRole('heading', { name: 'ACCOUNTING' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Income Tracker' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Units & Users' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'GATE & VISITORS' })).toBeTruthy();
  });

  it('shows a supervisor only the cards whose screens their menu allows', () => {
    mocks.role = 'security_supervisor';
    render(<ClassicDashboard />);

    expect(screen.getByRole('heading', { name: 'GATE & VISITORS' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Book Facilities' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Vendor Master' })).toBeNull();
  });

  it.each(['community_admin', 'committee_member', 'accountant', 'auditor'])('renders the accounting band for %s', (role) => {
    mocks.role = role;
    render(<ClassicDashboard />);

    expect(screen.getByRole('heading', { name: 'ACCOUNTING' })).toBeTruthy();
  });

  it('shows a dash for a section the API could not compute', () => {
    mocks.summary = { ...SUMMARY, units: null, gate: null, utility: null };
    render(<ClassicDashboard />);

    expect(card('Units & Users').textContent).toContain('—');
    expect(card('Gate & Visitors').textContent).toContain('—');
    expect(card('Utility Tracker').textContent).toContain('—');
    expect(card('Income Tracker').textContent).toContain('₹5,000');
  });

  it('says so when no financial year is set up', () => {
    mocks.summary = { ...SUMMARY, period: null, income: { ...SUMMARY.income!, collected: null } };
    render(<ClassicDashboard />);

    expect(screen.getByText('No financial year is set up')).toBeTruthy();
    expect(link('Settings › Financial Years').getAttribute('href')).toBe('/settings');
  });

  it('shows "Could not load" on every card and one Retry when the request fails', () => {
    mocks.status = 'error';
    render(<ClassicDashboard />);

    expect(screen.getAllByText('Could not load').length).toBeGreaterThanOrEqual(8);
    const retry = screen.getAllByRole('button', { name: 'Retry' });
    expect(retry).toHaveLength(1);
    fireEvent.click(retry[0]);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('ends with a Top link', () => {
    render(<ClassicDashboard />);

    expect(screen.getByRole('button', { name: 'Top' })).toBeTruthy();
  });
});
