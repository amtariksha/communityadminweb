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
const settings = vi.hoisted(() => ({ label: '' }));
vi.mock('@/hooks/use-parking-settings', () => ({ useAdditionalFieldLabel: () => settings.label }));
vi.mock('../components/vehicle-form', () => ({ VehicleForm: () => null }));

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
  rfid_number: 'RF-77',
  valid_from: '2026-01-01',
  valid_to: '2026-06-30',
  comments: 'Second car',
  additional_field: 'FT-12',
};

const last = (mock: ReturnType<typeof vi.fn>): Record<string, unknown> => mock.mock.calls.at(-1)?.[0] ?? {};

beforeEach(() => {
  mocks.slots.mockReset().mockReturnValue({ data: { data: [slot('s1', 'P-01'), slot('s2', 'P-02')], total: 120 }, isLoading: false });
  mocks.vehicles.mockReset().mockReturnValue({ data: { data: [vehicle], total: 1 }, isLoading: false });
  mocks.remove.mockReset();
  settings.label = '';
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
      'RFID No',
      'From Date',
      'To Date',
      'Comments',
      'Action',
      '',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'A (4)' }));
    expect(last(mocks.vehicles)).toEqual(expect.objectContaining({ block: 'A', page: 1 }));

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: 'Remove' }));
    expect(mocks.remove).toHaveBeenCalledWith('v1', expect.anything());
  });

  // PARK-08: the register's fields; the extra field is named in Parking Setup.
  it('shows RFID, From / To and Comments, and the extra field only while Setup names it', () => {
    const { unmount } = render(<VehiclesRegister />);
    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    expect(within(row).getByText('RF-77')).toBeTruthy();
    expect(within(row).getByText('01/01/2026')).toBeTruthy();
    expect(within(row).getByText('30/06/2026')).toBeTruthy();
    expect(within(row).getByText('Second car')).toBeTruthy();
    expect(within(row).queryByText('FT-12')).toBeNull();
    unmount();

    settings.label = 'Fastag';
    render(<VehiclesRegister />);
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers.slice(headers.indexOf('RFID No'), headers.indexOf('RFID No') + 3)).toEqual(['RFID No', 'Fastag', 'From Date']);
    expect(screen.getByText('FT-12')).toBeTruthy();
  });

  // PARK-09: Add Vehicle and Edit open the vehicle form as pages.
  it('opens Add Vehicle and Edit as pages', () => {
    render(<VehiclesRegister />);
    expect(screen.getByRole('link', { name: 'Add Vehicle' }).getAttribute('href')).toBe('/parking/vehicles/new');
    const row = screen.getByText('KA01AB1234').closest('tr') as HTMLElement;
    expect(within(row).getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/parking/vehicles/v1/edit?plate=KA01AB1234');
  });

  it('offers Expired on the status filter', () => {
    const { container } = render(<VehiclesRegister />);
    const filter = container.querySelector('select#vehicle-status') as HTMLSelectElement;
    expect(Array.from(filter.options).map((option) => option.value)).toContain('expired');
    fireEvent.change(filter, { target: { value: 'expired' } });
    expect(last(mocks.vehicles)).toEqual(expect.objectContaining({ status: 'expired' }));
  });

  it('lists rejected or removed vehicles only through the status filter', () => {
    const { container } = render(<VehiclesRegister />);

    expect(last(mocks.vehicles)).not.toHaveProperty('status');
    fireEvent.change(container.querySelector('select#vehicle-status') as HTMLSelectElement, { target: { value: 'removed' } });
    expect(last(mocks.vehicles)).toEqual(expect.objectContaining({ status: 'removed' }));
  });
});
