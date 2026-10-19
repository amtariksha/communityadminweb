import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anprFiltersToParams } from '@/hooks/use-gate';
import { VehiclesTab, unitLabel } from './vehicles-tab';

/**
 * /gate › Vehicles reads GET /gate/anpr/logs under the API's names
 * (`vehicle_number`, `logged_at`, direction `entry` / `exit`) and filters by
 * the one day the API reads (`date`).
 */

const mocks = vi.hoisted(() => ({
  logCalls: [] as Array<Record<string, unknown> | undefined>,
  logs: [] as Array<Record<string, unknown>>,
  unrecognized: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/hooks', () => ({
  useAnprLogs: (filters?: Record<string, unknown>) => {
    mocks.logCalls.push(filters);
    return { data: { data: mocks.logs, total: mocks.logs.length }, isLoading: false };
  },
  useUnrecognizedVehicles: () => ({ data: mocks.unrecognized, isLoading: false }),
  useAnprScan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGates: () => ({ data: [{ id: 'gate-1', name: 'North Gate' }], isLoading: false }),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

beforeEach(() => {
  mocks.logCalls = [];
  mocks.logs = [
    {
      id: 'log-1',
      vehicle_number: 'KA01AB1234',
      gate_id: 'gate-1',
      gate_name: 'North Gate',
      direction: 'exit',
      is_recognized: true,
      image_url: null,
      // 10:30 India time.
      logged_at: '2026-10-18T05:00:00.000Z',
      unit_number: '101',
      block: 'B',
    },
  ];
  mocks.unrecognized = [
    { id: 'log-2', vehicle_number: 'MH12ZZ0001', gate_name: 'North Gate', image_url: null, logged_at: '2026-10-18T06:00:00.000Z' },
  ];
});

describe('VehiclesTab', () => {
  it('shows the plate, direction, unit and time the API sends', () => {
    render(<VehiclesTab />);

    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    expect(within(row).getByText('Exit')).toBeTruthy();
    expect(within(row).getByText('B-101')).toBeTruthy();
    expect(within(row).getByText(/18 Oct/)).toBeTruthy();
    expect(within(row).getByText(/10:30/)).toBeTruthy();
  });

  it('lists unrecognized plates by vehicle_number', () => {
    render(<VehiclesTab />);

    expect(screen.getByText('MH12ZZ0001')).toBeTruthy();
    expect(screen.getByText('Unrecognized Vehicles (1)')).toBeTruthy();
  });

  it('filters by one day under `date` and goes back to page 1', () => {
    render(<VehiclesTab />);
    fireEvent.change(screen.getByLabelText('Log date'), { target: { value: '2026-10-18' } });

    const last = mocks.logCalls.at(-1) ?? {};
    expect(last).toMatchObject({ date: '2026-10-18', page: 1, limit: 25 });
    expect(last).not.toHaveProperty('from_date');
    expect(last).not.toHaveProperty('to_date');
  });

  it('filters by gate', () => {
    render(<VehiclesTab />);
    fireEvent.change(screen.getByLabelText('Log gate'), { target: { value: 'gate-1' } });

    expect(mocks.logCalls.at(-1)).toMatchObject({ gate_id: 'gate-1' });
  });
});

describe('anprFiltersToParams', () => {
  it('sends the day as `date`, which GET /gate/anpr/logs reads', () => {
    expect(anprFiltersToParams({ date: '2026-10-18', is_recognized: false, page: 2, limit: 25 })).toEqual({
      date: '2026-10-18',
      is_recognized: 'false',
      page: '2',
      limit: '25',
    });
  });
});

describe('unitLabel', () => {
  it('joins block and unit, and shows a dash when nothing matched', () => {
    expect(unitLabel({ block: 'B', unit_number: '101' })).toBe('B-101');
    expect(unitLabel({ block: null, unit_number: '101' })).toBe('101');
    expect(unitLabel({ block: 'B', unit_number: null })).toBe('-');
  });
});
