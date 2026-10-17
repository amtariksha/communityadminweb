import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KpiBackendData } from '@/hooks/use-kpi-dashboard';
import { KpiDashboardContent } from './kpi-content';

/**
 * DASH-02 — a section the API could not compute arrives as `null`. The page
 * must show "—" for it, never a zero that looks like a measurement.
 */

const mocks = vi.hoisted(() => ({ kpi: null as unknown }));

vi.mock('@/hooks', () => ({
  useKpiDashboardData: () => ({ data: mocks.kpi, isLoading: false, isFetching: false, refetch: vi.fn() }),
  useCountsSummary: () => ({ data: { blocks: [] }, isLoading: false, refetch: vi.fn() }),
  useTicketsSummary: () => ({ data: { categories: [] }, isLoading: false, refetch: vi.fn() }),
  useStatisticsSummary: () => ({ data: { dailyFootfall: [] }, isLoading: false, refetch: vi.fn() }),
}));

vi.mock('recharts', () => {
  const Nothing = (): null => null;
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    BarChart: Nothing,
    Bar: Nothing,
    XAxis: Nothing,
    YAxis: Nothing,
    CartesianGrid: Nothing,
    Tooltip: Nothing,
    Legend: Nothing,
    PieChart: Nothing,
    Pie: Nothing,
    Cell: Nothing,
    LineChart: Nothing,
    Line: Nothing,
  };
});

const FULL_PAYLOAD: KpiBackendData = {
  totalUnits: 40,
  occupiedUnits: 30,
  vacantUnits: 10,
  activeResidents: 70,
  ownersCount: 45,
  tenantsCount: 25,
  totalBilled: 2000,
  totalCollected: 500,
  totalOutstanding: 1500,
  collectionRate: '25%',
  totalTickets: 12,
  openTickets: 4,
  resolvedTickets: 8,
  slaBreaches: 1,
  goldenQueueCount: 0,
  parking: { total_slots: 20, vacant_slots: 5, occupied_slots: 15, ev_slots: 2 },
  assets: { total_assets: 9, active_assets: 8, maintenance_assets: 1 },
  gate: { today_visitors: 17, today_staff_entries: 6, active_overstays: 2 },
  monthlyTrend: [{ month: 'Oct 2026', income: 500, expense: 300 }],
  sos_live: 1,
  kyc_pending: 7,
  bookings_today: 8,
  patrol_rounds_today: 9,
  low_stock_items: 11,
  member_categories: 13,
  journal_entries_month: 14,
};

/** Each of the fourteen hubs with the text its count must show. */
const HUB_COUNTS: Array<[title: string, expected: string]> = [
  ['Units & Flats', '40 '],
  ['Helpdesk SLA', '4 '],
  ['PMS Inventory', '11 '],
  ['Assets & Audits', '9 '],
  ['Invoices & Dues', '₹1,500'],
  ['Collections', '₹500'],
  ['Gate & Visitors', '17 '],
  ['Guard Patrol', '9 '],
  ['Parking & EV', '5 Vacant'],
  ['Amenities', '8 '],
  ['KYC Approvals', '7 '],
  ['Member Categories', '13 '],
  ['SOS Alarms', '1 Live'],
  ['Accounts & GL', '14 '],
];

const FIXED_WORDS = ['Active', 'Bookings', 'Verify', 'Rules', 'Ledger'];

function cardOf(title: string): HTMLElement {
  return screen.getByText(title).closest('.rounded-lg') as HTMLElement;
}

function hubOf(title: string): HTMLElement {
  return screen.getByText(title).closest('a') as HTMLElement;
}

describe('KPI Command Center', () => {
  beforeEach(() => {
    mocks.kpi = FULL_PAYLOAD;
  });

  it('shows the figures the API computed', () => {
    render(<KpiDashboardContent />);

    expect(cardOf('Collection Efficiency').textContent).toContain('25%');
    expect(cardOf('Gate & Security').textContent).toContain('17');
    expect(hubOf('Units & Flats').textContent).toContain('40 Units Total');
  });

  it('shows every hub its own number, never a fixed word', () => {
    render(<KpiDashboardContent />);

    for (const [title, expected] of HUB_COUNTS) {
      const text = hubOf(title).textContent ?? '';
      expect(text, title).toContain(expected);
      for (const word of FIXED_WORDS) expect(text, `${title} shows "${word}"`).not.toContain(word);
    }
  });

  it('reads 1 Live on the SOS hub while an alert is live, and 0 Live when none is', () => {
    render(<KpiDashboardContent />);
    expect(hubOf('SOS Alarms').textContent).toContain('1 Live');
    cleanup();

    mocks.kpi = { ...FULL_PAYLOAD, sos_live: 0 };
    render(<KpiDashboardContent />);
    expect(hubOf('SOS Alarms').textContent).toContain('0 Live');
  });

  it('shows a dash on a hub whose count could not be computed', () => {
    mocks.kpi = { ...FULL_PAYLOAD, sos_live: null, kyc_pending: null };
    render(<KpiDashboardContent />);

    expect(hubOf('SOS Alarms').textContent).toContain('—');
    expect(hubOf('SOS Alarms').textContent).not.toContain('0 Live');
    expect(hubOf('KYC Approvals').textContent).toContain('—');
  });

  it('shows a dash, not zero, for a section that failed', () => {
    mocks.kpi = { ...FULL_PAYLOAD, gate: null, totalBilled: null, totalCollected: null, totalOutstanding: null, collectionRate: null };
    render(<KpiDashboardContent />);

    expect(cardOf('Collection Efficiency').textContent).toContain('—');
    expect(cardOf('Collection Efficiency').textContent).not.toContain('0%');
    expect(cardOf('Gate & Security').textContent).toContain('—');
    expect(cardOf('Gate & Security').textContent).not.toContain('No Overstays');
    expect(hubOf('Gate & Visitors').textContent).toContain('— ');
    expect(hubOf('Collections').textContent).toContain('—');
    expect(hubOf('Invoices & Dues').textContent).toContain('—');
  });

  it('shows a dash for every figure when the whole call returned nothing', () => {
    mocks.kpi = undefined;
    render(<KpiDashboardContent />);

    expect(cardOf('Occupancy Rate').textContent).toContain('—');
    expect(cardOf('Helpdesk Health').textContent).toContain('—');
    expect(hubOf('Units & Flats').textContent).toContain('—');
  });

  it('hides every finance card and tile when the API sent no finance keys (a manager)', () => {
    const {
      totalBilled: _billed,
      totalCollected: _collected,
      totalOutstanding: _outstanding,
      collectionRate: _rate,
      monthlyTrend: _trend,
      journal_entries_month: _entries,
      ...operational
    } = FULL_PAYLOAD;
    mocks.kpi = operational;
    render(<KpiDashboardContent />);

    expect(screen.queryByText('Collection Efficiency')).toBeNull();
    expect(screen.queryByText('Invoices & Dues')).toBeNull();
    expect(screen.queryByText('Collections')).toBeNull();
    expect(screen.queryByText('Accounts & GL')).toBeNull();
    expect(screen.queryByText('Financial Cashflow Trend')).toBeNull();
    expect(cardOf('Occupancy Rate').textContent).toContain('75%');
    expect(cardOf('Gate & Security').textContent).toContain('17');
    expect(hubOf('Units & Flats').textContent).toContain('40 ');
  });

  it('still shows the finance cards, with dashes, while the figures are loading or failed', () => {
    mocks.kpi = undefined;
    render(<KpiDashboardContent />);

    expect(screen.getByText('Collection Efficiency')).toBeTruthy();
    expect(screen.getByText('Invoices & Dues')).toBeTruthy();
  });

  it('says the trend could not be loaded when that section failed', () => {
    mocks.kpi = { ...FULL_PAYLOAD, monthlyTrend: null };
    render(<KpiDashboardContent />);

    expect(screen.getByText('Could not load the cashflow trend')).toBeTruthy();
  });
});
