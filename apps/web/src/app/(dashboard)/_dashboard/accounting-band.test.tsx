import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { ClassicDashboard } from './classic-dashboard';
import { defaultYear, yearLabel } from './fy-selector';

// DASH-09: the ACCOUNTING band's financial-year selector.

const nav = vi.hoisted(() => ({ query: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
vi.mock('recharts', () => {
  const Nothing = (): null => null;
  const Pass = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return { ResponsiveContainer: Pass, PieChart: Pass, Pie: Nothing, Cell: Nothing };
});

const SOCIETY = 'society-1';
const YEARS = [
  { id: 'fy-26', label: 'FY 2026-27', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, is_frozen: false, tenant_id: SOCIETY },
  { id: 'fy-25', label: 'FY 2025-26', start_date: '2025-03-31T18:30:00.000Z', end_date: '2026-03-30T18:30:00.000Z', is_current: false, is_frozen: true, tenant_id: SOCIETY },
];
const summary = (fyId: string, label: string, collected: string) => ({
  period: { fy_id: fyId, label, start_date: '2026-04-01', end_date: '2027-03-31' },
  units: { total: 40, occupied: 30 },
  users: { members: 71, admins: 5, never_logged_in: null },
  helpdesk: { open: 4, overdue: 1 },
  latest_updates: [],
  income: { collected, outstanding: '1500.00', defaulters: 2, paid_intimations: null },
  expense: { total: '3000.00', open_purchase_requests: 3, variance: null },
  bank: { total: '15250.00', accounts: [], more: 0 },
  utility: { pending_bills: 6, billed_amount: '400.00' },
  gate: { visitors_today: 17, staff_today: 6, open_overstays: 2 },
});

const get = vi.mocked(api.get);

beforeEach(() => {
  nav.query = '';
  localStorage.setItem('communityos_tenant', SOCIETY);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'u1', name: 'A', phone: '+910000000010', isSuperAdmin: false, role: 'community_admin', societies: [{ id: SOCIETY, name: 'S', role: 'community_admin' }] }),
  );
  get.mockImplementation(async (path: string, options?: { params?: Record<string, string> }) => {
    if (path === '/ledger/financial-years') return { data: YEARS };
    if (path === '/tenants/features') return { data: ['invoices', 'purchases', 'bank', 'reports', 'utilities', 'accounts'] };
    if (path === '/analytics/dashboard-summary') {
      return options?.params?.fy_id === 'fy-25'
        ? { data: summary('fy-25', '2025 to 2026', '9000.00') }
        : { data: summary('fy-26', '2026 to 2027', '5000.00') };
    }
    return { data: [] };
  });
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderDashboard() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ClassicDashboard />
    </QueryClientProvider>,
  );
}

const summaryCalls = () => get.mock.calls.filter(([path]) => path === '/analytics/dashboard-summary');

describe('ACCOUNTING band year', () => {
  it('lists the society’s years as "2026 to 2027", the current one chosen', async () => {
    renderDashboard();
    const select = (await screen.findByLabelText('Financial year')) as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual(['2026 to 2027', '2025 to 2026']);
    expect(select.value).toBe('fy-26');
    expect(summaryCalls()[0][1]).toBeUndefined();
  });

  it('puts a chosen year in the URL', async () => {
    renderDashboard();
    fireEvent.change(await screen.findByLabelText('Financial year'), { target: { value: 'fy-25' } });
    expect(nav.replace).toHaveBeenCalledWith('/?fy=fy-25', { scroll: false });
  });

  it('fetches the figures for the year in the URL', async () => {
    nav.query = 'fy=fy-25';
    renderDashboard();
    await waitFor(() => expect(summaryCalls()[0][1]).toEqual({ params: { fy_id: 'fy-25' } }));
    expect(((await screen.findByLabelText('Financial year')) as HTMLSelectElement).value).toBe('fy-25');
    expect(await screen.findByText(/₹9,000/)).toBeTruthy();
  });
});

describe('year helpers', () => {
  it('labels by start and end year and falls back to today’s April–March year', () => {
    expect(yearLabel(YEARS[1])).toBe('2025 to 2026');
    expect(defaultYear(YEARS)?.id).toBe('fy-26');
    expect(defaultYear([{ ...YEARS[0], is_current: false }, YEARS[1]])?.id).toBe('fy-26');
  });
});
