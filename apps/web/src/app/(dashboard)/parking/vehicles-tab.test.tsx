import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VehiclesTab } from './vehicles-tab';
import { vehicleStatus } from './parking-ui';
import type { Vehicle } from '@/hooks/use-parking';

/**
 * PARK-02 / PARK-03 — the Vehicles tab sends its filters (the type filter
 * used to be ignored), pages, and lists pending vehicles with a badge.
 * PARK-08 / PARK-09 — RFID, the extra field and To Date; Edit opens the
 * vehicle form.
 */

const base: Vehicle = {
  id: 'v1',
  member_id: 'm1',
  unit_id: 'u1',
  registration_number: 'KA01AB1234',
  vehicle_type: 'car',
  make: null,
  model: null,
  color: null,
  parking_slot_id: null,
  sticker_number: null,
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  member_name: 'Asha Test',
  unit_number: 'A-101',
  block: 'A',
  register_status: 'active',
  approval_status: 'approved',
  rfid_number: 'RF-1',
  valid_to: '2026-12-31',
  additional_field: 'FT-9',
};

const PENDING: Vehicle = {
  ...base,
  id: 'v2',
  registration_number: 'KA05XY9',
  vehicle_type: 'bike',
  is_active: false,
  register_status: 'pending',
  approval_status: 'pending',
};

const mocks = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>>, label: '' }));

vi.mock('@/hooks/use-parking-settings', () => ({ useAdditionalFieldLabel: () => mocks.label }));
vi.mock('./components/vehicle-form', () => ({
  VehicleForm: ({ vehicle }: { vehicle?: Vehicle | null }) => (
    <div role="dialog">{vehicle ? `Edit form for ${vehicle.registration_number}` : 'Add form'}</div>
  ),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/hooks', () => ({
  useBlocks: () => ({ data: ['A', 'B'] }),
  useUnits: () => ({ data: { data: [], total: 0 } }),
  useUnitMembers: () => ({ data: [] }),
}));
vi.mock('@/hooks/use-parking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-parking')>();
  return {
    ...actual,
    useVehiclePage: (filters: Record<string, unknown>) => {
      mocks.calls.push(filters);
      return { data: { data: [base, PENDING], total: 75 }, isLoading: false };
    },
    useSlots: () => ({ data: [] }),
    useRegisterVehicle: () => ({ mutate: vi.fn(), isPending: false }),
    useRemoveVehicle: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.label = '';
});

const lastCall = () => mocks.calls[mocks.calls.length - 1];

describe('VehiclesTab', () => {
  it('sends the Vehicle Type, Block and Status filters', () => {
    render(<VehiclesTab />);
    fireEvent.change(screen.getByLabelText('Vehicle type'), { target: { value: 'bike' } });
    expect(lastCall()).toMatchObject({ vehicle_type: 'bike', page: 1 });

    fireEvent.change(screen.getByLabelText('Block'), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pending' } });
    expect(lastCall()).toMatchObject({ vehicle_type: 'bike', block: 'B', status: 'pending' });
  });

  it('offers every type the API accepts', () => {
    render(<VehiclesTab />);
    const select = screen.getByLabelText('Vehicle type') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['', 'car', 'bike', 'scooter', 'ev', 'other']);
  });

  it('searches and pages', () => {
    render(<VehiclesTab />);
    expect(screen.getByText('Showing 1 to 50 of 75 entries')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(lastCall()).toMatchObject({ page: 2, limit: 50 });

    fireEvent.change(screen.getByLabelText('Search vehicles'), { target: { value: 'ka 01' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(lastCall()).toMatchObject({ search: 'ka 01', page: 1 });
  });

  it('badges a pending vehicle', () => {
    render(<VehiclesTab />);
    const row = screen.getByText('KA05XY9').closest('tr') as HTMLElement;
    expect(within(row).getByText('Pending')).toBeTruthy();
    const active = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    expect(within(active).getByText('Active')).toBeTruthy();
  });
});

describe('VehiclesTab register fields (PARK-08, PARK-09)', () => {
  it('shows RFID and Valid Till, and the extra field only while Setup names it', () => {
    const { unmount } = render(<VehiclesTab />);
    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    expect(within(row).getByText('RF-1')).toBeTruthy();
    expect(within(row).getByText('31/12/2026')).toBeTruthy();
    expect(within(row).queryByText('FT-9')).toBeNull();
    unmount();

    mocks.label = 'Fastag';
    render(<VehiclesTab />);
    expect(screen.getByRole('columnheader', { name: 'Fastag' })).toBeTruthy();
    expect(screen.getAllByText('FT-9')).toHaveLength(2);
  });

  it('opens the vehicle form for Edit and for Register', () => {
    render(<VehiclesTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit KA01AB1234' }));
    expect(screen.getByRole('dialog').textContent).toBe('Edit form for KA01AB1234');

    fireEvent.click(screen.getByRole('button', { name: /Register Vehicle/ }));
    expect(screen.getByText('Add form')).toBeTruthy();
  });

  it('offers Expired on the status filter', () => {
    render(<VehiclesTab />);
    const select = screen.getByLabelText('Status') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toContain('expired');
  });
});

describe('vehicleStatus', () => {
  it('reads an older API that sends no register_status', () => {
    const { register_status: _ignored, ...old } = PENDING;
    expect(vehicleStatus(old).label).toBe('Pending');
    expect(vehicleStatus({ ...old, approval_status: 'approved', is_active: false }).label).toBe('Removed');
  });
});
