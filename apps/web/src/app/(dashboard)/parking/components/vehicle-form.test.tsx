import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParkingSlot, Vehicle } from '@/hooks/use-parking';
import { VehicleForm, slotChoices } from './vehicle-form';
import { vehicleDraftError, vehicleDraftFrom, vehicleFields } from './use-vehicle-form';

/**
 * Add / Edit Vehicle (PARK-09, screen PARK-S5, SB-07): one form for the
 * standard dialog and the classic page. Edit saves through PATCH (the slot
 * and the register fields); Add posts the unit and member too; the extra
 * field shows only while Parking Setup names it.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.toast }) }));

const slot = (id: string, number: string, over: Partial<ParkingSlot> = {}): ParkingSlot => ({
  id,
  slot_number: number,
  slot_type: 'car',
  location: null,
  unit_id: null,
  assigned_to_member_id: null,
  has_ev_charger: false,
  is_occupied: false,
  status: 'vacant',
  created_at: '2026-10-01T00:00:00Z',
  ...over,
});

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
  label: '',
}));
vi.mock('@/hooks', () => ({
  useUnitMembers: (unitId: string) => ({ data: unitId ? [{ id: `m-${unitId}`, name: `Test Owner ${unitId}`, member_type: 'owner' }] : [] }),
}));
vi.mock('@/app/(dashboard)/helpdesk/new/use-unit-choices', () => ({
  useUnitChoices: () => ({ data: [{ id: 'u1', unit_number: '101', block: 'A' }, { id: 'u2', unit_number: '201', block: 'B' }] }),
}));
vi.mock('@/hooks/use-parking-settings', () => ({ useAdditionalFieldLabel: () => mocks.label }));
vi.mock('@/hooks/use-parking', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-parking')>()),
  useSlots: (filters: { unit_id?: string; status?: string }) => ({
    data: filters.status === 'vacant' ? [slot('s-free', 'F-1', { slot_type: 'bike' })] : [slot('s-own', 'A-1', { unit_id: 'u1', status: 'assigned' })],
  }),
  useRegisterVehicle: () => ({ mutateAsync: mocks.register, isPending: false }),
  useUpdateVehicle: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

const VEHICLE: Vehicle = {
  id: 'v1',
  member_id: 'm-u1',
  unit_id: 'u1',
  registration_number: 'KA01AB1234',
  vehicle_type: 'car',
  make: 'Test Make',
  model: null,
  color: null,
  parking_slot_id: 's-own',
  sticker_number: 'S-1',
  rfid_number: 'RF-1',
  valid_from: '2026-01-01',
  valid_to: '2026-12-31',
  comments: null,
  additional_field: 'FT-1',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
};

beforeEach(() => {
  mocks.register.mockReset().mockResolvedValue({ data: { ...VEHICLE, id: 'v-new', approval_status: 'approved' } });
  mocks.update.mockReset().mockResolvedValue({ data: VEHICLE });
  mocks.toast.mockReset();
  mocks.label = '';
});

const save = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });
};

describe('VehicleForm', () => {
  it('changes the slot on Edit and sends it with the register fields', async () => {
    const onSaved = vi.fn();
    render(<VehicleForm mode="page" vehicle={VEHICLE} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Slot No'), { target: { value: 's-free' } });
    fireEvent.change(screen.getByLabelText('RFID No'), { target: { value: 'RF-2' } });
    await save();

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v1', parking_slot_id: 's-free', rfid_number: 'RF-2', valid_to: '2026-12-31', sticker_number: 'S-1' }),
    );
    // The hidden extra field is never cleared by a save.
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('additional_field');
    expect(onSaved).toHaveBeenCalled();
  });

  it('keeps the unit and member on Edit (the API does not move a vehicle)', () => {
    render(<VehicleForm mode="page" vehicle={VEHICLE} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect((screen.getByLabelText('Block-Unit') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Name') as HTMLSelectElement).disabled).toBe(true);
  });

  it('adds a vehicle for the chosen unit and member', async () => {
    render(<VehicleForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Block-Unit'), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'm-u2' } });
    fireEvent.change(screen.getByLabelText('Vehicle No'), { target: { value: 'KA 02 CD 5678' } });
    fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2027-03-31' } });
    await save();

    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ unit_id: 'u2', member_id: 'm-u2', registration_number: 'KA 02 CD 5678', valid_to: '2027-03-31', valid_from: null }),
    );
  });

  it('refuses a To Date before the From Date without sending', async () => {
    render(<VehicleForm mode="page" vehicle={VEHICLE} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2025-12-31' } });
    await save();

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'To Date cannot be before From Date.' }));
  });

  it('shows the extra field under the Setup label and sends it', async () => {
    mocks.label = 'Fastag';
    render(<VehicleForm mode="page" vehicle={VEHICLE} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Fastag'), { target: { value: 'FT-2' } });
    await save();

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ additional_field: 'FT-2' }));
  });

  it('has no extra field while Setup names none', () => {
    render(<VehicleForm mode="page" vehicle={VEHICLE} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByDisplayValue('FT-1')).toBeNull();
  });
});

describe('vehicle form rules', () => {
  it('offers the unit’s own slots first, then the vacant ones', () => {
    const own = [slot('a', 'A-1')];
    expect(slotChoices(own, [slot('b', 'F-1'), slot('a', 'A-1')]).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('names the first problem', () => {
    const ok = { ...vehicleDraftFrom(VEHICLE) };
    expect(vehicleDraftError(ok)).toBeNull();
    expect(vehicleDraftError({ ...ok, unitId: '' })).toBe('Choose the unit.');
    expect(vehicleDraftError({ ...ok, plate: ' ' })).toBe('Enter the vehicle number.');
    expect(vehicleDraftError({ ...ok, comments: 'x'.repeat(501) })).toBe('Comments has at most 500 characters.');
  });

  it('sends blank text as null', () => {
    const fields = vehicleFields({ ...vehicleDraftFrom(VEHICLE), sticker: ' ', from: '' }, true);
    expect(fields).toMatchObject({ sticker_number: null, valid_from: null, additional_field: 'FT-1' });
  });
});
