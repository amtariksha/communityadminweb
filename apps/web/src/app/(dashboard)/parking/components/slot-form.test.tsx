import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParkingSlot, Vehicle } from '@/hooks/use-parking';
import { SlotForm } from './slot-form';
import { assignmentStep, slotDraftFrom } from './use-slot-form';

/**
 * Add / Edit Slot (PARK-07, screen PARK-S3): the same form as the standard
 * dialog and the classic page; Edit saves through PATCH and the assign /
 * deallocate routes; moving a slot with vehicles on it asks first.
 */

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const UNITS = [
  { id: 'u1', unit_number: '101', block: 'A' },
  { id: 'u2', unit_number: '201', block: 'B' },
];
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  assign: vi.fn(),
  deallocate: vi.fn(),
  vehicles: [] as Vehicle[],
}));
vi.mock('@/hooks', () => ({
  useUnits: () => ({ data: { data: UNITS, total: 2 } }),
  useUnitMembers: (unitId: string) => ({ data: unitId ? [{ id: `m-${unitId}`, name: `Test Owner ${unitId}`, member_type: 'owner' }] : [] }),
}));
vi.mock('@/hooks/use-parking', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-parking')>()),
  useCreateSlot: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateSlot: () => ({ mutateAsync: mocks.update, isPending: false }),
  useAssignSlot: () => ({ mutateAsync: mocks.assign, isPending: false }),
  useDeallocateSlot: () => ({ mutateAsync: mocks.deallocate, isPending: false }),
  useVehiclePage: () => ({ data: { data: mocks.vehicles, total: mocks.vehicles.length } }),
}));

const SLOT: ParkingSlot = {
  id: 's1',
  slot_number: 'P-01',
  slot_type: 'car',
  location: 'Basement',
  unit_id: 'u1',
  assigned_to_member_id: null,
  has_ev_charger: false,
  is_occupied: true,
  status: 'assigned',
  created_at: '2026-10-01T00:00:00Z',
};

const parked = { id: 'v1', registration_number: 'KA01AB1234', parking_slot_id: 's1' } as Vehicle;

beforeEach(() => {
  for (const fn of [mocks.create, mocks.update, mocks.assign, mocks.deallocate]) fn.mockReset();
  mocks.update.mockResolvedValue({ data: SLOT });
  mocks.create.mockResolvedValue({ data: { ...SLOT, id: 's-new' } });
  mocks.vehicles = [];
});

const save = async (name = 'Save') => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

describe('SlotForm', () => {
  it('edits the location; the assignment is left alone', async () => {
    render(<SlotForm mode="page" slot={SLOT} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Podium' } });
    await save();

    expect(mocks.update).toHaveBeenCalledWith({
      id: 's1',
      data: { slot_number: 'P-01', slot_type: 'car', location: 'Podium', has_ev_charger: false, is_ev_enabled: false },
    });
    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.deallocate).not.toHaveBeenCalled();
  });

  it('asks before moving a slot that has a vehicle on it, and saves nothing on Cancel', async () => {
    mocks.vehicles = [parked];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SlotForm mode="page" slot={SLOT} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Assigned Unit'), { target: { value: 'u2' } });
    await save();

    expect(confirm.mock.calls[0][0]).toContain('KA01AB1234');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('on OK unlinks (deallocate) and assigns the new unit and member', async () => {
    mocks.vehicles = [parked];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SlotForm mode="page" slot={SLOT} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Assigned Unit'), { target: { value: 'u2' } });
    fireEvent.change(screen.getByLabelText('Assigned Member'), { target: { value: 'm-u2' } });
    await save();

    expect(mocks.deallocate).toHaveBeenCalledWith('s1');
    expect(mocks.assign).toHaveBeenCalledWith({ id: 's1', unit_id: 'u2', member_id: 'm-u2' });
  });

  it('is a dialog with Cancel / Save in standard and a page with Save and New in classic', () => {
    const { unmount } = render(<SlotForm mode="dialog" open onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save and New' })).toBeNull();
    unmount();

    render(<SlotForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save and New' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('adds a slot and assigns it when a unit is chosen', async () => {
    render(<SlotForm mode="page" onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Slot No'), { target: { value: 'P-09' } });
    fireEvent.change(screen.getByLabelText('Assigned Unit'), { target: { value: 'u1' } });
    await save();

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ slot_number: 'P-09', slot_type: 'car' }));
    expect(mocks.assign).toHaveBeenCalledWith({ id: 's-new', unit_id: 'u1', member_id: undefined });
  });
});

describe('assignmentStep', () => {
  it('names the step a save needs', () => {
    const draft = slotDraftFrom(SLOT);
    expect(assignmentStep(SLOT, draft)).toBe('none');
    expect(assignmentStep(SLOT, { ...draft, unitId: '' })).toBe('release');
    expect(assignmentStep(SLOT, { ...draft, unitId: 'u2' })).toBe('move');
    expect(assignmentStep(SLOT, { ...draft, memberId: 'm1' })).toBe('assign');
    expect(assignmentStep(null, { ...slotDraftFrom(null), unitId: 'u1' })).toBe('assign');
  });
});
