import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisitorsContent } from './visitors-content';
import { isOverrun } from './visitor-rows';

/**
 * Incident Investigator › Visitors (GATE-10, screen GATE-S4): opens on
 * today, the filters become query parameters, the export asks for the whole
 * filtered result, and a visitor inside past the society's limit is red.
 */

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/lib/date', () => ({ todayIST: () => '2026-10-19' }));

const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));

const mocks = vi.hoisted(() => ({ useVisitors: vi.fn(), useGateSettings: vi.fn(), useUnitBlocks: vi.fn(), useEntryReasons: vi.fn() }));
vi.mock('@/hooks/use-gate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-gate')>()),
  useVisitors: (filters: Record<string, unknown>) => mocks.useVisitors(filters),
}));
vi.mock('@/hooks/use-gate-settings', () => ({ useGateSettings: () => mocks.useGateSettings() }));
vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => mocks.useUnitBlocks() }));
vi.mock('@/hooks/use-gate-lists', () => ({ useEntryReasons: () => mocks.useEntryReasons() }));
vi.mock('@/hooks/use-gate-unlock', () => ({
  useRequestUnlockCode: () => ({ mutateAsync: vi.fn() }),
  useVerifyUnlockCode: () => ({ mutateAsync: vi.fn() }),
}));

const NOW = new Date('2026-10-19T08:00:00.000Z').getTime();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function visitor(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    tenant_id: 't',
    unit_id: 'u',
    unit_number: '101',
    block: 'A',
    visitor_name: `Test Guest ${id}`,
    visitor_phone: '+910000000041',
    purpose: 'Delivery',
    vehicle_number: null,
    otp_code: null,
    pre_approved: false,
    expected_at: null,
    checked_in_at: minutesAgo(30),
    checked_out_at: null,
    status: 'checked_in',
    created_by: null,
    created_at: minutesAgo(40),
    gate_name: 'Main Gate',
    ...overrides,
  };
}

const lastFilters = (): Record<string, unknown> => mocks.useVisitors.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  mocks.useVisitors.mockReset().mockReturnValue({
    data: { data: [visitor('1'), visitor('2', { checked_in_at: minutesAgo(90) })], total: 2 },
    isLoading: false,
  });
  mocks.useGateSettings.mockReset().mockReturnValue({ data: { overstay_threshold_minutes: 60 } });
  mocks.useUnitBlocks.mockReset().mockReturnValue({
    data: { data: [{ id: 'b', name: 'A', unit_count: 4, position: 0 }], total_units: 4 },
  });
  mocks.useEntryReasons.mockReset().mockReturnValue({
    data: [
      { id: 'r-courier', name: 'Courier', expected_minutes: 20, is_active: true, sort_order: 1 },
      { id: 'r-guest', name: 'Guest', expected_minutes: null, is_active: true, sort_order: 2 },
    ],
  });
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Incident Investigator › Visitors', () => {
  it('opens on today, 25 a page, with the screen’s columns', () => {
    render(<VisitorsContent />);

    expect(lastFilters()).toEqual(expect.objectContaining({ date_from: '2026-10-19', date_to: '2026-10-19', page: 1, limit: 25 }));
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Date',
      'Visitor Name',
      'Phone',
      'Block',
      'Unit',
      'Entry Reason',
      'Gate',
      'In Time',
      'Out Time',
      'Status',
      'View',
    ]);
  });

  it('sends the range, block, status and search as query parameters', () => {
    const { container } = render(<VisitorsContent />);

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'A (4)' }));
    fireEvent.change(container.querySelector('select#visitor-status') as HTMLSelectElement, { target: { value: 'checked_out' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'KA01' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(lastFilters()).toEqual(
      expect.objectContaining({ date_from: '2026-10-01', date_to: '2026-10-19', block: 'A', status: 'checked_out', q: 'KA01', page: 1 }),
    );
  });

  it('exports the whole filtered result from the server', async () => {
    render(<VisitorsContent />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CSV' }));
    });

    expect(download).toHaveBeenCalledWith('/gate/visitors/export', {
      params: { date_from: '2026-10-19', date_to: '2026-10-19', format: 'csv' },
      headers: {},
    });
  });

  it('shows a visitor inside past the society’s limit in red', () => {
    render(<VisitorsContent />);

    expect((screen.getByText('Test Guest 2').closest('tr') as HTMLElement).className).toContain('text-destructive');
    expect((screen.getByText('Test Guest 1').closest('tr') as HTMLElement).className).not.toContain('text-destructive');
  });

  it('shows the entry reason, filters by it, and holds a visitor to the reason’s stay (GATE-41)', () => {
    mocks.useVisitors.mockReturnValue({
      data: {
        data: [
          visitor('3', { entry_reason: 'Courier', entry_reason_id: 'r-courier', expected_minutes: 20, checked_in_at: minutesAgo(21) }),
          visitor('4', { entry_reason: 'Guest', entry_reason_id: 'r-guest', expected_minutes: null, checked_in_at: minutesAgo(21) }),
        ],
        total: 2,
      },
      isLoading: false,
    });
    const { container } = render(<VisitorsContent />);

    expect(screen.getByRole('cell', { name: 'Courier' })).toBeTruthy();
    expect((screen.getByText('Test Guest 3').closest('tr') as HTMLElement).className).toContain('text-destructive');
    expect((screen.getByText('Test Guest 4').closest('tr') as HTMLElement).className).not.toContain('text-destructive');
    fireEvent.change(container.querySelector('select#visitor-reason') as HTMLSelectElement, { target: { value: 'r-courier' } });
    expect(lastFilters()).toEqual(expect.objectContaining({ entry_reason_id: 'r-courier', page: 1 }));
  });

  it('opens View with what the gate recorded', () => {
    render(<VisitorsContent />);
    const row = screen.getByText('Test Guest 1').closest('tr') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'View' }));

    expect(screen.getAllByText('Main Gate').length).toBeGreaterThan(1);
  });
});

describe('the investigator lock (GATE-43)', () => {
  it('shows the lock panel instead of the list when the API answers 423', () => {
    mocks.useVisitors.mockReturnValue({ isError: true, error: { status: 423, code: 'investigator_locked' }, isLoading: false });
    render(<VisitorsContent />);
    expect(screen.getByRole('button', { name: 'Request Code' })).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('isOverrun', () => {
  it('counts only visitors still inside', () => {
    expect(isOverrun(visitor('1', { checked_in_at: minutesAgo(61) }) as never, 60, NOW)).toBe(true);
    expect(isOverrun(visitor('1', { checked_in_at: minutesAgo(59) }) as never, 60, NOW)).toBe(false);
    expect(isOverrun(visitor('1', { checked_in_at: minutesAgo(90), status: 'checked_out' }) as never, 60, NOW)).toBe(false);
  });
});
