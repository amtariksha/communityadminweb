import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlotsTab } from './slots-tab';
import { SLOT_TEXT_COLUMNS } from './parking-ui';
import type { ParkingSlot } from '@/hooks/use-parking';

/**
 * PARK-02 / PARK-04 / PARK-05 — the Slots tab pages through every slot,
 * searches on the server, exports the whole filtered list, offers type
 * Other and no Monthly Charge.
 */

const SLOT: ParkingSlot = {
  id: 'slot-1',
  slot_number: 'S-001',
  slot_type: 'other',
  location: 'Podium',
  unit_id: 'u1',
  assigned_to_member_id: null,
  has_ev_charger: false,
  is_occupied: true,
  status: 'assigned',
  created_at: '2026-10-01T00:00:00Z',
  unit_number: 'C-303',
  member_name: 'Meera Test',
};

const mocks = vi.hoisted(() => ({
  pageCalls: [] as Array<Record<string, unknown>>,
  create: vi.fn(),
  download: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ api: { download: mocks.download } }));
vi.mock('@/lib/download', () => ({ saveBlob: vi.fn(), printHtml: vi.fn() }));
vi.mock('@/hooks', () => ({ useUnits: () => ({ data: { data: [], total: 0 } }) }));
vi.mock('@/hooks/use-parking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-parking')>();
  return {
    ...actual,
    useSlotPage: (filters: Record<string, unknown>) => {
      mocks.pageCalls.push(filters);
      return { data: { data: [SLOT], total: 120 }, isLoading: false };
    },
    useCreateSlot: () => ({ mutate: mocks.create, isPending: false }),
    useAssignSlot: () => ({ mutate: vi.fn(), isPending: false }),
    useDeallocateSlot: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  mocks.pageCalls = [];
});

const lastCall = () => mocks.pageCalls[mocks.pageCalls.length - 1];

describe('SlotsTab', () => {
  it('shows "Showing 1 to 50 of 120" and asks for page 2 on Next', () => {
    render(<SlotsTab />);
    expect(screen.getByText('Showing 1 to 50 of 120 entries')).toBeTruthy();
    expect(lastCall()).toMatchObject({ page: 1, limit: 50 });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(lastCall()).toMatchObject({ page: 2, limit: 50 });
  });

  it('searches on the server and goes back to page 1', () => {
    render(<SlotsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Search slots'), { target: { value: 'basement' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(lastCall()).toMatchObject({ search: 'basement', page: 1 });
  });

  it('exports the whole filtered list from the API', async () => {
    mocks.download.mockResolvedValue(new Blob(['x']));
    render(<SlotsTab />);
    fireEvent.change(screen.getByLabelText('Slot type'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));

    await waitFor(() => expect(mocks.download).toHaveBeenCalled());
    expect(mocks.download).toHaveBeenCalledWith('/parking/slots/export', { params: { slot_type: 'other', format: 'csv' } });
  });

  it('copies and prints Slot # · Type · Location · Status · Unit · Member, all filled', () => {
    expect(SLOT_TEXT_COLUMNS.map((column) => column.header)).toEqual(['Slot #', 'Type', 'Location', 'Status', 'Unit', 'Member']);
    expect(SLOT_TEXT_COLUMNS.map((column) => column.text(SLOT))).toEqual(['S-001', 'Other', 'Podium', 'Assigned', 'C-303', 'Meera Test']);
  });

  it('Add Slot offers Other and has no Monthly Charge', () => {
    render(<SlotsTab />);
    fireEvent.click(screen.getByRole('button', { name: /Add Slot/ }));

    const type = screen.getByLabelText('Type') as HTMLSelectElement;
    expect(Array.from(type.options).map((option) => option.textContent)).toEqual(['Car', 'Bike', 'EV', 'Other']);
    expect(screen.queryByLabelText('Monthly Charge')).toBeNull();

    fireEvent.change(screen.getByLabelText('Slot Number'), { target: { value: 'X-1' } });
    fireEvent.change(type, { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    const payload = mocks.create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ slot_number: 'X-1', slot_type: 'other' });
    expect(payload).not.toHaveProperty('monthly_charge');
  });
});
