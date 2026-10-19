import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParkingSlot, Vehicle } from '@/hooks/use-parking';
import { SlotsRegister } from './slots-register';
import { VehiclesRegister } from './vehicles-register';

/**
 * Parking Manager's classic registers (PARK-06, screens PARK-S2 / S4): the
 * shared table with Sr No, server search, paging and the export strip;
 * block links above the vehicles.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('../register-vehicle-dialog', () => ({ RegisterVehicleDialog: () => null }));

const mocks = vi.hoisted(() => ({ slots: vi.fn(), vehicles: vi.fn(), remove: vi.fn(), blocks: vi.fn() }));
vi.mock('@/hooks/use-parking', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-parking')>()),
  useSlotPage: (filters: Record<string, unknown>) => mocks.slots(filters),
  useVehiclePage: (filters: Record<string, unknown>) => mocks.vehicles(filters),
  useRemoveVehicle: () => ({ mutate: mocks.remove }),
}));
vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => mocks.blocks() }));

const slot = (id: string, number: string): ParkingSlot => ({
  id,
  slot_number: number,
  slot_type: 'car',
  location: 'Basement',
  unit_id: null,
  assigned_to_member_id: null,
  has_ev_charger: false,
  is_occupied: false,
  status: 'vacant',
  created_at: '2026-10-01T00:00:00Z',
});

const vehicle: Vehicle = {
  id: 'v1',
  member_id: 'm1',
  unit_id: 'u1',
  registration_number: 'KA01AB1234',
  vehicle_type: 'car',
  make: null,
  model: null,
  color: null,
  parking_slot_id: 's1',
  sticker_number: 'STK-9',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  member_name: 'Test Resident',
  unit_number: 'A-101',
  slot_number: 'P-01',
  block: 'A',
  slot_type: 'car',
  register_status: 'active',
};

const last = (mock: ReturnType<typeof vi.fn>): Record<string, unknown> => mock.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  mocks.slots.mockReset().mockReturnValue({ data: { data: [slot('s1', 'P-01'), slot('s2', 'P-02')], total: 120 }, isLoading: false });
  mocks.vehicles.mockReset().mockReturnValue({ data: { data: [vehicle], total: 1 }, isLoading: false });
  mocks.remove.mockReset();
  mocks.blocks.mockReset().mockReturnValue({ data: { data: [{ id: 'b', name: 'A', unit_count: 4, position: 0 }], total_units: 4 } });
  download.mockReset().mockResolvedValue(new Blob(['x']));
});

describe('Parking Manager › Slots', () => {
  it('shows Sr No · Slot No · Type with "Showing x to y of z"', () => {
    render(<SlotsRegister />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Sr No', 'Slot No', 'Type', 'Action']);
    expect(screen.getByText('Showing 1 to 25 of 120 entries')).toBeTruthy();
    expect(last(mocks.slots)).toEqual(expect.objectContaining({ page: 1, limit: 25 }));
  });

  it('searches on the server and exports the whole result', async () => {
    vi.useFakeTimers();
    render(<SlotsRegister />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'basement' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();
    expect(last(mocks.slots)).toEqual(expect.objectContaining({ search: 'basement', page: 1 }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    });
    expect(download).toHaveBeenCalledWith('/parking/slots/export', { params: { search: 'basement', format: 'xlsx' } });
  });

  it('Add Slot and Edit open the slot form as pages (PARK-07)', () => {
    render(<SlotsRegister />);
    expect(screen.getByRole('link', { name: 'Add Slot' }).getAttribute('href')).toBe('/parking/slots/new');
    const row = screen.getByText('P-02').closest('tr') as HTMLElement;
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/parking/slots/s2/edit');
  });
});

describe('Parking Manager › Vehicles', () => {
  it('lists the wide register with block links and Remove', () => {
    render(<VehiclesRegister />);

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Sr No',
      'Slot No',
      'Slot Type',
      'Block',
      'Unit No',
      'Status',
      'Name',
      'Vehicle No',
      'Vehicle Type',
      'Sticker No',
      'Action',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'A (4)' }));
    expect(last(mocks.vehicles)).toEqual(expect.objectContaining({ block: 'A', page: 1 }));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Remove' }));
    expect(mocks.remove).toHaveBeenCalledWith('v1', expect.anything());
  });

  it('lists rejected or removed vehicles only through the status filter', () => {
    const { container } = render(<VehiclesRegister />);

    expect(last(mocks.vehicles)).not.toHaveProperty('status');
    fireEvent.change(container.querySelector('select#vehicle-status') as HTMLSelectElement, { target: { value: 'removed' } });
    expect(last(mocks.vehicles)).toEqual(expect.objectContaining({ status: 'removed' }));
  });
});
