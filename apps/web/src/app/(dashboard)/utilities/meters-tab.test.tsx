import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetersTab } from './meters-tab';

/**
 * UTIL-05 — the Meters tab shows each meter's latest reading, and its
 * export asks the server for the whole filtered list (SB-04).
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('./add-meter-dialog', () => ({ AddMeterDialog: () => null }));

const meters = vi.hoisted(() => [
  {
    id: 'm1', tenant_id: 't', unit_id: 'u1', is_common: false, meter_type: 'water', meter_number: 'W-101',
    is_active: true, created_at: '2026-04-01', unit_number: 'A-101',
    last_reading_value: '12400.00', last_reading_date: '2026-09-30',
  },
  {
    id: 'm2', tenant_id: 't', unit_id: null, is_common: true, meter_type: 'water', meter_number: 'W-BORE',
    is_active: true, created_at: '2026-04-01', last_reading_value: null, last_reading_date: null,
  },
]);
vi.mock('@/hooks', () => ({
  useMeters: () => ({ data: meters, isLoading: false, isError: false }),
  useUpdateMeter: () => ({ mutate: vi.fn() }),
}));

describe('Meters tab', () => {
  beforeEach(() => {
    download.mockReset();
  });

  it('shows the last reading, or a dash for a meter never read', () => {
    render(<MetersTab meterTypeFilter="" setMeterTypeFilter={() => undefined} />);

    const header = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(header).toContain('Last Reading');
    expect(within(screen.getByText('W-101').closest('tr')!).getByText(/^12,400 on /)).toBeTruthy();
    expect(within(screen.getByText('W-BORE').closest('tr')!).getByText('—')).toBeTruthy();
  });

  it('exports the filtered list from the server', async () => {
    download.mockResolvedValue(new Blob(['x']));
    render(<MetersTab meterTypeFilter="water" setMeterTypeFilter={() => undefined} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });

    expect(download).toHaveBeenCalledWith('/utilities/meters/export', { params: { meter_type: 'water', format: 'xlsx' } });
  });
});
