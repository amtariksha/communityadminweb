import { render, screen } from '@testing-library/react';
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
};

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

  it('says the trend could not be loaded when that section failed', () => {
    mocks.kpi = { ...FULL_PAYLOAD, monthlyTrend: null };
    render(<KpiDashboardContent />);

    expect(screen.getByText('Could not load the cashflow trend')).toBeTruthy();
  });
});
