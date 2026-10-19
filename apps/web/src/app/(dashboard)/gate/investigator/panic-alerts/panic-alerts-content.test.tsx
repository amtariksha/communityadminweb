import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PanicAlertsContent } from './panic-alerts-content';

/**
 * Incident Investigator › Panic Alerts (GATE-11, screen GATE-S6): alerts
 * as a table with block and Response Date (= acknowledged), search on the
 * server, export over the whole filtered result, View opens the timeline
 * with the responder buttons.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/lib/date', () => ({ todayIST: () => '2026-10-19' }));

const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));

const mocks = vi.hoisted(() => ({ useSosAlertList: vi.fn(), timelineFor: vi.fn() }));
vi.mock('@/hooks/use-sos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-sos')>()),
  useSosAlertList: (filters: Record<string, unknown>) => mocks.useSosAlertList(filters),
}));
vi.mock('../../../sos/sos-timeline-dialog', () => ({
  SosTimelineDialog: ({ id, withActions }: { id: string; withActions?: boolean }) => {
    mocks.timelineFor(id, withActions);
    return id ? <div role="dialog">Timeline {id}</div> : null;
  },
}));

function alert(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    status: 'acknowledged',
    category: 'panic',
    triggerer_role: 'resident',
    triggered_by: 'u',
    triggered_by_name: `Test Resident ${id}`,
    unit_id: 'unit',
    unit_number: 'B-201',
    block: 'B',
    gate_id: null,
    latitude: null,
    longitude: null,
    location_text: null,
    note: null,
    acknowledged_by: 'g',
    acknowledged_at: '2026-10-18T04:05:00.000Z',
    resolved_by: null,
    resolved_at: null,
    resolution_note: null,
    created_at: '2026-10-18T04:00:00.000Z',
    updated_at: '2026-10-18T04:05:00.000Z',
    ...overrides,
  };
}

const lastFilters = (): Record<string, unknown> => mocks.useSosAlertList.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  mocks.useSosAlertList.mockReset().mockReturnValue({ data: { data: [alert('1')], total: 1 }, isLoading: false });
  mocks.timelineFor.mockReset();
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Incident Investigator › Panic Alerts', () => {
  it('shows the screen’s columns with the acknowledged time as Response Date', () => {
    render(<PanicAlertsContent />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'S.No',
      'Block',
      'Unit',
      'Resident Name',
      'Alert Date',
      'Response Date',
      'Status',
      'View',
    ]);
    const row = screen.getByText('Test Resident 1').closest('tr') as HTMLElement;
    expect(within(row).getByText(/18 Oct 2026 09:35/i)).toBeTruthy();
    expect(within(row).getByText('Acknowledged')).toBeTruthy();
  });

  it('searches on the server and filters by status and range', () => {
    vi.useFakeTimers();
    const { container } = render(<PanicAlertsContent />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'B' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.change(container.querySelector('select#panic-status') as HTMLSelectElement, { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-18' } });
    vi.useRealTimers();

    expect(lastFilters()).toEqual(expect.objectContaining({ q: 'B', status: 'active', date_to: '2026-10-18', page: 1 }));
  });

  it('exports the whole filtered result', async () => {
    render(<PanicAlertsContent />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });

    expect(download).toHaveBeenCalledWith('/safety/sos/export', { params: { format: 'xlsx' } });
  });

  it('View opens the timeline with the responder buttons', () => {
    render(<PanicAlertsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByRole('dialog').textContent).toBe('Timeline 1');
    expect(mocks.timelineFor).toHaveBeenLastCalledWith('1', true);
  });
});
