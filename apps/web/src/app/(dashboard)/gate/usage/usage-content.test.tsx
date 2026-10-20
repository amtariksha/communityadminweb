import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { UsageContent, INFORM_RESIDENTS_HREF } from './usage-content';

/** Usage Summary (GATE-44, GATE-S3): the five tiles, zeros as 0, and Inform Residents. */

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Nothing = (): null => null;
  return { ResponsiveContainer: Pass, BarChart: Pass, Bar: Nothing, XAxis: Nothing, YAxis: Nothing, Tooltip: Nothing };
});
const usage = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('@/hooks/use-gate-desk', () => ({ useGateUsage: () => usage.value }));

const SUMMARY = {
  entries_by_day: [
    { day: '2026-10-19', visitors: 6, staff: 2, parcels: 1, total: 9 },
    { day: '2026-10-20', visitors: 4, staff: 0, parcels: 0, total: 4 },
  ],
  pre_approval: { checked_in: 10, pre_approved: 4, percent: 40 },
  resident_adoption: { pre_approvers: 3, residents_with_app: 12 },
  exceptions: { overstay_alerts: 0, denied_entries: 0 },
  panic_alerts: { active: 0, acknowledged: 0, resolved: 0, false_alarm: 0, cancelled: 0 },
};

describe('Usage Summary', () => {
  it('shows the tiles, 40% pre-approved, zeros as 0, and Inform Residents opens a draft', () => {
    usage.value = { data: SUMMARY, isLoading: false, isError: false };
    render(<UsageContent />);

    expect(screen.getByText('13')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('3 / 12')).toBeTruthy();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Inform Residents').getAttribute('href')).toBe(INFORM_RESIDENTS_HREF);
  });

  it('says not available yet against an older API', () => {
    usage.value = { data: null, isLoading: false, isError: false };
    render(<UsageContent />);
    expect(screen.getByText('The usage summary is not available yet.')).toBeTruthy();
  });
});
